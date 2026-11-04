import { encode } from "uqr";
import { EthIcon } from "./icons";

// Modules hidden under the ETH mark in the middle. Error correction level Q
// recovers up to 25% of the code, and the gap covers about 6%.
const LOGO_MODULES = 9;

// One path for all dark modules, merging horizontal runs to keep it short.
function modulesPath(data: boolean[][], hidden: (x: number, y: number) => boolean): string {
  let path = "";
  data.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x] || hidden(x, y)) {
        x++;
        continue;
      }
      const start = x;
      while (x < row.length && row[x] && !hidden(x, y)) x++;
      path += `M${start} ${y}h${x - start}v1h${start - x}z`;
    }
  });
  return path;
}

// Server-rendered QR for an EIP-681 `ethereum:` URI, so a phone wallet can scan
// the deposit address off the screen or the projector.
export function AddressQr({ address, className = "size-44" }: { address: string; className?: string }) {
  const { size, data } = encode(`ethereum:${address}`, { ecc: "Q", border: 0 });
  const logoStart = Math.floor((size - LOGO_MODULES) / 2);
  const underLogo = (x: number, y: number) =>
    x >= logoStart && x < logoStart + LOGO_MODULES && y >= logoStart && y < logoStart + LOGO_MODULES;

  return (
    <div className={`relative ${className}`}>
      <svg
        role="img"
        aria-label={`QR code for ${address}`}
        viewBox={`0 0 ${size} ${size}`}
        shapeRendering="crispEdges"
        className="size-full text-ink"
      >
        <path d={modulesPath(data, underLogo)} fill="currentColor" />
      </svg>
      <span
        aria-hidden
        className="absolute inset-0 m-auto grid size-[18%] place-items-center rounded-full bg-surface shadow-card"
      >
        <EthIcon className="size-[70%]" />
      </span>
    </div>
  );
}
