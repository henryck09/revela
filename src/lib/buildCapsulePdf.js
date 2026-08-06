import { jsPDF } from "jspdf";
import { formatDate, yearsSince } from "./capsuleConfig";

const ACCENT_RGB = {
  C9973F: [201, 151, 63],
  C46B79: [196, 107, 121],
  "6B8F6B": [107, 143, 107],
};
const INK = [48, 38, 77];
const MUTED = [117, 107, 145];
const CREAM = [253, 248, 237];

function hexToRgb(hex) {
  return ACCENT_RGB[hex] || [107, 143, 107];
}

async function urlToDataUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ dataUrl: reader.result, type: blob.type });
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function pageBackground(doc, w, h, accent) {
  doc.setFillColor(...CREAM);
  doc.rect(0, 0, w, h, "F");
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.6);
  doc.roundedRect(6, 6, w - 12, h - 12, 4, 4, "S");
}

function footer(doc, w, h, accent) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...accent);
  doc.text("R E V E L A", w / 2, h - 12, { align: "center" });
}

/**
 * Genera un PDF (formato A5, tipo "tarjeta") con el mensaje, la fecha,
 * cada foto con su texto, y el cierre — una versión imprimible/guardable
 * de la cápsula completa. Devuelve un Blob listo para descargar o compartir.
 */
export async function buildCapsulePdf(order, meta, accentHex) {
  const accent = hexToRgb(accentHex);
  const w = 148, h = 210; // A5 en mm, formato tarjeta vertical
  const doc = new jsPDF({ unit: "mm", format: [w, h] });
  const marginX = 16;
  const usableW = w - marginX * 2;

  // ---- Portada: mensaje principal ----
  pageBackground(doc, w, h, accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...accent);
  doc.text(meta.label.toUpperCase(), w / 2, 28, { align: "center" });

  const years = yearsSince(order.special_date);
  const showYears = order.special_date && (order.occasion === "cumpleanos" || order.occasion === "aniversario");
  if (order.special_date) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    const dateLine = `${formatDate(order.special_date)}${showYears && years !== null ? `  ·  ${years} ${years === 1 ? "año" : "años"}` : ""}`;
    doc.text(dateLine, w / 2, 36, { align: "center" });
  }

  doc.setFont("times", "italic");
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  const mainLines = doc.splitTextToSize(order.main_text || "", usableW);
  doc.text(mainLines, w / 2, 60, { align: "center", lineHeightFactor: 1.6 });

  footer(doc, w, h, accent);

  // ---- Una página por foto ----
  const photos = order.photos || [];
  for (let i = 0; i < photos.length; i++) {
    const ph = photos[i];
    doc.addPage([w, h]);
    pageBackground(doc, w, h, accent);
    try {
      const { dataUrl, type } = await urlToDataUrl(ph.url);
      const format = type.includes("png") ? "PNG" : "JPEG";
      const img = new Image();
      await new Promise((resolve) => { img.onload = resolve; img.src = dataUrl; });
      const maxW = usableW;
      const maxH = h - 70;
      let iw = img.width, ih = img.height;
      const scale = Math.min(maxW / iw, maxH / ih);
      iw *= scale; ih *= scale;
      const x = (w - iw) / 2;
      const y = 26;
      doc.addImage(dataUrl, format, x, y, iw, ih, undefined, "FAST");
      if (ph.caption) {
        doc.setFont("times", "italic");
        doc.setFontSize(11);
        doc.setTextColor(...INK);
        const capLines = doc.splitTextToSize(ph.caption, usableW);
        doc.text(capLines, w / 2, y + ih + 12, { align: "center", lineHeightFactor: 1.5 });
      }
    } catch (e) {
      console.error("No se pudo incluir la foto", i, e);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text("(no se pudo cargar esta foto)", w / 2, h / 2, { align: "center" });
    }
    footer(doc, w, h, accent);
  }

  // ---- Cierre ----
  doc.addPage([w, h]);
  pageBackground(doc, w, h, accent);
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  const closingLines = doc.splitTextToSize(order.closing_text || "", usableW);
  doc.text(closingLines, w / 2, h / 2 - 10, { align: "center", lineHeightFactor: 1.6 });
  footer(doc, w, h, accent);

  return doc.output("blob");
}
