export function BrandMark({ brand }: { brand: string }) {
  return (
    <span
      aria-hidden
      className="grid size-9 place-items-center rounded-lg bg-ink text-lg font-bold leading-none text-surface"
    >
      {brand.charAt(0).toUpperCase()}
    </span>
  );
}
