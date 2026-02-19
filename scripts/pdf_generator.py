"""
MindCoder PDF Report Generator — ReportLab implementation
Accepts analysis data as dict, returns PDF bytes.
"""
import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, Color
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak, Flowable
)
from reportlab.graphics.shapes import Drawing, Rect, String, Circle, Line
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Register fonts ──
FONT_DIR = "/usr/share/fonts/truetype/dejavu/"
try:
    pdfmetrics.registerFont(TTFont("DejaVu", FONT_DIR + "DejaVuSans.ttf"))
    pdfmetrics.registerFont(TTFont("DejaVu-Bold", FONT_DIR + "DejaVuSans-Bold.ttf"))
    pdfmetrics.registerFont(TTFont("DejaVu-Italic", FONT_DIR + "DejaVuSans-Oblique.ttf"))
    pdfmetrics.registerFont(TTFont("DejaVu-BoldItalic", FONT_DIR + "DejaVuSans-BoldOblique.ttf"))
    FONT = "DejaVu"
    FONT_B = "DejaVu-Bold"
    FONT_I = "DejaVu-Italic"
    FONT_BI = "DejaVu-BoldItalic"
except:
    FONT = "Helvetica"
    FONT_B = "Helvetica-Bold"
    FONT_I = "Helvetica-Oblique"
    FONT_BI = "Helvetica-BoldOblique"

# ── Brand palette ──
AMBER       = HexColor('#C17A3A')
AMBER_LIGHT = HexColor('#EFE5D8')
BG_CALLOUT  = HexColor('#FDF6ED')
TEXT_DARK   = HexColor('#2C2C2C')
TEXT_MUTED  = HexColor('#6B6B6B')
DIVIDER     = HexColor('#E8E0D5')
BADGE_BG    = HexColor('#EFE5D8')
WHITE       = white
BLUE        = HexColor('#2563EB')
BLUE_LIGHT  = HexColor('#EFF6FF')

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

# ── Theme colors ──
PALETTE = ["#E3C8C0","#FFE2D4","#C9ECCF","#C9ECE6","#D5ECF9","#DDDDF3","#F9D5F8","#F9D5D5"]

def _hex_lighten(hex_str: str, amount: float = 0.4) -> HexColor:
    r, g, b = int(hex_str[1:3],16), int(hex_str[3:5],16), int(hex_str[5:7],16)
    return HexColor('#%02x%02x%02x' % (
        min(255, int(r + (255-r)*amount)),
        min(255, int(g + (255-g)*amount)),
        min(255, int(b + (255-b)*amount)),
    ))


# ══════════════════════════════════════════════════════
#  Styles
# ══════════════════════════════════════════════════════
def _styles():
    s = {}
    s['title'] = ParagraphStyle('title', fontName=FONT_B, fontSize=18, textColor=AMBER,
        alignment=TA_CENTER, spaceAfter=4*mm)
    s['subtitle'] = ParagraphStyle('subtitle', fontName=FONT, fontSize=9, textColor=TEXT_MUTED,
        alignment=TA_CENTER, spaceAfter=6*mm)
    s['h1'] = ParagraphStyle('h1', fontName=FONT_B, fontSize=16, textColor=AMBER,
        spaceBefore=2*mm, spaceAfter=3*mm)
    s['h2'] = ParagraphStyle('h2', fontName=FONT_B, fontSize=12, textColor=AMBER,
        spaceBefore=4*mm, spaceAfter=2*mm)
    s['h3'] = ParagraphStyle('h3', fontName=FONT_B, fontSize=10, textColor=TEXT_DARK,
        spaceBefore=2*mm, spaceAfter=1*mm)
    s['h3_amber'] = ParagraphStyle('h3_amber', fontName=FONT_B, fontSize=10, textColor=AMBER,
        spaceBefore=2*mm, spaceAfter=1*mm)
    s['h3_blue'] = ParagraphStyle('h3_blue', fontName=FONT_B, fontSize=10, textColor=BLUE,
        spaceBefore=2*mm, spaceAfter=1*mm)
    s['body'] = ParagraphStyle('body', fontName=FONT, fontSize=9, textColor=TEXT_DARK,
        leading=13, alignment=TA_JUSTIFY, spaceAfter=2*mm)
    s['body_small'] = ParagraphStyle('body_small', fontName=FONT, fontSize=8, textColor=TEXT_DARK,
        leading=11, spaceAfter=1*mm)
    s['muted'] = ParagraphStyle('muted', fontName=FONT, fontSize=7, textColor=TEXT_MUTED,
        leading=10, spaceAfter=1*mm)
    s['muted_italic'] = ParagraphStyle('muted_italic', fontName=FONT_I, fontSize=7,
        textColor=TEXT_MUTED, leading=10, spaceAfter=1*mm)
    s['quote'] = ParagraphStyle('quote', fontName=FONT_I, fontSize=8, textColor=TEXT_DARK,
        leading=11, leftIndent=8*mm, spaceAfter=1*mm, alignment=TA_JUSTIFY)
    s['quote_source'] = ParagraphStyle('quote_source', fontName=FONT, fontSize=7,
        textColor=TEXT_MUTED, leftIndent=8*mm, spaceAfter=2*mm)
    s['label'] = ParagraphStyle('label', fontName=FONT_B, fontSize=8, textColor=AMBER,
        spaceAfter=1*mm)
    s['footnote'] = ParagraphStyle('footnote', fontName=FONT_I, fontSize=7, textColor=TEXT_MUTED,
        alignment=TA_LEFT, spaceBefore=2*mm)
    s['badge'] = ParagraphStyle('badge', fontName=FONT_B, fontSize=6, textColor=AMBER,
        alignment=TA_CENTER)
    return s

ST = _styles()


# ══════════════════════════════════════════════════════
#  Custom flowables
# ══════════════════════════════════════════════════════
class ProgressBar(Flowable):
    """Visual progress bar."""
    def __init__(self, pct, width=140, height=8):
        super().__init__()
        self.pct = max(0, min(100, pct))
        self.width = width
        self.height = height

    def draw(self):
        self.canv.setFillColor(AMBER_LIGHT)
        self.canv.roundRect(0, 0, self.width, self.height, 2, fill=1, stroke=0)
        if self.pct > 0:
            filled = self.width * (self.pct / 100)
            self.canv.setFillColor(AMBER)
            self.canv.roundRect(0, 0, filled, self.height, 2, fill=1, stroke=0)

    def wrap(self, availWidth, availHeight):
        return self.width, self.height


class QuoteBlock(Flowable):
    """Left-bordered quote block."""
    def __init__(self, text, source=None, max_width=None):
        super().__init__()
        self.text = text
        self.source = source
        self.max_width = max_width or (CONTENT_W - 10*mm)
        self._build()

    def _build(self):
        from reportlab.platypus.paragraph import Paragraph
        w = self.max_width - 6*mm  # account for border + padding
        self.quote_para = Paragraph(f'<i>"{self.text}"</i>', ParagraphStyle(
            'q', fontName=FONT_I, fontSize=8, textColor=TEXT_DARK, leading=11, alignment=TA_JUSTIFY))
        self.qw, self.qh = self.quote_para.wrap(w, 1000)
        self.sh = 0
        if self.source:
            self.source_para = Paragraph(f'— {self.source}', ParagraphStyle(
                'qs', fontName=FONT, fontSize=7, textColor=TEXT_MUTED, leading=9))
            self.sw, self.sh = self.source_para.wrap(w, 1000)
        self._height = self.qh + self.sh + 6

    def wrap(self, availWidth, availHeight):
        return self.max_width, self._height

    def draw(self):
        self.canv.setFillColor(AMBER)
        self.canv.rect(0, 0, 2.5, self._height, fill=1, stroke=0)
        y = self._height - self.qh - 2
        self.quote_para.drawOn(self.canv, 5*mm, y)
        if self.source:
            self.source_para.drawOn(self.canv, 5*mm, y - self.sh - 2)


def _hr():
    return HRFlowable(width="100%", thickness=0.5, color=DIVIDER, spaceAfter=2*mm, spaceBefore=2*mm)


def _badge_text(is_ai: bool) -> str:
    return '<font color="#C17A3A"><b>[AI]</b></font>' if is_ai else '<font color="#2563EB"><b>[Human]</b></font>'


def _san(text) -> str:
    """Sanitize text for ReportLab XML."""
    if not text or not isinstance(text, str):
        return ''
    return (text
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('\u2018', "'").replace('\u2019', "'")
        .replace('\u201C', '"').replace('\u201D', '"')
        .replace('\u2013', '-').replace('\u2014', '-')
        .replace('\u2026', '...')
        .replace('\u27E8', '&lt;').replace('\u27E9', '&gt;')
    )


# ══════════════════════════════════════════════════════
#  Page builders
# ══════════════════════════════════════════════════════

def build_cover(data: dict) -> list:
    """Page 1: Cover with config table + coverage bars."""
    els = []
    els.append(Spacer(1, 8*mm))
    els.append(Paragraph("MindCoder", ST['title']))
    els.append(Paragraph("Analysis Report", ParagraphStyle('t2', fontName=FONT_B, fontSize=14,
        textColor=AMBER, alignment=TA_CENTER, spaceAfter=2*mm)))
    els.append(Paragraph(datetime.now().strftime("%d %b %Y, %I:%M %p"), ST['subtitle']))

    # Config table
    config = data.get('config', {})
    rows = []
    if config.get('model'): rows.append(['Model', config['model']])
    if config.get('researchQuestion'): rows.append(['Research Question', _san(config['researchQuestion'])])
    if config.get('openCodesRange'): rows.append(['Open Codes Range', config['openCodesRange']])
    if config.get('files'): rows.append(['Files', ', '.join(config['files'])])

    if rows:
        header = [Paragraph('<b>Parameter</b>', ParagraphStyle('ch', fontName=FONT_B, fontSize=8, textColor=AMBER)),
                  Paragraph('<b>Setting</b>', ParagraphStyle('ch2', fontName=FONT_B, fontSize=8, textColor=AMBER))]
        body_rows = [[Paragraph(f'<b>{r[0]}</b>', ST['body_small']),
                      Paragraph(_san(str(r[1])), ST['body_small'])] for r in rows]
        t = Table([header] + body_rows, colWidths=[CONTENT_W*0.25, CONTENT_W*0.75])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), BG_CALLOUT),
            ('LINEBELOW', (0,0), (-1,0), 0.5, DIVIDER),
            ('LINEBELOW', (0,-1), (-1,-1), 0.5, DIVIDER),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        els.append(t)
        els.append(Spacer(1, 4*mm))

    # Coverage
    coverage = data.get('coverage', [])
    if coverage:
        els.append(Paragraph('Document Coverage', ST['label']))
        for cov in coverage:
            name = _san(cov.get('name', ''))
            pct = cov.get('percentage', 0)
            row = Table(
                [[Paragraph(name, ST['body_small']), ProgressBar(pct, width=160, height=8),
                  Paragraph(f'{pct}%', ST['body_small'])]],
                colWidths=[CONTENT_W*0.3, 170, CONTENT_W*0.12]
            )
            row.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('TOPPADDING', (0,0), (-1,-1), 2),
                ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ]))
            els.append(row)
        els.append(Paragraph('<i>Coverage above 70% is generally considered sufficient for thematic saturation.</i>',
            ST['muted_italic']))
        els.append(Spacer(1, 4*mm))

    # Disclaimer footnote
    els.append(_hr())
    els.append(Paragraph(
        '<i>AI-assisted analysis. Codes and themes were generated by LLM and reviewed by the researcher. '
        'Treat as reference, not definitive findings.</i>', ST['footnote']))

    return els


def build_executive_summary(data: dict) -> list:
    """Page 2: Executive summary with finding cards."""
    els = [PageBreak()]
    els.append(Paragraph('Executive Summary', ST['h1']))

    # Research question callout
    rq = data.get('config', {}).get('researchQuestion', '')
    if rq:
        callout = Table(
            [[Paragraph(f'<font color="#C17A3A"><b>Research Question</b></font><br/><br/>{_san(rq)}',
                ST['body'])]],
            colWidths=[CONTENT_W]
        )
        callout.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), BG_CALLOUT),
            ('BOX', (0,0), (-1,-1), 0.5, DIVIDER),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ]))
        els.append(callout)
        els.append(Spacer(1, 4*mm))

    # Finding cards
    sections = data.get('findings', [])
    for i, sec in enumerate(sections):
        title = _san(sec.get('title', f'Finding {i+1}'))
        content = _san(sec.get('content', ''))
        # First 2 sentences
        sentences = '. '.join(content.split('. ')[:2])
        if sentences and not sentences.endswith('.'):
            sentences += '.'

        card = Table(
            [[Paragraph(
                f'<font color="#C17A3A"><b>{i+1}. {title}</b></font><br/>'
                f'<font size="8">{sentences}</font>',
                ST['body'])]],
            colWidths=[CONTENT_W]
        )
        card.setStyle(TableStyle([
            ('BOX', (0,0), (-1,-1), 0.5, DIVIDER),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ]))
        els.append(card)
        els.append(Spacer(1, 2*mm))

    return els


def build_findings_detail(data: dict) -> list:
    """Pages 3+: Detailed findings with quote blocks."""
    els = [PageBreak()]
    els.append(Paragraph('Findings', ST['h1']))

    sections = data.get('findings', [])
    for i, sec in enumerate(sections):
        title = _san(sec.get('title', f'Finding {i+1}'))
        raw = sec.get('content', '')

        els.append(Paragraph(f'{i+1}. {title}', ST['h2']))

        # Split description / evidence
        parts = raw.split('\nEvidence:') if '\nEvidence:' in raw else [raw]
        desc = parts[0].strip()
        if desc:
            els.append(Paragraph(_san(desc), ST['body']))

        if len(parts) > 1:
            els.append(Paragraph('<b>Evidence</b>', ST['label']))
            bullets = [b.strip() for b in parts[1].split('\n- ') if b.strip()]
            for b in bullets:
                els.append(QuoteBlock(b))
                els.append(Spacer(1, 1*mm))

        # Subsections
        for sub in sec.get('subsections', []):
            sub_title = _san(sub.get('title', ''))
            sub_content = sub.get('content', '')
            els.append(_hr())
            els.append(Paragraph(sub_title, ST['h3']))

            sub_parts = sub_content.split('\nEvidence:') if '\nEvidence:' in sub_content else [sub_content]
            if sub_parts[0].strip():
                els.append(Paragraph(_san(sub_parts[0].strip()), ST['body_small']))
            if len(sub_parts) > 1:
                sub_bullets = [b.strip() for b in sub_parts[1].split('\n- ') if b.strip()]
                for b in sub_bullets:
                    els.append(QuoteBlock(b))
                    els.append(Spacer(1, 1*mm))

    # Conclusion
    conclusion = data.get('conclusion', '')
    if conclusion:
        els.append(_hr())
        els.append(Paragraph('Conclusion', ST['h2']))
        els.append(Paragraph(_san(conclusion), ST['body']))

    return els


def build_codebook(data: dict) -> list:
    """Codebook: theme map + detailed codebook."""
    themes = data.get('themes', [])
    if not themes:
        return []

    els = [PageBreak()]
    els.append(Paragraph('Codebook', ST['h1']))
    els.append(Paragraph('<i>Hierarchical structure of themes, sub-themes, and open codes.</i>',
        ST['muted_italic']))
    els.append(Spacer(1, 3*mm))

    # ── Theme Map Table ──
    header = [
        Paragraph('<b>OPEN CODES</b>', ParagraphStyle('th', fontName=FONT_B, fontSize=7, textColor=TEXT_MUTED)),
        Paragraph('', ST['muted']),
        Paragraph('<b>SUB-THEMES</b>', ParagraphStyle('th', fontName=FONT_B, fontSize=7, textColor=TEXT_MUTED)),
        Paragraph('', ST['muted']),
        Paragraph('<b>THEMES</b>', ParagraphStyle('th', fontName=FONT_B, fontSize=7, textColor=TEXT_MUTED)),
    ]
    rows = [header]

    for ti, theme in enumerate(themes):
        color = PALETTE[ti % len(PALETTE)]
        subs = theme.get('subthemes', [])

        # Open codes grouped by sub-theme
        oc_parts = []
        for sub in subs:
            oc_parts.append(Paragraph(f'<font size="6" color="#6B6B6B"><b>{_san(sub["name"])}</b></font>',
                ST['muted']))
            for oc in sub.get('openCodes', []):
                badge = _badge_text(oc.get('isAI', True))
                count = oc.get('segmentCount', 0)
                oc_parts.append(Paragraph(
                    f'{badge} <font size="7">{_san(oc["name"])}</font> '
                    f'<font size="6" color="#6B6B6B">({count})</font>',
                    ParagraphStyle('oc', fontName=FONT, fontSize=7, textColor=TEXT_DARK, leading=10, spaceAfter=1)))

        # Sub-themes
        st_parts = []
        for sub in subs:
            badge = _badge_text(sub.get('isAI', True))
            st_parts.append(Paragraph(
                f'{badge} <font size="8"><b>{_san(sub["name"])}</b></font>',
                ParagraphStyle('st', fontName=FONT_B, fontSize=8, textColor=TEXT_DARK, leading=11, spaceAfter=2)))

        # Theme
        badge = _badge_text(theme.get('isAI', True))
        th_parts = [Paragraph(
            f'{badge} <font size="9"><b>{_san(theme["name"])}</b></font>',
            ParagraphStyle('thm', fontName=FONT_B, fontSize=9, textColor=TEXT_DARK, leading=12, spaceAfter=2))]
        if theme.get('definition'):
            th_parts.append(Paragraph(f'<i><font size="7" color="#6B6B6B">{_san(theme["definition"])}</font></i>',
                ST['muted_italic']))

        arrow_style = ParagraphStyle('arrow', fontName=FONT, fontSize=9, textColor=TEXT_MUTED, alignment=TA_CENTER)
        rows.append([
            oc_parts or Paragraph('', ST['muted']),
            Paragraph('→', arrow_style),
            st_parts or Paragraph('', ST['muted']),
            Paragraph('→', arrow_style),
            th_parts,
        ])

    map_table = Table(rows, colWidths=[CONTENT_W*0.38, 12, CONTENT_W*0.24, 12, CONTENT_W*0.24])
    style_cmds = [
        ('BACKGROUND', (0,0), (-1,0), BG_CALLOUT),
        ('LINEBELOW', (0,0), (-1,0), 0.5, DIVIDER),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]
    # Add row separators and sub-theme/theme fills
    for ri in range(1, len(rows)):
        style_cmds.append(('LINEBELOW', (0, ri), (-1, ri), 0.3, DIVIDER))
        color = PALETTE[(ri-1) % len(PALETTE)]
        style_cmds.append(('BACKGROUND', (2, ri), (2, ri), _hex_lighten(color, 0.6)))
        style_cmds.append(('BACKGROUND', (4, ri), (4, ri), _hex_lighten(color, 0.4)))

    map_table.setStyle(TableStyle(style_cmds))
    els.append(map_table)
    els.append(Spacer(1, 6*mm))

    # ── Detailed Codebook ──
    els.append(_hr())
    els.append(Paragraph('Primary Codebook', ST['h2']))

    for ti, theme in enumerate(themes):
        # Theme header bar
        t_header = Table(
            [[Paragraph(f'{_badge_text(theme.get("isAI", True))} '
                f'<font color="white"><b>{_san(theme["name"])}</b></font>',
                ParagraphStyle('th_h', fontName=FONT_B, fontSize=9, textColor=WHITE, leading=12))]],
            colWidths=[CONTENT_W]
        )
        t_header.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), AMBER),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
        ]))
        els.append(Spacer(1, 3*mm) if ti > 0 else Spacer(1, 1*mm))
        els.append(t_header)

        if theme.get('definition'):
            els.append(Paragraph(f'<i>{_san(theme["definition"])}</i>', ST['muted_italic']))

        for sub in theme.get('subthemes', []):
            # Sub-theme row
            st_row = Table(
                [[Paragraph(f'{_badge_text(sub.get("isAI", True))} <b>{_san(sub["name"])}</b>',
                    ParagraphStyle('st_r', fontName=FONT_B, fontSize=8, textColor=TEXT_DARK, leading=11))]],
                colWidths=[CONTENT_W]
            )
            st_row.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), AMBER_LIGHT),
                ('TOPPADDING', (0,0), (-1,-1), 3),
                ('BOTTOMPADDING', (0,0), (-1,-1), 3),
                ('LEFTPADDING', (0,0), (-1,-1), 10),
            ]))
            els.append(st_row)

            if sub.get('definition'):
                els.append(Paragraph(f'<i><font size="7">{_san(sub["definition"])}</font></i>',
                    ParagraphStyle('sd', fontName=FONT_I, fontSize=7, textColor=TEXT_MUTED,
                        leftIndent=10, spaceAfter=1*mm)))

            # Open codes
            for oi, oc in enumerate(sub.get('openCodes', [])):
                bg = WHITE if oi % 2 == 0 else BG_CALLOUT
                segments = oc.get('segments', [])
                parts = [Paragraph(
                    f'{_badge_text(oc.get("isAI", True))} <b>{_san(oc["name"])}</b> '
                    f'<font size="6" color="#6B6B6B">— {len(segments)} segment{"s" if len(segments) != 1 else ""}</font>',
                    ParagraphStyle('oc_h', fontName=FONT, fontSize=7, textColor=TEXT_DARK, leading=10))]

                for seg in segments:
                    parts.append(Paragraph(
                        f'<i><font size="6" color="#6B6B6B">"{_san(seg)}"</font></i>',
                        ParagraphStyle('seg', fontName=FONT_I, fontSize=6, textColor=TEXT_MUTED,
                            leading=8, leftIndent=4*mm, spaceAfter=0.5*mm)))

                oc_table = Table([[parts]], colWidths=[CONTENT_W])
                oc_table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), bg),
                    ('TOPPADDING', (0,0), (-1,-1), 3),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 3),
                    ('LEFTPADDING', (0,0), (-1,-1), 14),
                ]))
                els.append(oc_table)

    return els


def build_process(data: dict) -> list:
    """Final page: Codebook development process."""
    els = [PageBreak()]
    els.append(Paragraph('Codebook Development Process', ST['h1']))

    # Timeline
    els.append(Paragraph(
        '<font color="#C17A3A"><b>Step 1</b></font> Open Codes  →  '
        '<font color="#C17A3A"><b>Step 2</b></font> Sub-themes  →  '
        '<font color="#C17A3A"><b>Step 3</b></font> Themes',
        ParagraphStyle('timeline', fontName=FONT, fontSize=9, textColor=TEXT_DARK,
            alignment=TA_CENTER, spaceAfter=4*mm)))

    steps = data.get('steps', [])
    for step in steps:
        els.append(_hr())
        els.append(Paragraph(step.get('label', ''), ST['h2']))
        stats = step.get('stats', {})
        els.append(Paragraph(
            f'Total: {stats.get("total",0)} | AI: {stats.get("ai",0)} | Human: {stats.get("human",0)}',
            ST['muted']))

        # AI Agent section
        ai = step.get('aiAgent', {})
        if ai.get('description') or ai.get('whatDid') or ai.get('rationale'):
            els.append(Paragraph('AI Agent', ST['h3_amber']))
            if ai.get('description'):
                els.append(Paragraph(_san(ai['description']), ST['body_small']))
            if ai.get('whatDid'):
                els.append(Paragraph('<b>What LLM Did</b>', ST['body_small']))
                els.append(Paragraph(_san(ai['whatDid']),
                    ParagraphStyle('wd', fontName=FONT, fontSize=7, textColor=TEXT_DARK,
                        leading=10, leftIndent=4*mm, spaceAfter=1*mm)))
            if ai.get('rationale'):
                # Dashed border box for self-criticize
                crit_table = Table([[
                    Paragraph(f'<font size="7" color="#6B6B6B"><b>LLM Self-Criticize</b></font><br/>'
                        f'<font size="7" color="#6B6B6B">{_san(ai["rationale"])}</font>',
                        ParagraphStyle('crit', fontName=FONT, fontSize=7, textColor=TEXT_MUTED, leading=10))
                ]], colWidths=[CONTENT_W - 8*mm])
                crit_table.setStyle(TableStyle([
                    ('BOX', (0,0), (-1,-1), 0.5, DIVIDER),
                    ('TOPPADDING', (0,0), (-1,-1), 5),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
                    ('LEFTPADDING', (0,0), (-1,-1), 8),
                    ('RIGHTPADDING', (0,0), (-1,-1), 8),
                ]))
                els.append(Spacer(1, 1*mm))
                els.append(crit_table)
                els.append(Spacer(1, 2*mm))

        # Human Analysis section
        human = step.get('humanAnalysis', {})
        els.append(Paragraph('Human Analysis', ST['h3_blue']))

        history = human.get('promptHistory', [])
        if history:
            els.append(Paragraph('<b>Prompt History</b>', ST['body_small']))
            for entry in history:
                ts = entry.get('timestamp', '')
                prompt = _san(entry.get('prompt', ''))
                els.append(Paragraph(f'<font size="6" color="#6B6B6B"><b>{ts}</b></font>',
                    ST['muted']))
                els.append(Paragraph(prompt,
                    ParagraphStyle('ph', fontName=FONT, fontSize=7, textColor=TEXT_DARK,
                        leading=10, leftIndent=4*mm, spaceAfter=1*mm)))
        else:
            els.append(Paragraph('No prompt history.', ST['muted']))

        memo = human.get('memo', '')
        els.append(Paragraph('<b>User Memo</b>', ST['body_small']))
        els.append(Paragraph(_san(memo) if memo else 'No memo added yet.',
            ParagraphStyle('memo', fontName=FONT, fontSize=7,
                textColor=TEXT_DARK if memo else TEXT_MUTED, leading=10, leftIndent=4*mm, spaceAfter=2*mm)))

    return els


# ══════════════════════════════════════════════════════
#  Main entry point
# ══════════════════════════════════════════════════════

def generate_pdf(data: dict) -> bytes:
    """Generate PDF from data dict, return bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN, topMargin=MARGIN, bottomMargin=MARGIN,
        title="MindCoder Analysis Report")

    elements = []
    elements.extend(build_cover(data))
    elements.extend(build_executive_summary(data))
    elements.extend(build_findings_detail(data))
    elements.extend(build_codebook(data))
    elements.extend(build_process(data))

    doc.build(elements)
    return buf.getvalue()


if __name__ == '__main__':
    # Quick test with minimal data
    test_data = {
        'config': {'model': 'gpt-4o', 'researchQuestion': 'How do teachers use AI tools?'},
        'coverage': [{'name': 'Interview_1', 'percentage': 85}],
        'findings': [{'title': 'AI Integration', 'content': 'Teachers use AI for grading.\nEvidence:\n- Teachers reported using AI tools daily.'}],
        'themes': [{'name': 'AI Usage', 'isAI': True, 'definition': 'How AI is used', 'subthemes': [
            {'name': 'Grading', 'isAI': True, 'openCodes': [
                {'name': 'Auto-grade', 'isAI': True, 'segmentCount': 3, 'segments': ['Quote 1', 'Quote 2']}
            ]}
        ]}],
        'steps': [{'label': 'Step 1: Open Codes', 'stats': {'total': 10, 'ai': 8, 'human': 2},
            'aiAgent': {'description': 'Generated 10 codes', 'whatDid': 'Grouped excerpts', 'rationale': 'Most confident about X'},
            'humanAnalysis': {'promptHistory': [], 'memo': ''}}],
    }
    pdf_bytes = generate_pdf(test_data)
    with open('/tmp/mindcoder_test.pdf', 'wb') as f:
        f.write(pdf_bytes)
    print(f"Generated {len(pdf_bytes)} bytes → /tmp/mindcoder_test.pdf")
