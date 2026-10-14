/**
 * The postcard: the current view at high resolution with the OSS City and
 * Contributable marks, saved as a PNG.
 */

export interface PostcardOptions {
  /** Source canvas, drawn with preserveDrawingBuffer. */
  source: HTMLCanvasElement;
  caption: string;
  updated: string;
  /** Output width in pixels. */
  width?: number;
}

export function renderPostcard({ source, caption, updated, width = 2400 }: PostcardOptions): HTMLCanvasElement {
  const ratio = source.height / source.width;
  const w = width;
  const h = Math.round(width * ratio);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  if (!ctx) return out;
  ctx.drawImage(source, 0, 0, w, h);

  // A gentle vignette at the bottom so the marks always read.
  const grad = ctx.createLinearGradient(0, h * 0.7, 0, h);
  grad.addColorStop(0, "rgba(7,9,19,0)");
  grad.addColorStop(1, "rgba(7,9,19,0.85)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const pad = Math.round(w * 0.035);
  const unit = w / 1200;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f4f3ef";
  ctx.font = `600 ${Math.round(34 * unit)}px Inter, system-ui, sans-serif`;
  ctx.fillText("OSS City", pad, h - pad - Math.round(34 * unit));
  ctx.fillStyle = "rgba(244,243,239,0.75)";
  ctx.font = `400 ${Math.round(16 * unit)}px Inter, system-ui, sans-serif`;
  ctx.fillText(`${caption}. By Gati Varshney`, pad, h - pad);

  const right = "Powered by Contributable";
  const small = `contributable.vercel.app, updated ${updated}`;
  ctx.textAlign = "right";
  ctx.fillStyle = "#7fd9d0";
  ctx.font = `600 ${Math.round(16 * unit)}px Inter, system-ui, sans-serif`;
  ctx.fillText(right, w - pad, h - pad - Math.round(24 * unit));
  ctx.fillStyle = "rgba(244,243,239,0.6)";
  ctx.font = `400 ${Math.round(13 * unit)}px Inter, system-ui, sans-serif`;
  ctx.fillText(small, w - pad, h - pad);
  ctx.textAlign = "left";
  return out;
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
