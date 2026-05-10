// lib/generate-pdf.ts
import jsPDF from "jspdf";
import { toast } from "sonner";

interface GeneratePDFParams {
  completedSale: {
    invoiceNumber: string;
    createdAt: string;
    customerName?: string;
    items: {
      productName: string;
      quantity: number;
      unit?: string;               // ← must be included from the product
      sellingPrice: number;
      discount?: number;
      total?: number;
    }[];
    subtotal: number;
    totalGst: number;
    totalDiscount: number;
    grandTotal: number;
    paidAmount: number;
    dueAmount: number;
  };
  shopSettings: {
    shopName: string;
    address?: string;
    phone?: string;
    gstin?: string;
  };
}

const formatNumber = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);

export async function generatePDF({
  completedSale,
  shopSettings,
}: GeneratePDFParams) {
  const toastId = toast.loading("Generating PDF...");

  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 200],
    });

    const pageWidth = 80;
    const margin = 3;
    let y = 4;

    // ---------- helpers ----------
    const centerText = (text: string, size = 10, style: "normal" | "bold" = "normal") => {
      doc.setFont("courier", style);
      doc.setFontSize(size);
      const textWidth = doc.getTextWidth(text);
      doc.text(text, (pageWidth - textWidth) / 2, y);
      y += size * 0.35 + 1;
    };

    const leftText = (text: string, size = 8, style: "normal" | "bold" = "normal") => {
      doc.setFont("courier", style);
      doc.setFontSize(size);
      doc.text(text, margin, y);
      y += size * 0.35 + 1.2;
    };

    const rightText = (text: string, size = 8, style: "normal" | "bold" = "normal") => {
      doc.setFont("courier", style);
      doc.setFontSize(size);
      const textWidth = doc.getTextWidth(text);
      doc.text(text, pageWidth - margin - textWidth, y);
    };

    const twoColumn = (left: string, right: string, size = 8, style: "normal" | "bold" = "normal") => {
      doc.setFont("courier", style);
      doc.setFontSize(size);
      doc.text(left, margin, y);
      const rightWidth = doc.getTextWidth(right);
      doc.text(right, pageWidth - margin - rightWidth, y);
      y += size * 0.35 + 1.4;
    };

    const dashedLine = () => {
      let x = margin;
      while (x < pageWidth - margin) {
        doc.line(x, y, x + 1.5, y);
        x += 3;
      }
      y += 2.5;
    };

    const solidLine = () => {
      doc.line(margin, y, pageWidth - margin, y);
      y += 2;
    };

    // ---------- header ----------
    centerText(shopSettings.shopName.toUpperCase(), 12, "bold");
    if (shopSettings.address) centerText(shopSettings.address, 8);
    if (shopSettings.phone) centerText(`Phone: ${shopSettings.phone}`, 8);
    if (shopSettings.gstin) centerText(`GSTIN: ${shopSettings.gstin}`, 8);
    dashedLine();

    // ---------- invoice details ----------
    leftText(`Invoice: ${completedSale.invoiceNumber}`, 8);
    const currentY = y;
    rightText(
      new Date(completedSale.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      8
    );
    y = currentY + 3.5;
    leftText(`Customer: ${completedSale.customerName || "Walk-in Customer"}`, 8);
    dashedLine();

    // ============================================
    // NEW TABLE COLUMNS – balanced spacing
    // Sl     : 3
    // Item   : 7 … 41   (width 34 mm, fits ~23 chars)
    // Qty    : 43       (width 5  mm)
    // Rate   : 50       (width 11 mm, shows "47/pcs")
    // Disc   : 63       (width 5  mm)
    // Amt    : 77       (right edge, right‑aligned)
    // ============================================
    const colSl   = margin;               // 3
    const colItem = 7;                    // 7
    const colQty  = 43;                   // 43
    const colRate = 50;                   // 50
    const colDisc = 63;                   // 63
    const colAmt  = pageWidth - margin;   // 77

    // ---------- table header ----------
    doc.setFont("courier", "bold");
    doc.setFontSize(7);
    doc.text("Sl.", colSl, y);
    doc.text("Item", colItem, y);
    doc.text("Qty", colQty, y);
    doc.text("Rate", colRate, y);        // “Rate” now includes unit
    doc.text("Disc", colDisc, y);
    doc.text("Amt", colAmt, y, { align: "right" });
    y += 4;
    doc.setFont("courier", "normal");

    // ---------- items ----------
    completedSale.items.forEach((item, index) => {
      doc.setFontSize(7);

      const slNo = index + 1;
      // Item name can now hold ~23 characters
      const itemName =
        item.productName.length > 23
          ? item.productName.substring(0, 23) + ".."
          : item.productName;
      const itemTotal =
        item.total ??
        item.sellingPrice * item.quantity - (item.discount || 0);

      // Serial number
      doc.text(String(slNo), colSl, y);
      // Product name
      doc.text(itemName, colItem, y);
      // Quantity
      doc.text(String(item.quantity), colQty, y);
      // Combined rate + unit (e.g. “47/pcs”)
      const rateStr = `${formatNumber(item.sellingPrice)}${item.unit ? '/' + item.unit : ''}`;
      doc.text(rateStr, colRate, y);
      // Discount (or "-")
      doc.text(
        item.discount && item.discount > 0 ? formatNumber(item.discount) : "-",
        colDisc,
        y
      );
      // Line total, right‑aligned
      doc.text(formatNumber(itemTotal), colAmt, y, { align: "right" });

      y += 4;

      // Page break if needed
      if (y > 185) {
        doc.addPage([80, 200], "portrait");
        y = 10;
      }
    });

    dashedLine();

    // ---------- totals ----------
    twoColumn("Subtotal", formatNumber(completedSale.subtotal));
    if ((completedSale.totalDiscount || 0) > 0) {
      twoColumn("Discount", "-" + formatNumber(completedSale.totalDiscount));
    }
    twoColumn(
      "Taxable",
      formatNumber(completedSale.subtotal - completedSale.totalDiscount)
    );
    twoColumn("GST", formatNumber(completedSale.totalGst));
    solidLine();

    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.text("TOTAL", margin, y);
    doc.text(formatNumber(completedSale.grandTotal), colAmt, y, { align: "right" });
    y += 5;
    dashedLine();

    // ---------- payment ----------
    twoColumn("Paid", formatNumber(completedSale.paidAmount));
    twoColumn("Due", formatNumber(completedSale.dueAmount));
    const change = completedSale.paidAmount - completedSale.grandTotal;
    if (change > 0) twoColumn("Change", formatNumber(change));
    dashedLine();

    // ---------- footer ----------
    centerText("Thank you for your purchase!", 8);
    centerText("Visit Again", 8);

    doc.save(`Invoice-${completedSale.invoiceNumber}.pdf`);
    toast.success("PDF downloaded successfully", { id: toastId });
  } catch (error) {
    console.error("PDF Error:", error);
    toast.error("Failed to generate PDF", { id: toastId });
  }
}
