import { useState, useRef, useEffect, useCallback } from "react";
import Datapoint from "./DataPoint";
import { card } from "@/types";
import logoTrash from "@/assets/icon/trash.png";
import logoAdd from "@/assets/icon/add.png";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import useCardStore from "@/stores/useCardStore";
import { nanoid } from "nanoid";

export default function Card({ id, topics = [], active, isGPT, name }: card) {
  const {
    cardData: data,
    setCardData,
    updateCardIsGPT,
    updateCardName,
  } = useCardStore();
  const [showDialog, setShowDialog] = useState(false);
  const [newCardContent, setNewCardContent] = useState("");
  const [newCardId, setNewCardId] = useState("");

  const [editingName, setEditingName] = useState(false);
  const [cardName, setCardName] = useState(name);

  // Add more detailed debugging
  // console.log(`Card ${id} rendering with:`, {
  //   topicsType: typeof topics,
  //   isArray: Array.isArray(topics),
  //   topicsLength: Array.isArray(topics) ? topics.length : "N/A",
  //   topicsContent: topics,
  // });

  // Find topics from cardData if they're not present in props
  useEffect(() => {
    if (Array.isArray(topics) && topics.length === 0) {
      // Try to find this card in the store and get its topics
      const cardFromStore = data.find((card) => card.id === id);
      if (
        cardFromStore &&
        Array.isArray(cardFromStore.topics) &&
        cardFromStore.topics.length > 0
      ) {
        console.log(
          `Found card ${id} in store with ${cardFromStore.topics.length} topics`
        );
        // We could update local state here to show these topics
      }
    }
  }, [id, topics, data]);

  // console.log("Card data:", data);
  useEffect(() => {
    setCardName(name);
  }, [name]);

  const deleteCard = useCallback(() => {
    const updatedData = data.map((item) =>
      item.id === id ? { ...item, active: false } : item
    );
    setCardData(updatedData);
  }, [data, id, setCardData]);

  const addDatapoint = useCallback(() => {
    setShowDialog(true);
  }, []);

  const handleSaveCard = useCallback(() => {
    if (newCardContent.trim() === "" || newCardId.trim() === "") return;

    const updatedData = data.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          name: cardName,
          isGPT: false,
          topics: [
            ...item.topics,
            {
              id: newCardId,
              content: newCardContent,
              uuid: nanoid(),
            },
          ],
        };
      }
      return item;
    });
    setCardData(updatedData);
    setShowDialog(false);
    setNewCardContent("");
    setNewCardId("");
  }, [data, id, cardName, newCardContent, newCardId, setCardData]);

  const restoreCard = useCallback(() => {
    const updatedData = data.map((item) =>
      item.id === id ? { ...item, active: true } : item
    );
    setCardData(updatedData);
  }, [data, id, setCardData]);

  const handleEditDatapointSave = useCallback(
    (saved: boolean) => {
      if (saved) {
        updateCardIsGPT(id, false);
      }
    },
    [id, updateCardIsGPT]
  );

  const handleNameSave = useCallback(() => {
    updateCardName(id, cardName);
    setEditingName(false);
  }, [id, cardName, updateCardName]);

  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        editingName &&
        nameInputRef.current &&
        !nameInputRef.current.contains(event.target as Node)
      ) {
        handleNameSave();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingName, handleNameSave]);

  const renderTrashOrRestore = useCallback(() => {
    if (active) {
      return (
        <div className="flex items-center">
          {/* <img
            src={logoAdd}
            className="w-5 h-5 inline cursor-pointer mr-2"
            onClick={addDatapoint}
          /> */}
          <img
            src={logoTrash}
            className="w-5 h-5 inline cursor-pointer"
            onClick={deleteCard}
          />
        </div>
      );
    } else {
      return (
        <div
          className="p-2 bg-[#FFF3EE] rounded-lg text-[#CB9180] text-sm cursor-pointer"
          onClick={restoreCard}
        >
          Restore Card
        </div>
      );
    }
  }, [active, addDatapoint, deleteCard, restoreCard]);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const contentEl = contentRef.current;
    if (contentEl) {
      contentEl.style.scrollbarWidth = "none";
      contentEl.style.overflow = "hidden";
      contentEl.style.overflowY = "scroll";
    }
  }, []);

  const cardRef = useRef(null);

  const handleNavigateToCard = useCallback(
    (event) => {
      if (event.detail.cardId === id.toString()) {
        if (cardRef.current) {
          cardRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          // Add flash effect
          cardRef.current.classList.add("card-highlight-flash");

          // Remove the flash effect after animation completes
          setTimeout(() => {
            if (cardRef.current) {
              cardRef.current.classList.remove("card-highlight-flash");
            }
          }, 1500);
        }
      }
    },
    [id]
  );

  useEffect(() => {
    // Add event listener
    window.addEventListener("navigateToCard", handleNavigateToCard);

    // Clean up
    return () => {
      window.removeEventListener("navigateToCard", handleNavigateToCard);
    };
  }, [handleNavigateToCard]);

  return (
    <div
      ref={cardRef}
      className={`min-w-[300px] h-[260px] w-[30%] lg:max-w-[380px] 2xl:max-w-[430px] border bg-white ${
        active ? "border-[#C66B50AB]" : "border-[#D9D9D9]"
      } mb-4 rounded-lg overflow-hidden transition-all ${
        !active ? null : "hover:-translate-y-1 hover:shadow-lg"
      } duration-300`}
      id={`card-${id}`}
    >
      <div
        className={`w-full h-2.5 ${active ? "bg-[#FFE2D4]" : "bg-[#D9D9D9]"}`}
      ></div>
      <div
        className="p-3 pb-10 lg:px-4 2xl:px-6 max-h-[320px] overflow-auto no-scrollbar"
        ref={contentRef}
      >
        <div className="sticky top-0 left-0 right-0 z-10">
          <div className="absolute -top-3 left-0 right-0 h-full bg-white"></div>
          <div
            className={`relative gap-2 text-lg pb-1 bg-white flex items-center ${
              active ? "text-[#C66B50]" : "text-[#9F9E9E]"
            } mb-2`}
          >
            <div className="flex-1 font-zen text-sm">
              Open Code {id}:{" "}
              {editingName ? (
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleNameSave();
                    }
                  }}
                  autoFocus
                  className="border-b border-dotted outline-none text-[#C66B50] bg-transparent"
                />
              ) : (
                <span
                  onClick={() => setEditingName(true)}
                  className="cursor-pointer underline"
                  title="Click to edit name"
                >
                  {cardName}
                </span>
              )}
            </div>
            <div className="flex flex-row items-end">
              {isGPT ? (
                <div className="text-xs font-zen text-indigo-500">
                  🤖 AI
                </div>
              ) : (
                <div className="text-xs font-zen text-amber-600">
                  ✏️ Edited
                </div>
              )}
              {renderTrashOrRestore()}
            </div>
          </div>
        </div>

        {/* Use data from store if topics is empty */}
        {Array.isArray(topics) && topics.length > 0 ? (
          topics.map((datapoint, index) => (
            <Datapoint
              key={index}
              uuid={datapoint.uuid}
              id={datapoint.id}
              content={datapoint.content}
              onSave={handleEditDatapointSave}
            />
          ))
        ) : data.find((card) => card.id === id)?.topics?.length > 0 ? (
          data
            .find((card) => card.id === id)
            ?.topics.map((datapoint, index) => (
              <Datapoint
                key={index}
                uuid={datapoint.uuid}
                id={datapoint.id}
                content={datapoint.content}
                onSave={handleEditDatapointSave}
              />
            ))
        ) : (
          <div className="text-red-500 p-2">No topics available</div>
        )}
        <div className="h-10"></div>
        {showDialog && (
          <Dialog>
            <div className="mx-auto w-[380px] min-h-[200px] bg-white p-3 rounded-xl flex flex-col">
              <input
                className="outline-none w-full border-b mb-3 p-2 text-sm"
                placeholder="Enter new ID"
                value={newCardId}
                onChange={(e) => setNewCardId(e.target.value)}
              />
              <textarea
                className="outline-none w-full border-b mb-3 p-2 text-sm"
                placeholder="Enter new content"
                value={newCardContent}
                onChange={(e) => setNewCardContent(e.target.value)}
              />
              <div className="flex justify-end items-center w-full mt-2 gap-2">
                <Button
                  onClick={() => setShowDialog(false)}
                  className="p-2 px-3 rounded-lg !bg-[#CB9180] hover:!bg-[#AA7667] text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveCard}
                  className="p-2 px-3 rounded-lg !bg-[#CB9180] hover:!bg-[#AA7667] text-sm"
                >
                  Save New Card
                </Button>
              </div>
            </div>
          </Dialog>
        )}
      </div>
    </div>
  );
}
