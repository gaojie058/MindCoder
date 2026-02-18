import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from "react";
// import zoomin from "@/assets/zoomin.png"
// import zoomout from "@/assets/zoomout.png"
import useDisplayStore from "@/stores/useDisplayStore";

// import { FullscreenIcon, MinimizeIcon } from "lucide-react";

interface props {
  isFullScreen: boolean;
  setIsFullScreen: Dispatch<SetStateAction<boolean>>;
  setActiveId: Dispatch<SetStateAction<unknown>>;
  setActiveType: Dispatch<SetStateAction<unknown>>;
}

function extractContent(content: string) {
  const bracketRegex = /\[(.*?)\]/g;
  const braceRegex = /\{([^}]+)\}/g;

  let processed = content.replace(braceRegex, "");
  const bracketMatches: string[] = [];

  let match;
  while ((match = bracketRegex.exec(processed)) !== null) {
    bracketMatches.push(match[1].trim());
  }

  processed = processed.replace(bracketRegex, (_, p1) => p1.trim());

  // console.log("Processed content:", processed);
  // console.log("Bracket matches:", bracketMatches);

  return {
    processed,
    bracketMatches,
  };
}

function connectAttribute(
  content: string,
  type: "title" | "content",
  tier: "1" | "2" | "3"
) {
  // Strip bracket/brace references like [Theme Name {Theme 1}] → Theme Name
  let updatedContent = content
    .replace(/\{[^}]+\}/g, '')        // remove {Theme 1}, {Code 2} etc.
    .replace(/\[([^\]]+)\]/g, '$1')   // unwrap [brackets] → just the text
    .trim();

  // Clean up stray backslashes from LLM output
  updatedContent = updatedContent.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '');

  // Render *text* as italic (for evidence/quotes)
  updatedContent = updatedContent.replace(/\*([^*]+)\*/g, '<em class="text-gray-500">$1</em>');

  if (tier === "1")
    return `<div class="text-md font-semibold text-[#707070] ">${updatedContent}</div>`;
  else if (tier === "2") {
    if (type === "title")
      return `<div class="text-lg font-bold text-[#505050] mt-4">${updatedContent}</div>`;
    if (type === "content")
      return `<div class="text-sm text-gray-600">${updatedContent}</div>`;
  } else if (tier === "3") {
    if (type === "title")
      return `<div className="text-md font-semibold text-[#606060] mt-2">${updatedContent}</div>`;
    if (type === "content")
      return `<div className="text-sm text-gray-600">${updatedContent}</div>`;
  }
}

function renderHtml(report: any) {
  let html = ``;

  const title = report?.Title || report?.title || "No Title Available";
  const sections = report?.Sections || report?.sections || [];

  // html += connectAttribute(title, "title", "1");

  sections.forEach((section: any) => {
    const sectionTitle = section.Title || section.title;
    const sectionContent = section.Content || section.content;

    html += connectAttribute(sectionTitle, "title", "2");

    if (sectionContent) {
      html += connectAttribute(sectionContent, "content", "2");
    }

    const subsections = section?.Subsections || section?.subsections || [];
    subsections.forEach((subsection: any) => {
      const subsectionTitle = subsection.Title || subsection.title;
      const subsectionContent = subsection.Content || subsection.content;

      html += connectAttribute(subsectionTitle, "title", "3");
      html += connectAttribute(subsectionContent, "content", "3");
    });
  });

  return html;
}

const Report: React.FC<props> = ({
  isFullScreen,
  // setIsFullScreen,
  setActiveId,
  setActiveType,
}) => {
  const { report } = useDisplayStore();
  const reportData = report?.Report || report;
  console.log("Report component - report data:", report);
  console.log("Report component - reportData:", reportData);

  // const title = reportData?.Title || "No Title Available";
  // const sections = reportData?.Sections || [];
  const containerRef = useRef<HTMLDivElement>(null);
  // const [activeType,setActiveType] = useState<'Gruop'|'Section'|'Code'|''>('')
  // const [activeId,setActiveId] = useState<number|null>(null)

  const clickHandler = useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLSpanElement;
      const link = target.dataset.link;

      // console.log("Clicked element:", target);
      // console.log("Data link:", link);

      if (link) {
        let parsedId: number | null = null;
        if (link.startsWith("Concept")) {
          setActiveType("Concept");
          parsedId = parseInt(link.replace("Concept", "").trim());
        } else if (link.startsWith("Code")) {
          setActiveType("Code");
          parsedId = parseInt(link.replace("Code", "").trim());
        } else {
          setActiveType("Card");
          parsedId = parseInt(link.replace("Card", "").trim());
        }

        // console.log("Parsed ID:", parsedId);
        setActiveId(parsedId);
      }
    },
    [setActiveType, setActiveId]
  );

  useEffect(() => {
    let spans: NodeListOf<HTMLSpanElement>;
    if (containerRef.current && reportData) {
      containerRef.current.innerHTML = renderHtml(reportData);
      spans = containerRef.current.querySelectorAll("span");
      spans.forEach((span) => {
        span.addEventListener("click", clickHandler);
      });
    }
    return () => {
      if (spans) {
        spans.forEach((span) => {
          span.removeEventListener("click", clickHandler);
        });
      }
    };
  }, [reportData, clickHandler]);

  return (
    <div
      className={`w-full bg-white font-zen p-8 border-b border-r overflow-auto ${
        isFullScreen ? "fullscreen-class" : ""
      }`}
      id="report"
    >
      <div className="flex flex-col mb-4 gap-4">


        {/* Disclaimer */}
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
          <span className="text-base leading-none mt-0.5">⚠️</span>
          <p className="text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">AI-assisted analysis.</span> Codes and themes were generated by LLM and reviewed by the researcher. Treat as reference, not definitive findings.
          </p>
        </div>

        <div className="flex items-center">
          <h2 className="text-xl font-bold text-[#707070] flex-1">
            Findings
          </h2>
          {/* <div
            className="cursor-pointer"
            onClick={() => setIsFullScreen(!isFullScreen)}
          >
            {!isFullScreen ? <FullscreenIcon /> : <MinimizeIcon />}
          </div> */}
        </div>
        
        <div ref={containerRef}>
          {/* <div className="text-md font-semibold text-[#707070]">{title}</div>
          {sections.map((section, index) => (
            <div key={index} className="mt-4">
              <div className="text-lg font-bold text-[#505050]">
                {section.Title}
              </div>
              <div className="text-sm text-gray-600">{section.Content}</div>

              {section.Subsections?.map((subsection, subIndex) => (
                <div key={subIndex} className="ml-4 mt-2">
                  <div className="text-md font-semibold text-[#606060]">
                    {subsection.Title}
                  </div>
                  <div className="text-sm text-gray-600">
                    {subsection.Content}
                  </div>
                </div>
              ))}
            </div>
          ))} */}
        </div>

        {/* <div className="gap-4 flex flex-col mt-4">
          <button className="block">
            <img src={zoomin} alt="Zoom In" />
          </button>
          <button className="block">
            <img src={zoomout} alt="Zoom Out" />
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default Report;
