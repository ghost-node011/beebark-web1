import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Snapshot a DOM node and export it as a multi-page A4 PDF — a direct
 * capture of what's on screen, not a separately-authored PDF layout.
 * Elements marked `data-pdf-ignore` (edit/delete controls, theme picker,
 * the export button itself) are hidden during capture only.
 */
export const exportPortfolioPdf = async (node, filename = 'portfolio.pdf') => {
  if (!node) return;

  const hidden = Array.from(node.querySelectorAll('[data-pdf-ignore]'));
  hidden.forEach((el) => { el.dataset.prevDisplay = el.style.display; el.style.display = 'none'; });

  try {
    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight
    });

    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } finally {
    hidden.forEach((el) => { el.style.display = el.dataset.prevDisplay || ''; });
  }
};
