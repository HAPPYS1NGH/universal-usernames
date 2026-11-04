import Image from "next/image";

// One avatar, already resolved to what it looks like. Plain data, so server
// pages and the client-side picker render avatars the same way.
export type AvatarFaceData =
  | { kind: "emoji"; emoji: string; color: string }
  | { kind: "photo"; src: string }
  | { kind: "initial"; initial: string; gradient: string };

// In rem, so avatars scale with the projector root size like everything else.
const SIZE_REM = { xs: 1.75, sm: 2.5, lg: 5.75, xl: 7 } as const;

export type AvatarSize = keyof typeof SIZE_REM;

export function AvatarFace({ face, size = "sm" }: { face: AvatarFaceData; size?: AvatarSize }) {
  const rem = SIZE_REM[size];
  const box = { width: `${rem}rem`, height: `${rem}rem` };

  if (face.kind === "photo") {
    const pixels = Math.round(rem * 16 * 2);
    return (
      <Image
        src={face.src}
        alt=""
        width={pixels}
        height={pixels}
        unoptimized
        style={box}
        className="shrink-0 rounded-full bg-fill object-cover outline-1 -outline-offset-1 outline-black/10"
      />
    );
  }

  if (face.kind === "emoji") {
    return (
      <span
        aria-hidden
        style={{ ...box, background: face.color, fontSize: `${rem * 0.52}rem` }}
        className="grid shrink-0 place-items-center rounded-full leading-none select-none"
      >
        {face.emoji}
      </span>
    );
  }

  return (
    <span
      aria-hidden
      style={{ ...box, backgroundImage: face.gradient, fontSize: `${rem * 0.42}rem` }}
      className="grid shrink-0 place-items-center rounded-full font-bold text-white select-none"
    >
      {face.initial}
    </span>
  );
}
