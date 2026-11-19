import { useState } from "react";
import useCodeStore from "@/stores/useCodeStore";
import useConceptStore from "@/stores/useConceptStore";
import { SubthemeList } from "@/components/analysis/HierarchyCards";
import Concept from "./Concepts";
import AddConcept from "./AddConcept";

export default function Discover() {
  const codeData = useCodeStore(s => s.codeData);
  const conceptData = useConceptStore(s => s.conceptData);
  const [show, setShow] = useState(false);
  const assigned = new Set(conceptData.flatMap(theme => Object.values(theme.codes || {}).flat().map(item => item.id)));
  const unassigned = codeData.filter(item => !assigned.has(item.id));
  const aiCount = conceptData.filter(item => item.isGPT === true).length;

  return <div className="w-full h-full flex flex-col bg-[#FFFBF9]">
    <div className="w-full px-4 sm:px-6 py-2 flex flex-wrap items-center gap-2 bg-[#FFF3EE] border-b border-[#CB9180]/10 shrink-0 text-xs text-[#8B5E4B]">
      <h1 className="font-semibold text-[#CB9180] text-sm">Themes</h1>
      <span>Total:{conceptData.length}</span>
      <span>🤖 AI-generated:{aiCount}</span>
      <span>✏️ User edited:{conceptData.length - aiCount}</span>
    </div>
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
      <div className="max-w-4xl mx-auto space-y-5">
        <p className="text-xs text-gray-500">Read from top to bottom: each theme contains subthemes and their codes. Select a code to view its source segments.</p>
        <button type="button" className="w-full py-3 text-sm text-[#C66B50] shadow-sm rounded-xl border hover:bg-white" onClick={() => setShow(true)}>+ Add New Theme</button>
        {show && <AddConcept setShow={setShow} />}
        {conceptData.map(theme => <section key={theme.nanoid || theme.id} aria-label={`Theme: ${theme.name}`}><Concept {...theme} /></section>)}
        {conceptData.length === 0 && <p className="text-sm text-gray-500">No themes yet.</p>}
        {unassigned.length > 0 && <section aria-label="Unassigned subthemes" className="border-t pt-5">
          <h2 className="text-sm font-semibold text-gray-600">Unassigned subthemes</h2>
          <SubthemeList subthemes={unassigned} />
        </section>}
      </div>
    </div>
  </div>;
}
