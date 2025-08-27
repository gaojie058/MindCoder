import { useEffect, useRef } from "react";

type DialogProps = {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
};

export default function Dialog({ children, className, onClose }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (dialogElement) {
      dialogElement.showModal();
    }

    // Close dialog when clicking on the backdrop (the dialog element itself)
    const handleBackdropClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target === dialogElement) {
        if (onClose) {
          onClose();
        }
      }
    };

    dialogElement?.addEventListener("click", handleBackdropClick);

    return () => {
      dialogElement?.removeEventListener("click", handleBackdropClick);
      dialogElement?.close();
    };
  }, [onClose]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <dialog
      className={`w-full fixed justify-center items-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-transparent outline-none ${
        className || ""
      } flex`}
      ref={dialogRef}
    >
      {children}
    </dialog>
  );
}
