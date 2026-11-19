import { useMemo } from "react";
import useConceptStore from "@/stores/useConceptStore";
import { ThemeCard, SubthemeList } from "@/components/analysis/HierarchyCards";
import { buildMapData } from "@/utils/analysisHierarchy";

export default function ThemeMap() {
  const conceptData = useConceptStore((s) => s.conceptData);
  const data = useMemo(() => buildMapData(conceptData), [conceptData]);

  if (data.themes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        No theme data available. Complete Steps 1-3 first.
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto p-4 sm:p-6 bg-[#FFFBF9]">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-sm font-semibold text-gray-800">Theme overview</h1>
          <p className="mt-1 text-xs text-gray-500">
            Read from top to bottom: each theme contains subthemes and their codes. Select a code to view its source segments.
          </p>
        </div>

        {data.themes.map((theme, themeIndex) => (
          <section key={theme.id} aria-label={`Theme: ${theme.name}`} className="min-w-0">
            <ThemeCard theme={theme} number={themeIndex + 1} />
            <SubthemeList subthemes={Object.values(conceptData[themeIndex].codes).flat()} color={theme.color} themeNumber={`${themeIndex + 1}`} />
          </section>
        ))}
      </div>
    </div>
  );
}
