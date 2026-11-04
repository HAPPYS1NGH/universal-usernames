// Class strings for the controls that repeat across screens, after the Aave
// app: pill buttons, pill fields and an iOS-style segmented control. Presses
// scale to 0.96; hovers only change color, so nothing shifts layout.

const PILL = "inline-flex items-center justify-center gap-2 rounded-full font-[650] tracking-[-0.02em]";

export const PRIMARY_BUTTON = `${PILL} h-[3.25rem] bg-accent px-6 text-[1.0625rem] text-white transition-[background-color,color,scale] duration-150 ease-ios hover:bg-accent/90 active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-accent-soft disabled:text-accent-ink/55 disabled:active:scale-100`;

export const QUIET_BUTTON = `${PILL} h-12 bg-fill px-5 text-ink transition-[background-color,scale] duration-150 ease-ios hover:bg-fill-strong active:scale-[0.96]`;

// White circle that floats on the cream ground, for top-bar actions.
export const ICON_BUTTON =
  "grid size-11 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-raised transition-[scale,color] duration-150 ease-ios active:scale-[0.96]";

// The wrapper draws the focus ring, so the field reads as one control.
export const FIELD =
  "flex h-14 items-center gap-1 rounded-full bg-fill px-5 transition-colors duration-150 ease-out focus-within:bg-fill-strong has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ink";

// 17px keeps iOS from zooming into the field on focus.
export const FIELD_INPUT =
  "h-full w-full min-w-0 bg-transparent text-[1.0625rem] font-semibold tracking-[-0.01em] outline-none focus-visible:outline-none";

export const FIELD_AFFIX = "text-[1.0625rem] font-semibold text-faint";

export const SEGMENT_TRACK = "grid grid-cols-2 rounded-full bg-fill p-1";

export function segmentClasses(selected: boolean): string {
  return `h-11 rounded-full text-[0.9375rem] font-semibold transition-[background-color,color,box-shadow] duration-150 ease-out focus-visible:-outline-offset-2 ${
    selected ? "bg-surface text-ink shadow-raised" : "text-muted hover:text-ink"
  }`;
}
