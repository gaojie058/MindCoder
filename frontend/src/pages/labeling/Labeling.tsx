import { useState } from "react";
import useCodeStore from "@/stores/useCodeStore";
import useCardStore from "@/stores/useCardStore";
import useConceptStore from "@/stores/useConceptStore";
import { CodeList, ThemeCard } from "@/components/analysis/HierarchyCards";
import { buildMapData } from "@/utils/analysisHierarchy";
import Code from "./Code";
import AddCode from "./AddCode";

export default function Labeling() {
  const codeData = useCodeStore(s => s.codeData);
  const cardData = useCardStore(s => s.cardData);
  const conceptData = useConceptStore(s => s.conceptData);
  const [show, setShow] = useState(false);
  const themes = buildMapData(conceptData).themes;
  const assignedSubthemes = new Set(themes.flatMap(theme => theme.subthemes.map(item => item.id)));
  const unassignedSubthemes = codeData.filter(item => !assignedSubthemes.has(item.id));
  const assignedCards = new Set(codeData.flatMap(item => Object.values(item.data || {}).flat().map(card => card.id)));
  const unassignedCards = cardData.filter(item => item.active !== false && !assignedCards.has(item.id));
  const aiCount = codeData.filter(item => item.isGPT === true).length;

  return <div className="w-full h-full flex flex-col bg-[#FFFBF9]">
    <div className="w-full px-4 sm:px-6 py-2 flex flex-wrap items-center gap-2 bg-[#FFF3EE] border-b border-[#CB9180]/10 shrink-0 text-xs text-[#8B5E4B]">
      <h1 className="font-semibold text-[#CB9180] text-sm">Sub-themes</h1>
      <span>Total:{codeData.length}</span>
      <span>🤖 AI-generated:{aiCount}</span>
      <span>✏️ User edited:{codeData.length - aiCount}</span>
    </div>
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
      <div className="max-w-4xl mx-auto space-y-5">
        <p className="text-xs text-gray-500">Read from top to bottom: each theme contains subthemes and their codes. Select a code to view its source segments.</p>
        <button type="button" className="w-full py-3 text-sm text-[#C66B50] shadow-sm rounded-xl border hover:bg-white" onClick={() => setShow(true)}>+ Add New Sub-theme</button>
        {show && <AddCode setShow={setShow} />}
        {themes.map((theme, index) => {
          const subthemes = theme.subthemes.flatMap(item => codeData.filter(code => code.id === item.id));
          return <section key={theme.id} aria-label={`Theme: ${theme.name}`}>
            <ThemeCard theme={{ ...theme, subthemes: theme.subthemes.filter(item => codeData.some(code => code.id === item.id)) }} number={index + 1} />
            <div className="ml-3 sm:ml-5 border-l-2 pl-3 sm:pl-5 pt-4 space-y-5" style={{ borderColor: theme.color }}>
              {subthemes.map(item => <Code key={item.nanoid || item.id} {...item} />)}
              {subthemes.length === 0 && <p className="text-xs text-gray-400">No subthemes in this theme yet.</p>}
            </div>
          </section>;
        })}
        {unassignedSubthemes.length > 0 && <section aria-label="Unassigned subthemes" className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-600">Unassigned subthemes</h2>
          {unassignedSubthemes.map(item => <Code key={item.nanoid || item.id} {...item} />)}
        </section>}
        {codeData.length === 0 && <p className="text-sm text-gray-500">No subthemes yet.</p>}
        {unassignedCards.length > 0 && <section aria-label="Unassigned codes" className="border-t pt-5">
          <h2 className="text-sm font-semibold text-gray-600">Unassigned codes</h2>
          <CodeList cards={unassignedCards} />
        </section>}
      </div>
    </div>
  </div>;
}
