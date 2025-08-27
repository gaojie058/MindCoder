import searchLogo from "@/assets/icon/search.png";
import AlertInfo from "@/lib/AlertInfo";
import useCardStore from "@/stores/useCardStore";
import { useEffect, useRef, useState } from "react";
import { card } from "@/types/index";
import Dialog from "@/components/ui/Dialog";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { debounce } from "lodash";
import Card from "./Card";
import { useNavigate, useParams } from "react-router-dom";
import Button from "@/components/ui/Button";
import logoCard from "@/assets/icon/doc.png";
import logoSearch from "@/assets/icon/search.png";
import logoTrash from "@/assets/icon/trash.png";

const debounceFilteCard = debounce((type, value, data, setFilteData) => {
  if (!value) {
    if (type === "click") {
      AlertInfo({
        message: "Please enter the text",
        title: "Error",
        type: "destructive",
      });
    }
    setFilteData([]);
    return null;
  }

  const filteCard = data
    .filter((cardlist: card) => {
      if (cardlist.active) {
        for (const card of cardlist.topics) {
          if (
            card.id.toLowerCase().includes(value.toLowerCase()) || // 匹配 datapoint id
            card.content.toLowerCase().includes(value.toLowerCase()) // 匹配 datapoint content
          ) {
            return true; // 如果找到匹配项则保留此卡片
          }
        }
      }
      return false;
    })
    .sort((a, b) => Number(a.id) - Number(b.id)); // 根据 id 排序

  setFilteData(filteCard);
}, 300);

export default function SearchArea() {
  const [value, setValue] = useState("");
  const [filteData, setFilteData] = useState<card[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isHidden, setIsHidden] = useState(true);
  const { cardData } = useCardStore();
  const dialogRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { project, step } = useParams();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  // 过滤
  useEffect(() => {
    debounceFilteCard("change", value, cardData, setFilteData);
  }, [value, cardData]);

  // 展示dialog
  const revealDialog = (index: number) => {
    setActiveIndex(index);
    setIsHidden(false);
  };

  // 隐藏dialog
  const hideDialog = () => {
    setActiveIndex(-1);
    setIsHidden(true);
  };

  // 处理点击外部关闭对话框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node)
      ) {
        hideDialog();
      }
    };

    if (!isHidden) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isHidden]);

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".filte-card", {
        duration: 0.2,
        opacity: 0.8,
        scale: 0.8,
        y: 50,
        stagger: 0.04,
      });
    },
    { scope: containerRef, dependencies: [filteData] }
  );

  const goToCardArea = () =>
    navigate(`/reconstruction/${project}/${step}/card`);
  const goToSearchArea = () =>
    navigate(`/reconstruction/${project}/${step}/search`);
  const goToTrashArea = () =>
    navigate(`/reconstruction/${project}/${step}/trash`);

  const renderDialog = () => {
    if (isHidden) return null;

    const dialogData = filteData[activeIndex]; // 使用过滤后的数据

    return (
      <Dialog>
        <div ref={dialogRef}>
          <Card
            topics={dialogData.topics}
            name={dialogData.name}
            id={dialogData.id}
            active={dialogData.active}
            isGPT={dialogData.isGPT}
          ></Card>
        </div>
      </Dialog>
    );
  };

  return (
    <>
      <div className="w-full h-full flex-1 p-5 overflow-auto scrollbar-thin relative flex flex-col">
        <div className="flex justify-between items-center">
          {/* <div className="text-3xl font-semibold">Search Text</div> */}
          <div className="flex gap-3">
            <Button
              onClick={goToCardArea}
              className="w-40 h-12 rounded-2xl !text-deepbg !bg-[#FFF3EE]"
            >
              <img src={logoCard} alt="" className="w-6 h-6 mr-2" />
              Card View
            </Button>
            {/* <Button
              onClick={goToSearchArea}
              className="w-40 h-12 rounded-2xl !text-white !bg-[#CB9180]"
            >
              <img src={logoSearch} alt="" className="w-6 h-6 mr-2" />
              Search
            </Button> */}
            <Button
              onClick={goToTrashArea}
              className="w-40 h-12 rounded-2xl !text-deepbg !bg-[#FFF3EE]"
            >
              <img src={logoTrash} alt="" className="w-6 h-6 mr-2" />
              Trash
            </Button>
          </div>
        </div>
        <div className="w-full relative flex items-center shadow-[0px_2px_5px_3px_rgba(0,0,0,0.04)] rounded-xl mt-3 p-2 px-4">
          <div>
            <img src={searchLogo} alt="search" className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={value}
              onChange={(e) => handleChange(e)}
              className="border-none outline-none w-full p-3"
            />
          </div>
          <div
            className="w-20 h-10 bg-[#CB9180] rounded flex items-center justify-center text-white font-semibold cursor-pointer"
            onClick={() =>
              debounceFilteCard("click", value, cardData, setFilteData)
            }
          >
            Search
          </div>
        </div>
        <div ref={containerRef} className="flex-1 overflow-auto mt-4">
          {" "}
          {/* 确保这个容器可以滚动 */}
          {filteData.map((cardList) => (
            <div
              key={cardList.id}
              className="filte-card w-full bg-[#FFF3EE] h-[80px] mb-4 rounded-xl flex justify-between items-center p-3"
            >
              <div className="text-xl font-semibold">Card {cardList.id}</div>
              <div
                className="p-3 shadow-lg rounded-xl cursor-pointer"
                onClick={() =>
                  revealDialog(
                    filteData.findIndex((item) => item.id === cardList.id)
                  )
                }
              >
                Go to Card {cardList.id}
              </div>
            </div>
          ))}
        </div>
      </div>
      {!isHidden && renderDialog()}
    </>
  );
}
