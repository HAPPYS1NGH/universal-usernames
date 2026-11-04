export function BrandMark({ brand }: { brand: string }) {
  return (
    <span
      aria-hidden
      className="grid size-9 place-items-center rounded-[0.75rem] bg-accent text-[1.0625rem] font-[750] leading-none text-white"
    >
      {brand.charAt(0).toUpperCase()}
    </span>
  );
}
