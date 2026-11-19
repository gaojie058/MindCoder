import { Fragment, memo, type ReactNode } from "react";
import { parseSidebarReflection, parseSidebarSummary, type SidebarItem } from "@/utils/agentSidebarItems";

type Tone = "indigo" | "amber" | "emerald";
const tones = {
  indigo: { header: "bg-indigo-50/70", number: "bg-indigo-50 text-indigo-600", label: "text-indigo-700" },
  amber: { header: "bg-amber-50/70", number: "bg-amber-50 text-amber-700", label: "text-amber-800" },
  emerald: { header: "bg-emerald-50/70", number: "bg-emerald-50 text-emerald-700", label: "text-emerald-800" },
};

function ReferenceText({ text }: { text: string }) {
  const pattern = /\b(Open[ -]?Codes?|Sub[ -]?Themes?|Themes?|Codes?)\s*([【[])([^\]】]+)[\]】]/gi;
  const parts: ReactNode[] = [];
  let start = 0;
  for (const match of text.matchAll(pattern)) {
    parts.push(text.slice(start, match.index));
    parts.push(<mark key={match.index} className="rounded bg-amber-50 px-0.5 font-medium text-gray-800 [box-decoration-break:clone]">{match[0]}</mark>);
    start = match.index! + match[0].length;
  }
  parts.push(text.slice(start));
  return <>{parts.map((part, index) => <Fragment key={index}>{part}</Fragment>)}</>;
}

export function SidebarItemList({ items, tone = "indigo" }: { items: SidebarItem[]; tone?: Tone }) {
  return <ol className="space-y-2" aria-label="Items">
    {items.map((item, index) => {
      const itemTone = item.label?.toLowerCase() === "less confident" ? "amber"
        : item.label?.toLowerCase() === "focus on human review" ? "indigo" : tone;
      return <li key={index} className="flex min-w-0 items-start gap-2 rounded-lg border border-gray-200/80 bg-white px-2.5 py-2.5">
        <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold ${tones[itemTone].number}`}>{index + 1}</span>
        <div className="min-w-0 flex-1 text-xs leading-5 text-gray-600 [overflow-wrap:anywhere] whitespace-pre-wrap">
          {item.label && <div className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${tones[itemTone].label}`}>{item.label}</div>}
          <ReferenceText text={item.text} />
        </div>
      </li>;
    })}
  </ol>;
}

export function SidebarSection({ title, icon, count, tone = "indigo", defaultOpen = false, ai = false, children }: {
  title: string; icon: string; count: number; tone?: Tone; defaultOpen?: boolean; ai?: boolean; children: ReactNode;
}) {
  return <details open={defaultOpen || undefined} className="group mb-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
    <summary className={`flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden ${tones[tone].header}`}>
      <span aria-hidden="true" className="text-sm">{icon}</span>
      <span className="min-w-0 flex-1 text-xs font-semibold text-gray-700">{title}</span>
      {ai && <span className="text-[10px] font-medium text-indigo-500">AI</span>}
      <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-gray-500" aria-label={`${count} items`}>{count}</span>
      <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </summary>
    <div className="bg-gray-50/50 p-2">{children}</div>
  </details>;
}

const AgentSidebarSummary = memo(({ whatLLMDid = "", rationale = "", llmDescription = "" }: {
  whatLLMDid?: string; rationale?: string; llmDescription?: string;
}) => {
  const { summary, examples } = parseSidebarSummary(llmDescription, whatLLMDid);
  const reflection = parseSidebarReflection(rationale);
  return <>
    {summary.length > 0 && <SidebarSection title="What Was Done" icon="✨" count={summary.length} defaultOpen ai>
      <SidebarItemList items={summary} />
    </SidebarSection>}
    {examples.length > 0 && <SidebarSection title="Example Codes" icon="💡" count={examples.length} tone="amber" ai>
      <SidebarItemList items={examples} tone="amber" />
    </SidebarSection>}
    {reflection.length > 0 && <SidebarSection title="Self-Reflection" icon="🔍" count={reflection.length} tone="emerald" ai>
      <SidebarItemList items={reflection} tone="emerald" />
    </SidebarSection>}
  </>;
});
AgentSidebarSummary.displayName = "AgentSidebarSummary";
export default AgentSidebarSummary;
