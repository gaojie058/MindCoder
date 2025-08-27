import { useState, useEffect } from "react";

export default function useContainerDom(): HTMLDivElement | null {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = document.getElementById("main-layout") as HTMLDivElement;
    setContainer(container);
  }, []);

  return container;
}
