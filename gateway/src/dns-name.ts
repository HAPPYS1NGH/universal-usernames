import { hexToBytes, type Hex } from "viem";

const utf8 = new TextDecoder("utf-8", { fatal: true });

/**
 * Decodes a DNS wire-format name, the format ENSIP-10 `resolve(name, data)`
 * receives. Each label is prefixed by its length and the name ends with a
 * zero byte: 0x05"happy" 0x08"tradepit" 0x03"eth" 0x00 -> ["happy", "tradepit", "eth"].
 *
 * Throws on malformed input.
 */
export function decodeDnsName(encoded: Hex): string[] {
  const bytes = hexToBytes(encoded);
  const labels: string[] = [];
  let offset = 0;

  while (offset < bytes.length) {
    const length = bytes[offset];
    if (length === 0) {
      if (offset !== bytes.length - 1) throw new Error("unexpected bytes after the end of the name");
      return labels;
    }

    const start = offset + 1;
    const end = start + length;
    if (end > bytes.length) throw new Error("a label runs past the end of the name");

    const label = utf8.decode(bytes.subarray(start, end));
    // A dot inside a label would make "a.b" and ["a", "b"] look the same.
    if (label.includes(".")) throw new Error("a label contains a dot");

    labels.push(label);
    offset = end;
  }

  throw new Error("the name is missing its terminating zero byte");
}
