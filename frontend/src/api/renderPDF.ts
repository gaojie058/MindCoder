import pdfMake from "pdfmake/build/pdfmake";
import { Content, TDocumentDefinitions } from "pdfmake/interfaces"
import { concept } from "@/types/stores"
import { logoBase64 } from "./pdfutils"
import useAppStore from "@/stores/useAppStore"
import useCardStore from "@/stores/useCardStore"
import useCodeStore from "@/stores/useCodeStore"
import useConceptStore from "@/stores/useConceptStore"
import useLLMHistoryStore from "@/stores/useLLMHistoryStore"
import { calculateFileCoverageFromCardData } from "./coverageCalculator"
import useEditStore from "@/stores/useEditStore"
import useInfoStore from "@/stores/useInfoStore"

// https://github.com/bpampuch/pdfmake/issues/2654
(<any>pdfMake).fonts = {
  Roboto: {
    normal: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf",
    bold: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf",
    italics: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Italic.ttf",
    bolditalics: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-MediumItalic.ttf",
  },
}

// ── Brand palette (redesign v2) ──
const B = {
  amber:      '#C17A3A',
  amberLight: '#EFE5D8',
  bgCallout:  '#FDF6ED',
  text:       '#2C2C2C',
  muted:      '#6B6B6B',
  divider:    '#E8E0D5',
  badge:      '#EFE5D8',
  white:      '#FFFFFF',
};

// ── Text sanitiser ──
function san(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[\u2018\u2019\u201A\uFFFD\u02BC\u02BB]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2022\u2023\u25E6\u2043]/g, '-')
    .replace(/[\u2003\u2002\u2009]/g, ' ')
    .replace(/[\u00AB\u00BB]/g, '"')
    .replace(/[\u2039\u203A]/g, "'")
    .replace(/\u00B7/g, '-')
    .replace(/[\u2192\u2794\u279C\u27A1]/g, '->')
    .replace(/[\u27E8\u2329\u3008]/g, '<')
    .replace(/[\u27E9\u232A\u3009]/g, '>')
    .replace(/[\u200B-\u200F\u2028\u2029\uFEFF]/g, '')
    .replace(/[\u2500-\u27BF]/g, '')
    .replace(/[\uFE00-\uFE0F]/g, '')
    .replace(/\u3010/g, '[').replace(/\u3011/g, ']')        // 【→[ 】→]
    .replace(/\u300C/g, '[').replace(/\u300D/g, ']')      // 「→[ 」→]
    .replace(/\u300E/g, '[').replace(/\u300F/g, ']')      // 『→[ 』→]
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))  // fullwidth → ASCII
    .replace(/[^\x20-\x7E\n\r\t]/g, '');  // strip any remaining non-ASCII
}

// Bold text inside [brackets], clean {group} tags
function richText(raw: string): any[] {
  if (!raw) return [{ text: '' }];
  const text = san(raw);
  const regex = /\[(.*?)(?:\s*\{.*?\})?\]/g;
  const result: any[] = [];
  let last = 0, match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) result.push({ text: text.substring(last, match.index) });
    result.push({ text: match[1].trim(), bold: true });
    last = regex.lastIndex;
  }
  if (last < text.length) result.push({ text: text.substring(last) });
  return result.length ? result : [{ text }];
}

// Clean title (strip brackets/braces)
function cleanTitle(t: string): string {
  if (!t) return 'Untitled';
  return san(t).replace(/\{[^}]*\}/g, '').replace(/\[|\]/g, '').trim();
}

// Horizontal rule
function hr(): any {
  return { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: B.divider }], margin: [0, 4, 0, 4] };
}

// Format timestamp
function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDate(d: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const h = d.getHours(), m = d.getMinutes(), ap = h >= 12 ? 'PM' : 'AM';
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${h % 12 || 12}:${m < 10 ? '0' + m : m}${ap}`;
}

// ── Badges ──
function aiBadge(): any { return { text: ' AI ', fontSize: 7, bold: true, color: B.amber, background: B.amberLight }; }
function humanBadge(): any { return { text: ' Human ', fontSize: 7, bold: true, color: '#2563EB', background: '#EFF6FF' }; }
function _theoryBadge(name: string): any {
  return {
    table: { body: [[{ text: san(name).toUpperCase(), fontSize: 6, bold: true, color: B.amber, margin: [4, 2, 4, 2] }]] },
    layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => B.amberLight, vLineColor: () => B.amberLight,
      fillColor: () => B.badge, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
    margin: [0, 2, 4, 2],
  };
}
function _codeBadge(name: string): any {
  return { text: ` ${san(name)} `, fontSize: 7, color: B.amber, background: B.amberLight, italics: false };
}

// Quote block with left amber border
function quoteBlock(quote: string, source?: string): any {
  return {
    table: {
      widths: [3, '*'],
      body: [[
        { text: '', fillColor: B.amber },
        {
          stack: [
            { text: san(quote), fontSize: 8, italics: true, color: B.text, margin: [6, 4, 4, 2] },
            ...(source ? [{ text: `— ${san(source)}`, fontSize: 7, color: B.muted, margin: [6, 0, 4, 4] }] : []),
          ]
        }
      ]]
    },
    layout: { hLineWidth: () => 0, vLineWidth: (i: number) => i === 0 ? 0 : 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
    margin: [10, 3, 0, 3],
  };
}

// Progress bar (simple table-based)
function progressBar(pct: number, width: number = 200): any {
  const filled = Math.max(1, Math.round(width * (pct / 100)));
  const empty = width - filled;
  return {
    table: {
      widths: [filled, empty > 0 ? empty : 0],
      heights: [8],
      body: [[
        { text: '', fillColor: B.amber },
        ...(empty > 0 ? [{ text: '', fillColor: B.amberLight }] : []),
      ]]
    },
    layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
  };
}

// ── Step statistics ──
function stepStats(data: any[], isCard = false) {
  if (!data?.length) return { total: 0, ai: 0, human: 0 };
  let ai = 0, human = 0;
  data.forEach(d => { if (isCard ? d.isGPT : d.isGPT !== false) ai++; else human++; });
  return { total: data.length, ai, human };
}

// ══════════════════════════════════════════════════════════════
//  PAGE 1 — Cover
// ══════════════════════════════════════════════════════════════
function buildCoverPage(): Content[] {
  const { researchQuestion, numberOfTopicClusters, uploadedFiles, fileCoverageData } = useAppStore.getState();
  const { model } = useInfoStore.getState();
  const result: Content[] = [];

  // Logo + title
  result.push({ image: logoBase64, width: 90, alignment: 'center' });
  result.push({ text: 'MindCoder Analysis Report', fontSize: 18, bold: true, color: B.amber, alignment: 'center', margin: [0, 10, 0, 4] });
  result.push({ text: fmtDate(new Date()), fontSize: 9, color: B.muted, alignment: 'center', margin: [0, 0, 0, 12] });

  // Configuration summary table
  const configRows: any[][] = [
    [{ text: 'Parameter', fontSize: 8, bold: true, color: B.amber }, { text: 'Setting', fontSize: 8, bold: true, color: B.amber }]
  ];
  if (model) configRows.push([{ text: 'Model', fontSize: 8, bold: true }, { text: model, fontSize: 8 }]);
  if (researchQuestion?.trim()) configRows.push([{ text: 'Research Question', fontSize: 8, bold: true }, { text: san(researchQuestion.trim()), fontSize: 8 }]);
  if (numberOfTopicClusters?.length === 2) configRows.push([{ text: 'Open Codes Range', fontSize: 8, bold: true }, { text: `${numberOfTopicClusters[0]}–${numberOfTopicClusters[1]} per file`, fontSize: 8 }]);
  if (uploadedFiles?.length) configRows.push([{ text: 'Files', fontSize: 8, bold: true }, { text: uploadedFiles.map(f => f.name.replace(/\.txt$/i, '')).join(', '), fontSize: 8 }]);

  if (configRows.length > 1) {
    result.push({
      table: { widths: ['25%', '*'], body: configRows },
      layout: { hLineWidth: (i: number, node: any) => i === 0 || i === 1 || i === node.table.body.length ? 0.5 : 0, vLineWidth: () => 0, hLineColor: () => B.divider, paddingLeft: () => 6, paddingRight: () => 6, paddingTop: () => 4, paddingBottom: () => 4, fillColor: (row: number) => row === 0 ? B.bgCallout : null },
      margin: [0, 0, 0, 10],
    });
  }

  // Document coverage with progress bars
  if (uploadedFiles?.length && fileCoverageData) {
    result.push({ text: 'Document Coverage', fontSize: 10, bold: true, color: B.amber, margin: [0, 6, 0, 4] });
    uploadedFiles.forEach(f => {
      const cov = fileCoverageData[f.name];
      const pct = cov?.coveragePercentage ?? 0;
      const name = f.name.replace(/\.txt$/i, '');
      result.push({
        columns: [
          { text: san(name), fontSize: 8, width: 120 },
          { stack: [progressBar(pct, 180)], width: 190 },
          { text: `${pct}%`, fontSize: 8, color: B.muted, width: 40, alignment: 'right' },
        ],
        margin: [0, 2, 0, 2],
      });
    });
    result.push({ text: 'Coverage above 70% is generally considered sufficient for thematic saturation.', fontSize: 7, color: B.muted, italics: true, margin: [0, 2, 0, 8] });
  }

  // Disclaimer as footnote
  result.push(hr());
  result.push({ text: 'AI-assisted analysis. Codes and themes were generated by LLM and reviewed by the researcher. Treat as reference, not definitive findings.', fontSize: 7, color: B.muted, italics: true, margin: [0, 2, 0, 0] });

  return result;
}

// ══════════════════════════════════════════════════════════════
//  PAGE 2 — Executive Summary
// ══════════════════════════════════════════════════════════════
function buildExecutiveSummary(report: any): Content[] {
  const { researchQuestion } = useAppStore.getState();
  const result: Content[] = [];
  result.push({ text: '', pageBreak: 'before' });

  result.push({ text: 'Executive Summary', fontSize: 16, bold: true, color: B.amber, margin: [0, 0, 0, 8] });

  // Research question callout
  if (researchQuestion?.trim()) {
    result.push({
      table: { widths: ['*'], body: [[{
        stack: [
          { text: 'Research Question', fontSize: 8, bold: true, color: B.amber, margin: [0, 0, 0, 3] },
          { text: san(researchQuestion.trim()), fontSize: 10, color: B.text },
        ],
        margin: [10, 8, 10, 8],
        fillColor: B.bgCallout,
      }]] },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => B.divider, vLineColor: () => B.divider, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
      margin: [0, 0, 0, 10],
    });
  }

  // Extract sections as finding cards
  let sections: any[] = [];
  if (report?.Sections?.length) sections = report.Sections;
  else if (report?.sections?.length) sections = report.sections;
  else if (report?.Report?.Sections?.length) sections = report.Report.Sections;

  sections.forEach((sec: any, i: number) => {
    const title = cleanTitle(sec.Title || sec.title || `Finding ${i + 1}`);
    const content = san(typeof (sec.Content || sec.content) === 'string' ? (sec.Content || sec.content) : '');
    // Take first 2 sentences as summary
    const sentences = content.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');

    result.push({
      table: { widths: ['*'], body: [[{
        stack: [
          { text: `${i + 1}. ${title}`, fontSize: 10, bold: true, color: B.amber, margin: [0, 0, 0, 3] },
          { text: sentences, fontSize: 8, color: B.text },
        ],
        margin: [10, 6, 10, 6],
      }]] },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => B.divider, vLineColor: () => B.divider, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
      margin: [0, 0, 0, 6],
    });
  });

  return result;
}

// ══════════════════════════════════════════════════════════════
//  PAGE 3+ — Findings Detail
// ══════════════════════════════════════════════════════════════
function buildFindingsDetail(report: any): Content[] {
  const result: Content[] = [];
  result.push({ text: '', pageBreak: 'before' });
  result.push({ text: 'Findings', fontSize: 16, bold: true, color: B.amber, margin: [0, 0, 0, 8] });

  let sections: any[] = [];
  if (report?.Sections?.length) sections = report.Sections;
  else if (report?.sections?.length) sections = report.sections;
  else if (report?.Report?.Sections?.length) sections = report.Report.Sections;

  sections.forEach((sec: any, i: number) => {
    const title = cleanTitle(sec.Title || sec.title || `Finding ${i + 1}`);
    const rawContent = typeof (sec.Content || sec.content) === 'string' ? (sec.Content || sec.content) : '';

    result.push({ text: `${i + 1}. ${title}`, fontSize: 12, bold: true, color: B.amber, margin: [0, 10, 0, 4] });

    // Split into description + evidence
    const parts = rawContent.split(/\nEvidence:\s*/i);
    if (parts[0]?.trim()) {
      result.push({ text: richText(parts[0].trim()), fontSize: 9, color: B.text, margin: [0, 0, 0, 4], alignment: 'justify' });
    }
    if (parts[1]) {
      result.push({ text: 'Evidence', fontSize: 8, bold: true, color: B.amber, margin: [0, 4, 0, 2] });
      const bullets = parts[1].split(/\n-\s*/).filter((s: string) => s.trim());
      bullets.forEach((b: string) => {
        result.push(quoteBlock(b.trim()));
      });
    }

    // Subsections
    const subsections = sec.Subsections || [];
    subsections.forEach((sub: any) => {
      const subTitle = cleanTitle(sub.Title || sub.title || '');
      const subContent = typeof (sub.Content || sub.content) === 'string' ? (sub.Content || sub.content) : '';

      result.push(hr());
      result.push({ text: subTitle, fontSize: 10, bold: true, color: B.text, margin: [8, 4, 0, 3] });

      const subParts = subContent.split(/\nEvidence:\s*/i);
      if (subParts[0]?.trim()) {
        result.push({ text: richText(subParts[0].trim()), fontSize: 8, color: B.text, margin: [8, 0, 0, 3], alignment: 'justify' });
      }
      if (subParts[1]) {
        const subBullets = subParts[1].split(/\n-\s*/).filter((s: string) => s.trim());
        subBullets.forEach((b: string) => result.push(quoteBlock(b.trim())));
      }
    });
  });

  // Conclusion
  const conclusion = report?.Conclusion || report?.conclusion;
  if (typeof conclusion === 'string' && conclusion.trim()) {
    result.push(hr());
    result.push({ text: 'Conclusion', fontSize: 12, bold: true, color: B.amber, margin: [0, 8, 0, 4] });
    result.push({ text: richText(conclusion), fontSize: 9, color: B.text, alignment: 'justify' });
  }

  return result;
}

// ══════════════════════════════════════════════════════════════
//  Codebook — Theme Map table
// ══════════════════════════════════════════════════════════════
const PALETTE = ["#E3C8C0","#FFE2D4","#C9ECCF","#C9ECE6","#D5ECF9","#DDDDF3","#F9D5F8","#F9D5D5"];
function lighten(hex: string, a = 0.3) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `#${Math.round(r+(255-r)*a).toString(16).padStart(2,'0')}${Math.round(g+(255-g)*a).toString(16).padStart(2,'0')}${Math.round(b+(255-b)*a).toString(16).padStart(2,'0')}`;
}

function buildCodebook(): Content[] {
  const { conceptData } = useConceptStore.getState();
  if (!conceptData?.length) return [];
  const result: Content[] = [];
  result.push({ text: '', pageBreak: 'before' });
  result.push({ text: 'Codebook', fontSize: 16, bold: true, color: B.amber, margin: [0, 0, 0, 6] });
  result.push({ text: 'Hierarchical structure of themes, sub-themes, and open codes.', fontSize: 8, color: B.muted, italics: true, margin: [0, 0, 0, 8] });

  // Theme Map table: 3 columns
  const tBody: any[][] = [[
    { text: 'OPEN CODES', fontSize: 7, bold: true, color: B.muted, fillColor: B.bgCallout, margin: [4,3,4,3] },
    { text: '', fillColor: B.bgCallout, margin: [0,0,0,0] },
    { text: 'SUB-THEMES', fontSize: 7, bold: true, color: B.muted, fillColor: B.bgCallout, margin: [4,3,4,3] },
    { text: '', fillColor: B.bgCallout, margin: [0,0,0,0] },
    { text: 'THEMES', fontSize: 7, bold: true, color: B.muted, fillColor: B.bgCallout, margin: [4,3,4,3] },
  ]];

  conceptData.forEach((concept, ci) => {
    const color = PALETTE[ci % PALETTE.length];
    const codes = Object.values(concept.codes).flat();

    // Open codes grouped by sub-theme
    const ocStack: any[] = [];
    codes.forEach(code => {
      const cards = Object.values(code.data || {}).flat();
      if (!cards.length) return;
      ocStack.push({ text: san(code.name), fontSize: 6, bold: true, color: B.muted, margin: [0, ocStack.length ? 3 : 0, 0, 1] });
      cards.forEach(card => {
        ocStack.push({ text: [
          card.isGPT !== false ? aiBadge() : humanBadge(),
          { text: ` ${san(card.name)}`, fontSize: 7 },
          { text: ` (${(card.topics||[]).length})`, fontSize: 6, color: B.muted },
        ], margin: [3, 1, 0, 1] });
      });
    });

    const stStack = codes.map(code => ({
      text: [
        code.isGPT !== false ? aiBadge() : humanBadge(),
        { text: ` ${san(code.name)}`, fontSize: 8, bold: true },
      ],
      margin: [0, 2, 0, 2],
    }));

    const thStack = [
      { text: [
        concept.isGPT !== false ? aiBadge() : humanBadge(),
        { text: ` ${san(concept.name)}`, fontSize: 9, bold: true },
      ], margin: [0, 0, 0, 2] },
      ...(concept.definition ? [{ text: san(concept.definition), fontSize: 7, color: B.muted, italics: true }] : []),
    ];

    tBody.push([
      { stack: ocStack, margin: [4,4,4,4] },
      { text: '→', fontSize: 9, color: B.divider, alignment: 'center', margin: [0,4,0,0] },
      { stack: stStack, margin: [4,4,4,4], fillColor: lighten(color, 0.6) },
      { text: '→', fontSize: 9, color: B.divider, alignment: 'center', margin: [0,4,0,0] },
      { stack: thStack, margin: [4,4,4,4], fillColor: lighten(color, 0.4) },
    ]);
  });

  result.push({
    table: { headerRows: 1, widths: ['*', 12, '*', 12, '*'], body: tBody },
    layout: { hLineWidth: (i: number) => i <= 1 ? 0.5 : 0.3, vLineWidth: () => 0, hLineColor: () => B.divider, paddingLeft: () => 1, paddingRight: () => 1 },
    margin: [0, 0, 0, 10],
  });

  // Detailed codebook: full theme → sub-theme → open codes with data segments
  result.push(hr());
  result.push({ text: 'Primary Codebook', fontSize: 12, bold: true, color: B.amber, margin: [0, 6, 0, 6] });

  conceptData.forEach((concept, ci) => {
    const _color = PALETTE[ci % PALETTE.length];
    // Theme header
    result.push({
      table: { widths: ['*'], body: [[{
        text: [concept.isGPT !== false ? { text: '[AI] ', fontSize: 7, bold: true, color: B.white } : { text: '[Human] ', fontSize: 7, bold: true, color: B.white }, { text: san(concept.name), fontSize: 9, bold: true }],
        fillColor: B.amber, color: B.white, margin: [8, 5, 8, 5],
      }]] },
      layout: 'noBorders',
      margin: [0, ci > 0 ? 10 : 4, 0, 2],
    });

    if (concept.definition) {
      result.push({ text: san(concept.definition), fontSize: 7, italics: true, color: B.muted, margin: [8, 2, 8, 4] });
    }

    const codes = Object.values(concept.codes).flat();
    codes.forEach(code => {
      // Sub-theme
      result.push({
        table: { widths: ['*'], body: [[{
          text: [code.isGPT !== false ? { text: '[AI] ', fontSize: 6, bold: true, color: B.amber } : { text: '[Human] ', fontSize: 6, bold: true, color: '#2563EB' }, { text: san(code.name), fontSize: 8, bold: true }],
          fillColor: B.amberLight, margin: [10, 3, 8, 3],
        }]] },
        layout: 'noBorders',
        margin: [0, 2, 0, 1],
      });

      if (code.definition) {
        result.push({ text: san(code.definition), fontSize: 7, italics: true, color: B.muted, margin: [12, 1, 8, 3] });
      }

      // Open codes
      const cards = Object.values(code.data || {}).flat();
      cards.forEach((card, idx) => {
        if (card.active === false) return;
        const bg = idx % 2 === 0 ? B.white : B.bgCallout;
        const segments = card.topics || [];
        result.push({
          table: { widths: ['*'], body: [[{
            stack: [
              { text: [
                card.isGPT ? { text: '[AI] ', fontSize: 6, color: B.amber, bold: true } : { text: '[Human] ', fontSize: 6, color: '#2563EB', bold: true },
                { text: san(card.name), fontSize: 7, bold: true },
                { text: ` — ${segments.length} segment${segments.length !== 1 ? 's' : ''}`, fontSize: 6, color: B.muted },
              ], margin: [0, 0, 0, 2] },
              ...segments.map((t: any) => ({
                text: `"${san(t.content)}"`, fontSize: 6, italics: true, color: B.muted, margin: [4, 0, 0, 1],
              })),
            ],
            fillColor: bg, margin: [14, 3, 8, 3],
          }]] },
          layout: 'noBorders',
        });
      });
    });
  });

  return result;
}

// ══════════════════════════════════════════════════════════════
//  Document Coverage (async file reading)
// ══════════════════════════════════════════════════════════════
async function ensureCoverage() {
  const { uploadedFiles, fileCoverageData, setFileCoverageData } = useAppStore.getState();
  const { cardData, fileCardMap } = useCardStore.getState();
  for (const file of uploadedFiles) {
    try {
      const content = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve((e.target?.result as string) || '');
        reader.readAsText(file);
      });
      const cov = calculateFileCoverageFromCardData(content, file.name, cardData, fileCardMap);
      setFileCoverageData(file.name, cov);
    } catch {}
  }
}

// ══════════════════════════════════════════════════════════════
//  Final Page — Codebook Development Process
// ══════════════════════════════════════════════════════════════
function buildProcessPage(): Content[] {
  const result: Content[] = [];
  result.push({ text: '', pageBreak: 'before' });
  result.push({ text: 'Codebook Development Process', fontSize: 16, bold: true, color: B.amber, margin: [0, 0, 0, 6] });

  // Timeline
  result.push({
    text: [
      { text: 'Step 1 ', bold: true, color: B.amber, fontSize: 9 },
      { text: 'Open Codes', bold: true, fontSize: 9 },
      { text: '  →  ', color: B.divider, fontSize: 9 },
      { text: 'Step 2 ', bold: true, color: B.amber, fontSize: 9 },
      { text: 'Sub-themes', bold: true, fontSize: 9 },
      { text: '  →  ', color: B.divider, fontSize: 9 },
      { text: 'Step 3 ', bold: true, color: B.amber, fontSize: 9 },
      { text: 'Themes', bold: true, fontSize: 9 },
    ],
    alignment: 'center', margin: [0, 0, 0, 10],
  });

  // Build each step
  const steps = [
    { label: 'Step 1: Open Codes', store: useCardStore, storeKey: 'cardData', isCard: true, memoKey: 'topicMemo', historyStep: 'card' },
    { label: 'Step 2: Sub-themes', store: useCodeStore, storeKey: 'codeData', isCard: false, memoKey: 'codeMemo', historyStep: 'code' },
    { label: 'Step 3: Themes', store: useConceptStore, storeKey: 'conceptData', isCard: false, memoKey: 'conceptMemo', historyStep: 'concept' },
  ];

  const { llmHistory = [] } = useLLMHistoryStore.getState();
  const editState = useEditStore.getState();

  steps.forEach(step => {
    const storeState = step.store.getState() as any;
    const data = storeState[step.storeKey] || [];
    const stats = stepStats(data, step.isCard);
    const llmDesc = storeState.llmDescription || '';
    const whatDid = storeState.whatLLMDid || '';
    const rationale = storeState.rationale || '';
    const memo = (editState as any)[step.memoKey] || '';
    const history = llmHistory.filter((e: any) => e.step === step.historyStep);

    result.push(hr());
    result.push({ text: step.label, fontSize: 11, bold: true, color: B.amber, margin: [0, 6, 0, 2] });
    result.push({ text: `Total: ${stats.total} | AI: ${stats.ai} | Human: ${stats.human}`, fontSize: 7, color: B.muted, margin: [0, 0, 0, 6] });

    // AI Agent section
    if (llmDesc || whatDid || rationale) {
      result.push({ text: 'AI Agent', fontSize: 9, bold: true, color: B.amber, margin: [0, 4, 0, 3] });

      if (llmDesc) result.push({ text: san(llmDesc), fontSize: 8, color: B.text, margin: [4, 0, 0, 3] });

      if (whatDid) {
        result.push({ text: 'What LLM Did', fontSize: 8, bold: true, color: B.text, margin: [4, 2, 0, 1] });
        result.push({ text: san(whatDid), fontSize: 7, color: B.text, margin: [8, 0, 0, 3] });
      }

      if (rationale) {
        // LLM Self-Criticize — dashed border distinct style
        result.push({
          table: { widths: ['*'], body: [[{
            stack: [
              { text: 'LLM Self-Criticize', fontSize: 7, bold: true, color: B.muted, margin: [0, 0, 0, 2] },
              { text: san(rationale), fontSize: 7, color: B.muted },
            ],
            margin: [8, 5, 8, 5],
          }]] },
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => B.divider, vLineColor: () => B.divider, hLineStyle: () => ({ dash: { length: 3, space: 2 } }), vLineStyle: () => ({ dash: { length: 3, space: 2 } }),
            paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
          margin: [4, 2, 0, 4],
        });
      }
    }

    // Human Analysis section
    result.push({ text: 'Human Analysis', fontSize: 9, bold: true, color: '#2563EB', margin: [0, 4, 0, 3] });

    // Prompt history
    if (history.length > 0) {
      result.push({ text: 'Prompt History', fontSize: 8, bold: true, color: B.text, margin: [4, 2, 0, 2] });
      history.forEach((entry: any) => {
        result.push({ text: fmtTime(entry.timestamp), fontSize: 6, bold: true, color: B.muted, margin: [8, 1, 0, 0] });
        result.push({ text: san(entry.userPrompt || ''), fontSize: 7, color: B.text, margin: [8, 0, 0, 3] });
      });
    } else {
      result.push({ text: 'No prompt history.', fontSize: 7, color: B.muted, margin: [4, 0, 0, 3] });
    }

    // User memo
    result.push({ text: 'User Memo', fontSize: 8, bold: true, color: B.text, margin: [4, 3, 0, 1] });
    result.push({ text: san(memo?.trim() || 'No memo added yet.'), fontSize: 7, color: memo?.trim() ? B.text : B.muted, margin: [8, 0, 0, 4] });
  });

  return result;
}

// ══════════════════════════════════════════════════════════════
//  Main export — assemble all pages
// ══════════════════════════════════════════════════════════════
export default async function renderPDF(report: any, _conceptArr: concept[]) {
  // Ensure coverage data is ready
  await ensureCoverage();

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    compress: true,
    pageMargins: [50, 45, 50, 45],

    defaultStyle: {
      font: 'Roboto',
      fontSize: 9,
      color: B.text,
      lineHeight: 1.3,
    },

    content: [
      ...buildCoverPage(),
      ...buildExecutiveSummary(report),
      ...buildFindingsDetail(report),
      ...buildCodebook(),
      ...buildProcessPage(),
    ],
  };

  return docDefinition;
}
