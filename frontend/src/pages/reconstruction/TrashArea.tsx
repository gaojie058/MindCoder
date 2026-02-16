import useCardStore from "@/stores/useCardStore";
import Card from "./Card";
import { useNavigate, useParams } from "react-router-dom";

export default function TrashArea() {
  const { cardData } = useCardStore();
  const navigate = useNavigate();
  const { project, step } = useParams();

  const goBack = () =>
    navigate(`/reconstruction/${project}/${step}/card`);

  const trashedCards = cardData.filter((card) => !card.active);

  return (
    <div className="w-full h-full flex flex-col bg-[#FFFBF9]">
      {/* Step Header — matches CardArea style */}
      <div className="w-full bg-gradient-to-r from-[#CB9180]/10 to-[#D39C83]/5 border-b border-[#CB9180]/15 px-6 py-3 flex-shrink-0">
        <h2 className="text-lg font-semibold font-zen text-[#8B5E4B]">
          <span className="text-[#CB9180] mr-2">🗑️</span>Trashed Codes
        </h2>
        <p className="text-xs text-gray-500 font-zen mt-0.5">
          {trashedCards.length} deleted code{trashedCards.length !== 1 ? "s" : ""} — restore from here
        </p>
      </div>

      {/* Toolbar */}
      <div className="w-full flex gap-2 bg-white z-20 px-6 py-2 flex-shrink-0 border-b border-gray-100 items-center">
        <button
          onClick={goBack}
          className="h-9 rounded-xl text-xs px-3 bg-[#FFF3EE] text-[#8B5E4B] hover:bg-[#CB9180]/20 transition-colors flex items-center gap-1.5"
        >
          ← Back
        </button>
      </div>

      {/* Trashed cards list */}
      <div className="flex-1 overflow-auto scrollbar-thin p-6">
        {trashedCards.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-12">No trashed codes</div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {trashedCards.map((card) => (
              <div key={card.id} className="relative w-full">
                <Card
                  topics={card.topics}
                  id={card.id}
                  name={card.name}
                  active={card.active}
                  isGPT={card.isGPT}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
