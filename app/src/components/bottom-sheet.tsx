"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
};

// iOS-style sheet pinned to the bottom of the app column. A modal <dialog>
// traps focus, makes the page inert and returns focus on close for free.
// Motion lives in globals.css (.bottom-sheet).
export function BottomSheet({ open, onClose, label, children }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Clicks on the backdrop land on the dialog itself, outside its box.
  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return;
    const box = event.currentTarget.getBoundingClientRect();
    const inside =
      event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) onClose();
  }

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(event) => {
        // Escape: let React state close it, so open and the DOM never disagree.
        event.preventDefault();
        onClose();
      }}
      onClick={closeOnBackdrop}
      className="bottom-sheet fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[calc(100dvh-3rem)] w-full max-w-app flex-col overflow-hidden overscroll-contain rounded-t-sheet bg-surface p-0 pb-[env(safe-area-inset-bottom)] text-ink shadow-sheet open:flex"
    >
      {children}
    </dialog>
  );
}
