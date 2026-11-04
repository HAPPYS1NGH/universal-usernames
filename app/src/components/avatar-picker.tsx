"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent, type ReactNode } from "react";
import { chooseEmojiAvatar, resetAvatar, uploadAvatarPhoto } from "@/app/avatar-actions";
import { IDLE_FORM_STATE, type FormState } from "@/app/form-state";
import { AVATAR_PHOTO_TYPES } from "@/lib/avatars/avatar-rules";
import { AVATAR_COLORS, AVATAR_EMOJIS, STARTER_EMOJI } from "@/lib/avatars/emoji-catalog";
import { preparePhoto } from "@/lib/avatars/photo-resize";
import { AvatarFace, type AvatarFaceData } from "./avatar-face";
import { BottomSheet } from "./bottom-sheet";
import { FIELD, FIELD_INPUT, PRIMARY_BUTTON } from "./control-styles";
import { FormMessage } from "./form-message";
import { CameraIcon, PencilIcon, PhotoIcon, SearchIcon } from "./icons";
import { SheetChoice, SheetHeader } from "./sheet-parts";

// The Aave app's avatar flow: pick a source, then either a photo or an emoji
// on a colored circle, with a searchable emoji grid one level deeper.
type Step = "source" | "emoji" | "browse" | "photo";

const DEPTH: Record<Step, number> = { source: 0, emoji: 1, photo: 1, browse: 2 };
const TITLES: Record<Step, string> = {
  source: "Your avatar",
  emoji: "Use emoji",
  browse: "Choose an emoji",
  photo: "Use photo",
};
const ACCEPT = AVATAR_PHOTO_TYPES.join(",");
const SAVE_FAILED: FormState = { status: "error", message: "Couldn't save your avatar. Check your connection and try again." };

type AvatarPickerProps = {
  username: string;
  current: AvatarFaceData;
  generated: AvatarFaceData;
  // The trigger's content: the avatar as the header shows it.
  children: ReactNode;
};

export function AvatarPicker({ username, current, generated, children }: AvatarPickerProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("source");
  const [move, setMove] = useState<"forward" | "back">();
  const [emoji, setEmoji] = useState(STARTER_EMOJI);
  const [query, setQuery] = useState("");
  const [photo, setPhoto] = useState<{ file: File; src: string } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [message, setMessage] = useState<FormState>(IDLE_FORM_STATE);
  const [pending, startTransition] = useTransition();
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Each preview URL is released once it's replaced or the picker unmounts.
  useEffect(() => {
    if (!photo) return;
    return () => URL.revokeObjectURL(photo.src);
  }, [photo]);

  // A precise pointer gets the search box focused; on phones the keyboard
  // would cover half the grid.
  useEffect(() => {
    if (step === "browse" && window.matchMedia("(pointer: fine)").matches) searchRef.current?.focus();
  }, [step]);

  function go(next: Step) {
    setMove(DEPTH[next] < DEPTH[step] ? "back" : "forward");
    setStep(next);
    setMessage(IDLE_FORM_STATE);
  }

  function openPicker() {
    setStep("source");
    setMove(undefined);
    setMessage(IDLE_FORM_STATE);
    setQuery("");
    setPhoto(null);
    setEmoji(current.kind === "emoji" ? { emoji: current.emoji, color: current.color } : STARTER_EMOJI);
    setOpen(true);
  }

  async function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPreparing(true);
    const prepared = await preparePhoto(file);
    setPreparing(false);
    if (!prepared.ok) {
      setMessage({ status: "error", message: prepared.error });
      return;
    }
    setPhoto({ file: prepared.file, src: URL.createObjectURL(prepared.file) });
    go("photo");
  }

  function save(action: () => Promise<FormState>) {
    startTransition(async () => {
      let result: FormState;
      try {
        result = await action();
      } catch {
        // Network failures and oversized request bodies throw instead of returning.
        result = SAVE_FAILED;
      }
      if (result.status === "error") setMessage(result);
      else setOpen(false);
    });
  }

  function savePhoto() {
    if (!photo) return;
    const data = new FormData();
    data.append("photo", photo.file);
    save(() => uploadAvatarPhoto(data));
  }

  const search = query.trim().toLowerCase();
  const matches = search
    ? AVATAR_EMOJIS.filter((item) => item.name.includes(search) || item.char === search)
    : AVATAR_EMOJIS;
  const tall = step === "emoji" || step === "browse";

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        aria-label="Change your avatar"
        aria-haspopup="dialog"
        className="shrink-0 rounded-full transition-[scale] duration-150 ease-ios active:scale-[0.96]"
      >
        {children}
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} label={TITLES[step]}>
        <div
          key={step}
          data-move={move}
          className={`flex min-h-0 flex-col data-[move=back]:animate-[step-back_220ms_var(--ease-ios)] data-[move=forward]:animate-[step-forward_280ms_var(--ease-ios)] ${
            tall ? "h-[min(38rem,calc(100dvh-3rem))]" : ""
          }`}
        >
          {step === "source" && (
            <>
              <SheetHeader title={TITLES.source} onClose={() => setOpen(false)} />
              <div className="flex flex-col items-center gap-2 pt-1 pb-5">
                <AvatarFace face={current} size="lg" />
                <p className="text-[1.0625rem] font-[650] tracking-[-0.02em]">@{username}</p>
              </div>
              <div className="flex flex-col gap-2.5 px-4 pb-5">
                {/* Phones open the camera; on a desktop it would only repeat "Choose photo". */}
                <SheetChoice
                  className="hidden pointer-coarse:flex"
                  lead={<CameraIcon className="size-[1.375rem]" />}
                  label="Take photo"
                  onClick={() => cameraRef.current?.click()}
                  disabled={preparing || pending}
                />
                <SheetChoice
                  lead={<PhotoIcon className="size-[1.375rem]" />}
                  label={preparing ? "Preparing photo…" : "Choose photo"}
                  onClick={() => libraryRef.current?.click()}
                  disabled={preparing || pending}
                />
                <SheetChoice
                  lead={<span className="text-[1.25rem] leading-none">😀</span>}
                  label="Choose emoji"
                  onClick={() => go("emoji")}
                  disabled={preparing || pending}
                />
                {current.kind !== "initial" && (
                  <SheetChoice
                    lead={<AvatarFace face={generated} size="xs" />}
                    label={pending ? "Saving…" : "Use generated avatar"}
                    onClick={() => save(resetAvatar)}
                    disabled={preparing || pending}
                  />
                )}
                <FormMessage state={message} />
              </div>
            </>
          )}

          {step === "emoji" && (
            <>
              <SheetHeader title={TITLES.emoji} onBack={() => go("source")} />
              <div className="flex justify-center pt-3">
                <div className="relative">
                  <AvatarFace face={{ kind: "emoji", ...emoji }} size="xl" />
                  <button
                    type="button"
                    aria-label="Choose an emoji"
                    onClick={() => go("browse")}
                    className="absolute -right-0.5 -bottom-0.5 grid size-10 place-items-center rounded-full bg-surface shadow-raised transition-[scale] duration-150 ease-ios active:scale-[0.96]"
                  >
                    <PencilIcon className="size-[1.125rem]" />
                  </button>
                </div>
              </div>
              <div
                role="group"
                aria-label="Background color"
                className="grid grid-cols-5 justify-items-center gap-x-2 gap-y-3.5 px-6 pt-6 pb-4"
              >
                {AVATAR_COLORS.map((color) => {
                  const selected = emoji.color === color.value;
                  return (
                    <button
                      key={color.value}
                      type="button"
                      aria-label={color.name}
                      aria-pressed={selected}
                      onClick={() => setEmoji((previous) => ({ ...previous, color: color.value }))}
                      style={{
                        background: color.value,
                        boxShadow: selected ? `0 0 0 2px var(--color-surface), 0 0 0 4px ${color.value}` : undefined,
                      }}
                      className="size-11 rounded-full transition-[box-shadow,scale] duration-150 ease-ios active:scale-[0.96]"
                    />
                  );
                })}
              </div>
              <div className="mt-auto flex flex-col gap-3 px-4 pb-5">
                <FormMessage state={message} />
                <button
                  type="button"
                  onClick={() => save(() => chooseEmojiAvatar(emoji.emoji, emoji.color))}
                  disabled={pending}
                  className={`${PRIMARY_BUTTON} w-full`}
                >
                  {pending ? "Saving…" : "Save avatar"}
                </button>
              </div>
            </>
          )}

          {step === "browse" && (
            <>
              <SheetHeader title={TITLES.browse} onBack={() => go("emoji")} />
              <div className="px-4 pt-1 pb-3">
                <label className={`${FIELD} h-12 gap-2.5 px-4`}>
                  <SearchIcon className="size-5 text-faint" />
                  <span className="sr-only">Search emojis</span>
                  <input
                    ref={searchRef}
                    type="search"
                    placeholder="Search emojis"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className={FIELD_INPUT}
                  />
                </label>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-5">
                {matches.length === 0 ? (
                  <p className="px-2 pt-6 text-center text-[0.9375rem] font-medium text-muted">
                    No emoji matches “{query.trim()}”.
                  </p>
                ) : (
                  <div className="grid grid-cols-8 gap-0.5">
                    {matches.map((item) => (
                      <button
                        key={item.char}
                        type="button"
                        aria-label={item.name}
                        aria-pressed={emoji.emoji === item.char}
                        onClick={() => {
                          setEmoji((previous) => ({ ...previous, emoji: item.char }));
                          go("emoji");
                        }}
                        className="grid aspect-square place-items-center rounded-xl text-[1.625rem] leading-none transition-[background-color,scale] duration-150 ease-ios hover:bg-fill active:scale-[0.9] aria-pressed:bg-fill"
                      >
                        {item.char}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {step === "photo" && photo && (
            <>
              <SheetHeader title={TITLES.photo} onBack={() => go("source")} />
              <div className="flex justify-center pt-3 pb-6">
                <AvatarFace face={{ kind: "photo", src: photo.src }} size="xl" />
              </div>
              <div className="flex flex-col gap-3 px-4 pb-5">
                <FormMessage state={message} />
                <button type="button" onClick={savePhoto} disabled={pending} className={`${PRIMARY_BUTTON} w-full`}>
                  {pending ? "Saving…" : "Save avatar"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Inside the dialog: everything outside a modal dialog is inert. */}
        <input ref={cameraRef} type="file" accept={ACCEPT} capture="user" hidden onChange={pickFile} />
        <input ref={libraryRef} type="file" accept={ACCEPT} hidden onChange={pickFile} />
      </BottomSheet>
    </>
  );
}
