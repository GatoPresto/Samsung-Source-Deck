// Turning a downloaded picture into something cheap to keep and to draw on the TV: at most 1920x1080, JPEG.
/** Decode `blob`, shrink it to fit 1920x1080 (never enlarge) and return a JPEG blob (~200-500 KB). */
export const toBackgroundJpeg = (blob, quality = 0.85) => shrinkToJpeg(blob, 1920, 1080, quality);
/** A small JPEG (480x270 at most) for the Starred grid. */
export const toThumbJpeg = blob => shrinkToJpeg(blob, 480, 270, 0.8);

function shrinkToJpeg(blob, MAX_W, MAX_H, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_W / img.naturalWidth, MAX_H / img.naturalHeight);
        const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob(out => { URL.revokeObjectURL(url); out ? resolve(out) : reject(new Error("could not encode the image")); }, "image/jpeg", quality);
      } catch (error) { URL.revokeObjectURL(url); reject(error); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("not a readable image")); };
    img.src = url;
  });
}
