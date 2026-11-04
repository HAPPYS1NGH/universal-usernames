// The app's icon set: 24px grid, 1.75px rounded strokes (close to the Aave
// app's iOS weight), currentColor. Icons are always decorative here; the
// control or text next to them carries the name.

type IconProps = { className?: string };

function StrokeIcon({ className = "size-6", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

export function TradeIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </StrokeIcon>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M17 8V6a2 2 0 0 0-2-2H6a3 3 0 0 0-3 3" />
      <rect x="3" y="8" width="18" height="12" rx="3" />
      <path d="M16.5 14h.01" strokeWidth={3} />
    </StrokeIcon>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M16 6h3v1a3 3 0 0 1-3 3M8 6H5v1a3 3 0 0 0 3 3" />
      <path d="M12 13v7M8 20h8" />
    </StrokeIcon>
  );
}

export function SignOutIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M9 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3" />
      <path d="M16 16l4-4-4-4M20 12H9" />
    </StrokeIcon>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </StrokeIcon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </StrokeIcon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16.5h.01" />
    </StrokeIcon>
  );
}

export function ArrowUpRightIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M7 17L17 7M8 7h9v9" />
    </StrokeIcon>
  );
}

export function ArrowDownLeftIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M17 7L7 17M16 17H7V8" />
    </StrokeIcon>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M12 4v16M6 14l6 6 6-6" />
    </StrokeIcon>
  );
}

export function EthIcon({ className = "size-6" }: IconProps) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className={`shrink-0 ${className}`}>
      <path d="M12 2.5 6.25 12 12 15.4 17.75 12z" />
      <path d="M12 16.5 6.25 13.1 12 21.5l5.75-8.4z" opacity={0.7} />
    </svg>
  );
}
