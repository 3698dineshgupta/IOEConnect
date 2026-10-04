// Premium-only Download / Print. Both go through GET /api/pdf/[id]/download, which re-checks the
// session and Premium status on the server and stamps every page with the downloader's email.

export class DownloadError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function fetchPdfBlob(resourceId: string): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(`/api/pdf/${encodeURIComponent(resourceId)}/download`, { credentials: "same-origin", cache: "no-store" });
  } catch {
    throw new DownloadError("NETWORK", "Network error. Check your connection and try again.");
  }
  if (!res.ok) {
    let code = "ERROR";
    let message = "Could not prepare the file. Please try again.";
    try {
      const j = (await res.json()) as { error?: { code?: string; message?: string } };
      code = j.error?.code ?? code;
      message = j.error?.message ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new DownloadError(code, message);
  }
  return res.blob();
}

function safeName(title: string): string {
  const clean = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "IOE Connect";
  return `${clean}.pdf`;
}

export async function downloadPdf(resourceId: string, title: string): Promise<void> {
  const blob = await fetchPdfBlob(resourceId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeName(title);
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Print through a hidden iframe so the viewer chrome never ends up on paper. */
export async function printPdf(resourceId: string): Promise<void> {
  const blob = await fetchPdfBlob(resourceId);
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";
  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
      URL.revokeObjectURL(url);
    }, 60_000);
  };
  await new Promise<void>((resolve) => {
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // Some browsers refuse to print a PDF inside an iframe: open it so the user can print from there.
        window.open(url, "_blank", "noopener");
      }
      cleanup();
      resolve();
    };
    iframe.src = url;
    document.body.appendChild(iframe);
  });
}
