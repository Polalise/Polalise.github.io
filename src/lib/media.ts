export function projectImageSrcSet(source: string, originalWidth = 1600) {
  const extensionIndex = source.lastIndexOf(".webp");
  if (extensionIndex === -1) return undefined;
  const stem = source.slice(0, extensionIndex);
  return `${stem}-480w.webp 480w, ${stem}-960w.webp 960w, ${source} ${originalWidth}w`;
}
