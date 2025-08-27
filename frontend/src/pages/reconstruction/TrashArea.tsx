import useCardStore from "@/stores/useCardStore";
import Card from "./Card";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import logoCard from "@/assets/icon/doc.png";
import logoSearch from "@/assets/icon/search.png";
import logoTrash from "@/assets/icon/trash.png";

export default function TrashArea() {
  // 从 store 中获取 cardData 和 setCardData
  const { cardData, setCardData } = useCardStore();
  const navigate = useNavigate();
  const { project, step } = useParams();

  const goToCardArea = () =>
    navigate(`/reconstruction/${project}/${step}/card`);
  const goToSearchArea = () =>
    navigate(`/reconstruction/${project}/${step}/search`);
  const goToTrashArea = () =>
    navigate(`/reconstruction/${project}/${step}/trash`);

  return (
    <div className="w-full h-full flex-1 flex flex-col justify-stretch overflow-hidden">
      <div className="p-8 w-full flex-1">
        <div className="flex justify-between items-center mb-8">
          {/* <div className="text-3xl font-semibold">Trashed Cards</div> */}
          <div className="flex gap-3">
            <Button
              onClick={goToCardArea}
              className="w-40 h-12 rounded-2xl !text-deepbg !bg-[#FFF3EE]"
            >
              <img src={logoCard} alt="" className="w-6 h-6 mr-2" />
              Card View
            </Button>
            <Button
              onClick={goToSearchArea}
              className="w-40 h-12 rounded-2xl !text-deepbg !bg-[#FFF3EE]"
            >
              <img src={logoSearch} alt="" className="w-6 h-6 mr-2" />
              Search
            </Button>
            {/* <Button
              onClick={goToTrashArea}
              className="w-40 h-12 rounded-2xl !text-white !bg-[#CB9180]"
            >
              <img src={logoTrash} alt="" className="w-6 h-6 mr-2" />
              Trash
            </Button> */}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap overflow-auto scrollbar-thin gap-6">
          {cardData
            .filter((card) => !card.active)
            .map((card) => (
              <div key={card.id} className="relative w-full">
                <Card
                  topics={card.topics}
                  id={card.id}
                  name={card.name}
                  active={card.active}
                  isGPT={card.isGPT}
                />
                <div className="absolute bottom-0 right-0 m-4"></div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
