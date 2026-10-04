import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/** Keep only characters the built-in Helvetica (WinAnsi) font can draw. */
function printable(text: string): string {
  return text.replace(/[^\x20-\x7e]/g, "?").slice(0, 160);
}

/**
 * Stamp a small footer line on every page ("Downloaded by <email> · IOE Connect · <date>").
 * Downloads are a Premium feature; the stamp makes a leaked copy traceable to the account that
 * downloaded it. Throws if the PDF cannot be parsed; callers decide whether to fall back.
 */
export async function stampPdf(bytes: Uint8Array, label: string): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const text = printable(label);
  const size = 7;
  for (const page of doc.getPages()) {
    const box = page.getMediaBox();
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: box.x + Math.max(8, (box.width - width) / 2),
      y: box.y + 10,
      size,
      font,
      color: rgb(0.42, 0.45, 0.5),
      opacity: 0.85,
    });
  }
  return doc.save({ useObjectStreams: true });
}
