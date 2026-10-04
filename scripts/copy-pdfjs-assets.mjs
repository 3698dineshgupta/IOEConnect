// Copies the pdf.js runtime assets the viewer needs into public/pdfjs so they are served
// same-origin and always match the installed pdfjs-dist version:
//   wasm/            JPEG2000 + JBIG2 + colour-management decoders (scanned PDFs are blank without these)
//   standard_fonts/  the 14 base fonts for PDFs that don't embed them
//   cmaps/           character maps for CJK / legacy encodings
//   iccs/            ICC colour profiles
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "pdfjs-dist");
const dest = join(root, "public", "pdfjs");

if (!existsSync(src)) {
  console.warn("[pdfjs-assets] pdfjs-dist is not installed yet; skipping");
  process.exit(0);
}
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const dir of ["wasm", "standard_fonts", "cmaps", "iccs"]) {
  if (existsSync(join(src, dir))) cpSync(join(src, dir), join(dest, dir), { recursive: true });
  else console.warn(`[pdfjs-assets] ${dir}/ not found in pdfjs-dist`);
}
console.log("[pdfjs-assets] copied to public/pdfjs");
