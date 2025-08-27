import { useEffect, useRef } from "react";
import logoLeft from "@/assets/loading-left.png";
import logoRight from "@/assets/loading-right.png";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

type LoadingProps = {
  progress: string;
};

function adjustScales(array: [], activeIndex: number) {
  for (let i = 0; i < array.length; i++) {
    let scale: number;
    if (i === activeIndex) scale = 1.4;
    else if (Math.abs(i - activeIndex) === 1) scale = 0.9;
    else if (Math.abs(i - activeIndex) === 2) scale = 0.7;
    else scale = 0.5;

    gsap.to(array[i], {
      duration: 0.6,
      scale: scale,
      ease: "back.out",
    });
  }
}

export default function Loading({ progress }: LoadingProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 0.5,
        yoyo: true,
      });

      const circle = gsap.utils.toArray(".circle") as [];

      for (let i = 0; i < circle.length; i++) {
        tl.add(() => adjustScales(circle, i), i * 0.6);
      }
    },
    { scope: containerRef }
  );

  return (
    <dialog
      className="w-full h-full fixed top-0 left-0 flex justify-center items-center bg-transparent"
      ref={dialogRef}
    >
      <div className="transform scale-50 justify-center items-center">
        <div className="flex justify-center items-center">
          <div className="w-1/3 flex justify-center items-center relative">
            <img src={logoLeft} alt="logo" />
          </div>
          <div
            className="w-1/3 flex-1 flex justify-center items-center gap-8"
            ref={containerRef}
          >
            <div className="active circle w-16 h-16 rounded-full bg-[#C66B50]"></div>
            <div className="circle w-16 h-16 rounded-full bg-[#FFB65E]"></div>
            <div className="circle w-16 h-16 rounded-full bg-[#C66B50]"></div>
            <div className="circle w-16 h-16 rounded-full bg-[#FFB65E]"></div>
          </div>
          <div className="w-1/3 flex justify-center items-center">
            <img src={logoRight} alt="logo" />
          </div>
        </div>
      </div>
      {/* Progress - moved outside the scaled container */}
      <p className="absolute bottom-1/4 text-center text-lg font-semibold text-[#8E422C]">
        {progress}
      </p>
    </dialog>
  );
}
