import { useRef, useEffect, useState } from "react";
import useAppStore from "@/stores/useAppStore";

export default function InputArea() {
  const { researchQuestion, setResearchQuestion } = useAppStore();

  const [localResearchQuestion, setLocalResearchQuestion] = useState(
    typeof researchQuestion === "string" ? researchQuestion : ""
  );

  const researchQuestionRef = useRef<HTMLTextAreaElement>(null);

  const maxHeight = 300;

  useEffect(() => {
    if (researchQuestionRef.current) {
      researchQuestionRef.current.style.height = "auto";
      researchQuestionRef.current.style.height = `${Math.min(
        researchQuestionRef.current.scrollHeight,
        maxHeight
      )}px`;
      researchQuestionRef.current.style.overflowY =
        researchQuestionRef.current.scrollHeight > maxHeight
          ? "auto"
          : "hidden";
    }
  }, [localResearchQuestion]);

  useEffect(() => {
    setLocalResearchQuestion(
      typeof researchQuestion === "string" ? researchQuestion : ""
    );
  }, [researchQuestion]);

  useEffect(() => {
    const inputAreaElement = document.getElementById("input-area");

    const handleSaveEvent = (event: CustomEvent) => {
      // Only save if shouldSave is true
      if (event.detail?.shouldSave) {
        saveChangesToStore();
      }
    };

    const handleResetEvent = () => {
      // Reset local state when reset event is triggered
      setLocalResearchQuestion("");
    };

    if (inputAreaElement) {
      inputAreaElement.addEventListener(
        "save-input-area",
        handleSaveEvent as EventListener
      );

      inputAreaElement.addEventListener(
        "reset-input-area",
        handleResetEvent as EventListener
      );
    }

    return () => {
      if (inputAreaElement) {
        inputAreaElement.removeEventListener(
          "save-input-area",
          handleSaveEvent as EventListener
        );

        inputAreaElement.removeEventListener(
          "reset-input-area",
          handleResetEvent as EventListener
        );
      }
    };
  }, [localResearchQuestion]);

  useEffect(() => {
    // Save to store after a short delay to avoid excessive updates
    const saveTimer = setTimeout(() => {
      saveChangesToStore();
    }, 500);

    return () => clearTimeout(saveTimer);
  }, [localResearchQuestion]);

  // Function to save changes to the store
  const saveChangesToStore = () => {
    setResearchQuestion(localResearchQuestion);
    // console.log("Research question saved to store:", localResearchQuestion);
  };

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalResearchQuestion(e.target.value);
  };

  const handleSuggestionClick = (suggestion: string) => {
    const currentText =
      typeof localResearchQuestion === "string"
        ? localResearchQuestion.trim()
        : "";

    const updatedText = currentText
      ? `${currentText} ${suggestion}`
      : `${suggestion}`;

    setLocalResearchQuestion(updatedText);

    // Immediately save suggestion to store
    setTimeout(() => saveChangesToStore(), 0);
  };

  return (
    <div
      id="input-area"
      className="flex flex-col h-full w-full overflow-auto scrollbar-thin flex-1 justify-start gap-36 items-center px-8 bg-[#FFFBF9] rounded-xl"
    >
      <div className="flex-1 flex flex-col gap-6 p-4">
        <div className="w-full flex flex-col mt-6 border rounded-xl border-black relative pt-6">
          <div className="absolute -top-3 left-4 bg-[#FFFBF9] px-2">
            <span className="font-semibold">Research Question(s)</span>
          </div>
          <textarea
            ref={researchQuestionRef}
            value={localResearchQuestion}
            onChange={handleTextAreaChange}
            className="w-full outline-none overflow-auto resize-none font-zen scrollbar-thin px-6 bg-[#FFFBF9]"
            style={{ minHeight: "80px", maxHeight: `${maxHeight}px` }}
            placeholder="Enter your research question here..."
          />
          <div className="mt-2 mx-4">
            <p className="mb-2">Suggestions:</p>
            <div className="flex flex-wrap gap-2">
              <button
                className="px-2 py-1 border border-black rounded-lg hover:bg-gray-100"
                onClick={() =>
                  handleSuggestionClick("What are the most valuable insights?")
                }
              >
                What are the most valuable insights?
              </button>
              <button
                className="px-2 py-1 border border-black rounded-lg hover:bg-gray-100"
                onClick={() =>
                  handleSuggestionClick(
                    "What are the main topics and relevant factors?"
                  )
                }
              >
                What are the main topics and relevant factors?
              </button>
            </div>
          </div>
          <div className="border-t border-black mt-2"></div>
          <div className="bg-[#FFF4EF] text-sm text-gray-600 rounded-xl">
            <p className="p-4">
              Your research question(s) guide the qualitative coding process. A
              clear question ensures focused and meaningful analysis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
