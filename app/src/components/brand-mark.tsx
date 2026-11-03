export function BrandMark({ brand }: { brand: string }) {
  return (
    <span
      aria-hidden
      className="grid size-8 place-items-center rounded-[0.625rem] bg-ink text-base font-bold leading-none text-canvas"
    >
      {brand.charAt(0).toUpperCase()}
    </span>
  );
}
