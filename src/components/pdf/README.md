# Secure PDF viewer

`PdfViewer` renders PDFs to `<canvas>` with pdf.js. It gets a short-lived token from `POST /api/pdf/[id]/token` and pulls byte ranges from `GET /api/pdf/stream` through a custom `PDFDataRangeTransport` (see `pdf-loader.ts`). The token travels only in the `X-PDF-Token` request header, never in a URL. When it expires, the viewer fetches a new one without interrupting reading.

## What this protects, and what it cannot

Browser viewing **cannot be absolute DRM**. Any file a browser can display can be captured by a determined user, through screenshots, screen recording, devtools or memory inspection. The protections here are friction and deterrence, not guarantees:

- Free members and guests are view-only: no download or print buttons, Ctrl/Cmd+S and Ctrl/Cmd+P are intercepted (they show a Premium hint), and a print stylesheet hides the viewer.
- **Premium members and admins** (`canDownloadPdf` in `src/lib/access.ts`) get Download and Print in the toolbar, and Ctrl/Cmd+S / Ctrl/Cmd+P trigger them. Both call `GET /api/pdf/[id]/download`, which re-checks the session, Premium status and resource access on every request, is limited to 30 per user per hour, and stamps every page with `Downloaded by <email> - IOE Connect - <date>` (`src/lib/pdf-stamp.ts`) so a leaked copy traces back to the account. If a PDF cannot be re-written for stamping it is served as-is and the failure is logged.
- The context menu, dragging and copy are disabled, and the viewer uses `user-select: none`. There is no text layer, so page text cannot be selected.
- A faint watermark with the viewer's email is drawn over every page, so leaked screenshots can be traced.
- The file is served only to an authorized session, through a token bound to the resource, the user and the session, valid for minutes. The Telegram URL and file ids never reach the browser. Responses use `Cache-Control: private, no-store`.

Watermarks and server-side access control are the parts that actually matter. Treat everything else as a speed bump.
