import type { ReactNode } from "react";
import { ChevronLeftIcon, CloseIcon } from "./icons";

const HEADER_BUTTON =
  "grid size-11 place-items-center rounded-full bg-fill text-ink transition-[background-color,scale] duration-150 ease-ios hover:bg-fill-strong active:scale-[0.96]";

// Sheet title row, like the Aave app's: a left-aligned title with a close
// button on the first step, a back button and a centered title after that.
export function SheetHeader({
  title,
  onBack,
  onClose,
}: {
  title: string;
  onBack?: () => void;
  onClose?: () => void;
}) {
  if (onBack) {
    return (
      <div className="grid min-h-14 grid-cols-[2.75rem_1fr_2.75rem] items-center px-3 pt-2">
        <button type="button" aria-label="Back" onClick={onBack} className={HEADER_BUTTON}>
          <ChevronLeftIcon className="size-5" />
        </button>
        <h2 className="text-center text-[1.0625rem] font-[650] tracking-[-0.024em] text-balance">{title}</h2>
      </div>
    );
  }
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 pt-2 pr-3 pl-5">
      <h2 className="text-[1.0625rem] font-[650] tracking-[-0.024em]">{title}</h2>
      {onClose && (
        <button type="button" aria-label="Close" onClick={onClose} className={HEADER_BUTTON}>
          <CloseIcon className="size-4" />
        </button>
      )}
    </div>
  );
}

// A tappable row in a sheet: white, hairline ring, icon then label.
export function SheetChoice({
  lead,
  label,
  onClick,
  disabled = false,
  className = "flex",
}: {
  lead: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${className} min-h-14 w-full items-center gap-3 rounded-2xl bg-surface px-4 text-left shadow-card transition-[background-color,scale] duration-150 ease-ios enabled:hover:bg-canvas enabled:active:scale-[0.98] disabled:text-muted`}
    >
      <span className="grid w-7 shrink-0 place-items-center text-muted">{lead}</span>
      <span className="text-[1.0625rem] font-[650] tracking-[-0.02em]">{label}</span>
    </button>
  );
}
