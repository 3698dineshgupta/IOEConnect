# `POST /api/admin/upload`: contract for the admin upload wizard

The route stores an admin's PDF. It validates the file, compresses it with iLovePDF, uploads it to Telegram and saves the `resources` row. By default it streams progress as NDJSON.

## Request

- `multipart/form-data`, sent with the admin's normal cookie session (`fetch(..., { credentials: "same-origin" })`).
- Add `?stream=0` to the URL to get one JSON response at the end instead of a stream.

| field | create | replace | notes |
| --- | --- | --- | --- |
| `file` | required | required | The PDF. Its size is limited by `site_settings.resources.max_upload_mb`. |
| `resource_id` | â€” | **required** | Its presence switches the request to replace mode. |
| `subject_id` | required (uuid) | optional | |
| `resource_type` | required | optional | `NOTES\|PYQ\|REFERENCE\|LAB\|SYLLABUS\|OTHER` |
| `access_type` | required | optional | `FREE\|PREMIUM` |
| `title` | required (2â€“200) | optional | |
| `description` | optional | optional | An empty string becomes `null`. |
| `available_years` | optional | optional | Repeat the field, or send a JSON array (`[2079,2080]`) or `"2079,2080"`. Ints 1950â€“2200. If it is empty, the years come from the keys of `year_page_ranges`. |
| `year_page_ranges` | optional | optional | A JSON object string: `{"2079":[1,4],"2080":[5,9]}`. Keys are 4-digit years. Each value is `[start,end]`, 1-based and inclusive, with `end <= pageCount`. |
| `exam_type` | optional | optional | Free text, at most 60 characters (e.g. `Regular`, `Back`). |

**Replace mode** first stores the new file, then updates the row in a single step. Only the fields you send are overwritten. The old Telegram message is deleted on a best-effort basis. A resource whose row is `PROCESSING` cannot be replaced (`409 RESOURCE_BUSY`).

## Errors before streaming starts (plain JSON, never a redirect)

Shape: `{ "error": { "code", "message", ...extra }, "code" }`

| status | code |
| --- | --- |
| 401 | `UNAUTHENTICATED` |
| 403 | `FORBIDDEN` (not an admin, or a cross-site request) |
| 400 | `BAD_FORM`, `FILE_REQUIRED`, `VALIDATION_FAILED` (`extra.issues: [{field, message}]`), `PDF_EMPTY`, `PDF_BAD_MIME`, `PDF_NOT_PDF`, `PDF_TRUNCATED`, `PDF_UNREADABLE` |
| 404 | `RESOURCE_NOT_FOUND` |
| 409 | `RESOURCE_BUSY` |
| 413 | `FILE_TOO_LARGE`, `PDF_TOO_LARGE` |
| 429 | `RATE_LIMITED` (`extra.retryAfter` in seconds, plus a `Retry-After` header). Limits: 60 uploads per 10 minutes and at most 2 running at once, per admin. |
| 500 | `SERVER_ERROR` |

Check `res.headers.get("content-type")`. `application/json` means one of the errors above. `application/x-ndjson` means a stream.

## NDJSON stream (`200`, `Content-Type: application/x-ndjson; charset=utf-8`)

The stream is one JSON object per line, ending in `\n`. Events arrive in this order:

```jsonc
{"type":"stage","stage":"validated","pageCount":42,"originalSize":10485760,"warnings":[]}
{"type":"stage","stage":"compressed","compressionStatus":"compressed","originalSize":10485760,"compressedSize":4194304,"savedPercent":60}
//   with a fallback: "compressionStatus":"fallback_original","compressedSize":<original>,"savedPercent":0,"warning":"Compression failed (...); the original file was stored."
{"type":"stage","stage":"uploaded"}
{"type":"stage","stage":"saved","resourceId":"<uuid>","status":"PUBLISHED"}
{"type":"result","result":{ /* UploadResult, see below */ }}
```

Two other events can appear:

- `{"type":"ping"}` is sent about every 10 s as a keep-alive. Ignore it.
- `{"type":"error","stage":"compressing"|"uploading"|"saving","code":"...","message":"...","resourceId":"<uuid>?"}` is terminal. No `result` follows it.
  - Codes: `FILE_TOO_LARGE_FOR_STORAGE`, `STORAGE_NOT_CONFIGURED`, `STORAGE_UPLOAD_FAILED`, `DB_INSERT_FAILED`, `DB_UPDATE_FAILED`, `SERVER_ERROR`.
  - In create mode, `resourceId` is the row now marked `FAILED`. Any Telegram message that was already uploaded has been deleted.

`UploadResult` (also the body of `?stream=0` responses):

```ts
{
  resourceId: string;
  replaced: boolean;
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED"; // a replace keeps DRAFT/ARCHIVED
  originalSize: number;        // bytes
  compressedSize: number;      // bytes actually stored (equals originalSize on fallback)
  savedPercent: number;        // 0..100, one decimal
  // "skipped" = file is 20 MB or smaller, so it is stored as-is (no warning).
  compressionStatus: "compressed" | "fallback_original" | "skipped";
  warnings: string[];          // show these to the admin
  pageCount: number;
}
```

### Reading the stream in the wizard

```ts
const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
if (!res.headers.get("content-type")?.includes("ndjson")) throw await res.json(); // { error: { code, message } }
const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
let buf = "";
for (;;) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += value;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
    if (!line) continue;
    const ev = JSON.parse(line);
    if (ev.type === "stage") setStage(ev.stage, ev);
    else if (ev.type === "result") onDone(ev.result);
    else if (ev.type === "error") onError(ev);
  }
}
```

Upload progress (bytes sent) is not part of this stream. To show it, send the request with `XMLHttpRequest` and read `upload.onprogress`. Parse `xhr.responseText` incrementally in `onprogress` for the NDJSON lines.

## Limits to know

- **Telegram cloud Bot API:** uploads are capped at 50 MB and `getFile` downloads at **20 MB**. The route refuses to store a file larger than 20 MB *after compression* (`FILE_TOO_LARGE_FOR_STORAGE`), because a larger file could never be served. A self-hosted Bot API server lifts both limits: set `TELEGRAM_API_BASE`, `TELEGRAM_MAX_UPLOAD_MB` and `TELEGRAM_MAX_DOWNLOAD_MB`.
- **Request body size and middleware:** `src/middleware.ts` runs on `/api/admin/upload`. While middleware is active, Next.js buffers request bodies up to `experimental.proxyClientMaxBodySize`, which defaults to **10 MB**. Anything larger is cut off, and the multipart parse fails with `BAD_FORM`. Uploads over 10 MB need one of two fixes, owned by the core and config owners:
  - set `experimental: { proxyClientMaxBodySize: "60mb" }` in `next.config.ts`, or
  - exclude `api/admin/upload` from the middleware matcher. The route does its own auth.
- **Admin bulk upload (`/admin/bulk-upload`) auto-splits** any PDF above 19 MiB in the browser (`src/lib/pdf-split.ts`, pdf-lib, in a Web Worker with a main-thread fallback) into parts of at most 18 MiB (or 95% of `max_upload_mb` if lower). Each part is a separate request and resource titled `<title> — Part i of n`, so this route never sees a file it would have to compress or refuse.
- `maxDuration = 300`. Hosts with shorter function limits may cut off very large uploads.
- Compression runs only if `site_settings.resources.compress_pdfs` is true and `ILOVEPDF_PUBLIC_KEY` is set. If compression fails for any reason, the original file is stored and a warning is returned.
