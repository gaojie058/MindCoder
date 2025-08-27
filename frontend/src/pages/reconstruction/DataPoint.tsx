import { useState, useRef, useEffect, useCallback } from "react";
import { datapoint } from "@/types/stores";
import Dialog from "@/components/ui/Dialog";
import useCardStore from "@/stores/useCardStore";
import Button from "@/components/ui/Button";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";

interface DatapointProps extends datapoint {
  onSave: (saved: boolean) => void;
}

export default function DataPoint({
  uuid,
  id,
  content,
  onSave,
}: DatapointProps) {
  const [isHidden, setIsHidden] = useState(true);
  const [isEditable, setIsEditable] = useState(false);
  const { deleteDatapoint, updateDatapoint, cardData } = useCardStore();

  const [newContent, setNewContent] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Get the latest content from the store when viewing
  const getLatestContent = useCallback(() => {
    // Search through all cards and their topics to find the matching datapoint
    for (const card of cardData) {
      for (const topic of card.topics) {
        if (topic.uuid === uuid) {
          return topic.content;
        }
      }
    }
    // If not found, return the original content
    return content;
  }, [uuid, cardData, content]);

  const handleSave = useCallback(() => {
    if (content !== newContent) {
      updateDatapoint(uuid, newContent);
      onSave(true);
    } else {
      onSave(false);
    }
    setIsHidden(true);
    setIsEditable(false);
  }, [uuid, content, newContent, updateDatapoint, onSave]);

  useEffect(() => {
    if (textareaRef.current && !isHidden) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isHidden, isEditable]);

  const handleView = useCallback(() => {
    // Get the latest content from the store when viewing
    setNewContent(getLatestContent());
    setIsEditable(false);
    setIsHidden(false);
  }, [getLatestContent]);

  const handleEdit = useCallback(() => {
    // Get the latest content from the store when editing
    setNewContent(getLatestContent());
    setIsEditable(true);
    setIsHidden(false);
  }, [getLatestContent]);

  const handleDelete = useCallback(() => {
    deleteDatapoint(uuid);
  }, [uuid, deleteDatapoint]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node) &&
        cardRef.current &&
        !cardRef.current.contains(event.target as Node)
      ) {
        setIsHidden(true);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      <HoverCard>
        <div
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          ref={cardRef}
        >
          <HoverCardTrigger asChild>
            <div
              className={`py-1 px-3 min-h-[8.5em] flex items-center justify-center text-sm rounded-[46px] text-center border cursor-pointer border-[#C66B50AB] mb-2 break-words ${
                isHovering ? "bg-[#FFC6A9] bg-opacity-75" : ""
              }`}
            >
              <div className="line-clamp-4 overflow-hidden">{content}</div>
            </div>
          </HoverCardTrigger>
          {isHovering && (
            <HoverCardContent className="relative bg-transparent border-0 -top-20 left-0 w-full h-full flex items-center justify-center rounded-[46px] ">
              <div className="flex justify-around w-full px-4 gap-4 ">
                <Button
                  onClick={handleView}
                  className="p-2 rounded-full !text-[#C66B50] font-zen font-semibold shadow-[0px_4.48px_4.48px_0px_#00000040]"
                >
                  View
                </Button>
                <Button
                  onClick={handleEdit}
                  className="p-2 rounded-full !text-[#C66B50] font-zen font-semibold shadow-[0px_4.48px_4.48px_0px_#00000040]"
                >
                  Edit
                </Button>
                <Button
                  onClick={handleDelete}
                  className="p-2 rounded-full !text-[#C66B50] font-zen font-semibold shadow-[0px_4.48px_4.48px_0px_#00000040]"
                >
                  Delete
                </Button>
              </div>
            </HoverCardContent>
          )}
        </div>
      </HoverCard>
      {isHidden ? null : (
        <Dialog>
          <div
            ref={dialogRef}
            className="resize-y overflow-auto mx-auto w-[380px] min-h-[400px] bg-white p-3 rounded-xl flex flex-col"
          >
            {/* <div className="outline-none w-full border-b mb-3 p-2 text-sm">
              {id}
            </div> */}
            <textarea
              className="resize-none outline-none justify-stretch w-full flex-1 border rounded-lg p-2 scrollbar-thin text-sm"
              value={newContent}
              ref={textareaRef}
              onChange={(e) => setNewContent(e.target.value)}
              readOnly={!isEditable}
            />
            {isEditable && (
              <div className="flex justify-end items-center w-full mt-2 gap-2">
                <Button
                  onClick={handleSave}
                  className="p-2 px-3 rounded-lg !bg-[#CB9180] hover:!bg-[#AA7667] text-sm"
                >
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
