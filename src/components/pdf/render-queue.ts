// Caps how many pdf.js renders run at once. Newest request first (LIFO), so after a fast
// scroll the pages now on screen render before the ones the reader already passed.

export type Release = () => void;
export type Acquire = (signal: AbortSignal) => Promise<Release>;

const aborted = () => new DOMException("Render cancelled", "AbortError");

export function createLimiter(max: number): Acquire {
  let running = 0;
  const queue: Array<() => void> = [];
  const pump = () => {
    while (running < max && queue.length) {
      running++;
      queue.pop()!();
    }
  };
  return (signal) =>
    new Promise<Release>((resolve, reject) => {
      if (signal.aborted) return reject(aborted());
      const start = () => {
        if (signal.aborted) {
          running--;
          reject(aborted());
          pump();
          return;
        }
        let done = false;
        resolve(() => {
          if (done) return;
          done = true;
          running--;
          pump();
        });
      };
      queue.push(start);
      signal.addEventListener(
        "abort",
        () => {
          const i = queue.indexOf(start);
          if (i >= 0) {
            queue.splice(i, 1);
            reject(aborted());
          }
        },
        { once: true },
      );
      pump();
    });
}

/** Main pages: two at a time keeps scrolling smooth on phones. */
export const acquirePageRender = createLimiter(2);
/** Thumbnails: one at a time, so they never compete hard with the page being read. */
export const acquireThumbRender = createLimiter(1);

export const isCancel = (err: unknown) => {
  const name = (err as { name?: string } | null)?.name;
  return name === "AbortError" || name === "RenderingCancelledException";
};
