// lib/generate-pdf.ts
import jsPDF from "jspdf";
import { toast } from "sonner";

interface GeneratePDFParams {
  completedSale: {
    invoiceNumber: string;
    createdAt: string;
    customerName?: string;
    items: any[];
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

    // =========================
    // HELPERS
    // =========================

    const centerText = (
      text: string,
      size = 10,
      style: "normal" | "bold" = "normal"
    ) => {
      doc.setFont("courier", style);
      doc.setFontSize(size);
      const textWidth = doc.getTextWidth(text);
      doc.text(text, (pageWidth - textWidth) / 2, y);
      y += size * 0.35 + 1;
    };

    const leftText = (
      text: string,
      size = 8,
      style: "normal" | "bold" = "normal"
    ) => {
      doc.setFont("courier", style);
      doc.setFontSize(size);
      doc.text(text, margin, y);
      y += size * 0.35 + 1.2;
    };

    const rightText = (
      text: string,
      size = 8,
      style: "normal" | "bold" = "normal"
    ) => {
      doc.setFont("courier", style);
      doc.setFontSize(size);
      const textWidth = doc.getTextWidth(text);
      doc.text(text, pageWidth - margin - textWidth, y);
    };

    const twoColumn = (
      left: string,
      right: string,
      size = 8,
      style: "normal" | "bold" = "normal"
    ) => {
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

    // =========================
    // HEADER
    // =========================

    centerText(shopSettings.shopName.toUpperCase(), 12, "bold");

    if (shopSettings.address) {
      centerText(shopSettings.address, 8);
    }

    if (shopSettings.phone) {
      centerText(`Phone: ${shopSettings.phone}`, 8);
    }

    if (shopSettings.gstin) {
      centerText(`GSTIN: ${shopSettings.gstin}`, 8);
    }

    dashedLine();

    // =========================
    // INVOICE DETAILS
    // =========================

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

    // =========================
    // TABLE HEADER – ADJUSTED COLUMNS
    // =========================
    // New column widths (in mm from left margin):
    // Sl.     : 3  (width 5)
    // Item    : 8  (width 31)
    // Qty     : 39 (width 7)
    // Rate    : 46 (width 7)
    // Disc    : 53 (width 5)
    // Amt     : 58 (width 19, right-aligned at 77)
    // (page width 80, margin 3 → usable 74, sum: 5+31+7+7+5+19 = 74)

    const colSl = margin;               // 3
    const colItem = colSl + 5;          // 8
    const colQty = colItem + 31;        // 39
    const colRate = colQty + 7;         // 46
    const colDisc = colRate + 7;        // 53
    const colAmt = pageWidth - margin;  // 77 (right edge for amount)

    doc.setFont("courier", "bold");
    doc.setFontSize(7);

    doc.text("Sl.", colSl, y);
    doc.text("Item", colItem, y);
    doc.text("Qty", colQty, y);
    doc.text("Rate", colRate, y);
    doc.text("Disc", colDisc, y);
    doc.text("Amt", colAmt, y, { align: "right" });

    y += 4;
    doc.setFont("courier", "normal");

    // =========================
    // ITEMS – with serial number
    // =========================

    completedSale.items.forEach((item: any, index: number) => {
      doc.setFontSize(7);

      const slNo = index + 1;
      // Item name can now be longer thanks to 31mm width
      const itemName =
        item.productName.length > 24
          ? item.productName.substring(0, 24) + ".."
          : item.productName;
      const itemTotal =
        item.total ??
        item.sellingPrice * item.quantity - (item.discount || 0);

      doc.text(String(slNo), colSl, y);
      doc.text(itemName, colItem, y);
      doc.text(String(item.quantity), colQty, y);
      doc.text(formatNumber(item.sellingPrice), colRate, y);
      doc.text(item.discount > 0 ? formatNumber(item.discount) : "-", colDisc, y);
      doc.text(formatNumber(itemTotal), colAmt, y, { align: "right" });

      y += 4;

      // AUTO PAGE BREAK
      if (y > 185) {
        doc.addPage([80, 200], "portrait");
        y = 10;
      }
    });

    dashedLine();

    // =========================
    // TOTALS
    // =========================

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

    // =========================
    // FINAL TOTAL
    // =========================

    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.text("TOTAL", margin, y);
    doc.text(formatNumber(completedSale.grandTotal), colAmt, y, { align: "right" });
    y += 5;

    dashedLine();

    // =========================
    // PAYMENT
    // =========================

    twoColumn("Paid", formatNumber(completedSale.paidAmount));
    twoColumn("Due", formatNumber(completedSale.dueAmount));

    const change = completedSale.paidAmount - completedSale.grandTotal;
    if (change > 0) {
      twoColumn("Change", formatNumber(change));
    }

    dashedLine();

    // =========================
    // FOOTER
    // =========================

    centerText("Thank you for your purchase!", 8);
    centerText("Visit Again", 8);

    // =========================
    // SAVE PDF
    // =========================

    doc.save(`Invoice-${completedSale.invoiceNumber}.pdf`);

    toast.success("PDF downloaded successfully", { id: toastId });
  } catch (error) {
    console.error("PDF Error:", error);
    toast.error("Failed to generate PDF", { id: toastId });
  }
}
