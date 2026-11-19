export type SidebarItem = { text: string; label?: string };

const reflectionLabel = /(?:^|\s)(?:\d+[.)]\s*)?(Most confident|Less confident|Focus on human review)\s*[:：]\s*/gi;
const listMarker = /^(?:[-*•▸]\s+|\d+[.)]\s+)/;

/** Split statements without breaking names, parenthetical explanations, or decimals. */
export function splitSidebarStatements(value: string): string[] {
  const items: string[] = [];
  let start = 0;
  const closers: string[] = [];
  const pairs: Record<string, string> = { '[': ']', '【': '】', '(': ')', '（': '）' };
  const push = (end: number) => {
    const item = value.slice(start, end).trim().replace(listMarker, '').trim();
    if (item) items.push(item);
    start = end;
  };

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (pairs[char]) closers.push(pairs[char]);
    else if (char === closers[closers.length - 1]) closers.pop();
    if (closers.length) continue;

    const rest = value.slice(i + 1);
    if (char === '\n' || char === '\r') {
      push(i);
      start = i + 1;
    } else if ((char === ';' || char === '；') && rest.trim()) {
      push(i + 1);
    } else if (/[。！？!?]/.test(char) ||
      (char === '.' && /^(?:\s+[A-Z\d\u4e00-\u9fff]|$)/.test(rest) &&
        !/(?:\b(?:e\.g|i\.e|etc|vs|Mr|Mrs|Dr|Fig|No)|\b[A-Z])\.$/.test(value.slice(start, i + 1)) &&
        !/^\s*\d+\.$/.test(value.slice(start, i + 1)))) {
      push(i + 1);
    } else if (/\s/.test(char) && /^\d+[.)]\s/.test(rest) && value.slice(start, i).trim()) {
      push(i);
      start = i + 1;
    }
  }
  push(value.length);
  return items;
}

export function parseSidebarReflection(value: string): SidebarItem[] {
  const labels = [...value.matchAll(reflectionLabel)];
  if (!labels.length) return splitSidebarStatements(value).map(text => ({ text }));
  const items: SidebarItem[] = splitSidebarStatements(value.slice(0, labels[0].index)).map(text => ({ text }));
  labels.forEach((match, index) => {
    const body = value.slice(match.index! + match[0].length, labels[index + 1]?.index ?? value.length);
    const statements = splitSidebarStatements(body);
    if (!statements.length) items.push({ label: match[1], text: '' });
    else statements.forEach(text => items.push({ label: match[1], text }));
  });
  return items;
}

export function parseSidebarSummary(description = '', whatWasDone = '') {
  const summary = splitSidebarStatements(description).map(text => ({ text }));
  const examples: SidebarItem[] = [];
  // Keep reference-bearing statements together so their grouping relationships survive.
  for (const text of splitSidebarStatements(whatWasDone)) {
    const isExample = /^(?:examples?|e\.g\.)\s*[:：]/i.test(text) ||
      /(?:\b(?:open[ -]?codes?|sub[ -]?themes?|themes?|codes?)\s*[【[])/i.test(text);
    (isExample ? examples : summary).push({ text });
  }
  return { summary, examples };
}
