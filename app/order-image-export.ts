/** Freeze responsive document units before the SVG/foreignObject PNG capture. */
export async function orderDocumentImageBlob(node: HTMLElement): Promise<Blob> {
  await document.fonts.ready;
  await Promise.all(Array.from(node.querySelectorAll("img"), image => image.decode()));
  const previousUnit = node.style.getPropertyValue("--order-unit");
  const previousPriority = node.style.getPropertyPriority("--order-unit");
  const width = Math.round(node.getBoundingClientRect().width);
  if (width <= 0) throw new Error("La orden no tiene un ancho válido");
  try {
    node.style.setProperty("--order-unit", `${width / 100}px`);
    // Force layout after resolving container-relative units, including long orders.
    const height = Math.ceil(Math.max(node.scrollHeight, node.getBoundingClientRect().height));
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(node, {
      width, height, pixelRatio: 2, backgroundColor: "#fff", skipFonts: true,
      style: { width: `${width}px`, height: `${height}px`, margin: "0", boxShadow: "none" },
    });
    if (!blob) throw new Error("No se pudo generar la imagen del pedido");
    return blob;
  } finally {
    if (previousUnit) node.style.setProperty("--order-unit", previousUnit, previousPriority);
    else node.style.removeProperty("--order-unit");
  }
}
