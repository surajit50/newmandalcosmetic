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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

    // =============================================
    // IMPROVEMENTS FOR THERMAL PRINT QUALITY
    // =============================================
    // 1. Force pure black – no grey anti‑aliasing.
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);

    // 2. Help the printer driver recognise this as a receipt.
    doc.setProperties({
      title: `Invoice ${completedSale.invoiceNumber}`,
      subject: "Thermal Receipt",
    });

    // 3. Open the print dialog automatically when the PDF loads.
    //    (Works in Adobe Reader and some browsers; still let
    //     the user click "Save" if they prefer.)
    doc.autoPrint();
    // =============================================

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
    // DYNAMIC COLUMN WIDTHS – disc expands, item shrinks
    // ============================================
    const colSl = margin;               // 3 mm
    const colItem = 7;                  // fixed start for item name

    // Step 1 — measure maximum width of each column’s content
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    const charWidth = doc.getTextWidth("A");

    let maxQtyWidth = 0;
    let maxRateWidth = 0;
    let maxDiscWidth = 0;
    let maxAmtWidth = 0;

    completedSale.items.forEach((item) => {
      const qtyStr = String(item.quantity);
      const rateStr = `${formatNumber(item.sellingPrice)}${item.unit ? '/' + item.unit : ''}`;
      const discStr = item.discount && item.discount > 0 ? formatNumber(item.discount) : "-";
      const itemTotal = item.total ?? item.sellingPrice * item.quantity - (item.discount || 0);
      const amtStr = formatNumber(itemTotal);

      maxQtyWidth  = Math.max(maxQtyWidth,  doc.getTextWidth(qtyStr));
      maxRateWidth = Math.max(maxRateWidth, doc.getTextWidth(rateStr));
      maxDiscWidth = Math.max(maxDiscWidth, doc.getTextWidth(discStr));
      maxAmtWidth  = Math.max(maxAmtWidth,  doc.getTextWidth(amtStr));
    });

    const colAmt = pageWidth - margin;   // right edge (77 mm)

    // Step 2 — derive column positions from right to left
    const padding = 1.5; // mm between columns

    const amtLeft     = colAmt - maxAmtWidth;
    const discEnd     = amtLeft - padding;
    const discStart   = discEnd - maxDiscWidth;

    const rateEnd     = discStart - padding;
    const rateStart   = rateEnd - maxRateWidth;

    const qtyEnd      = rateStart - padding;
    const qtyStart    = qtyEnd - maxQtyWidth;

    // available width for the item name column
    const itemWidth   = qtyStart - padding - colItem;
    const maxItemChars = Math.max(1, Math.floor(itemWidth / charWidth));

    // ---------- table header ----------
    doc.setFont("courier", "bold");
    doc.setFontSize(7);
    doc.text("Sl.", colSl, y);
    doc.text("Item", colItem, y);
    doc.text("Qty", qtyStart, y);
    doc.text("Rate", rateStart, y);
    doc.text("Disc", discStart, y);
    doc.text("Amt", colAmt, y, { align: "right" });
    y += 4;
    doc.setFont("courier", "normal");

    // ---------- items ----------
    completedSale.items.forEach((item, index) => {
      doc.setFontSize(7);

      const slNo = index + 1;
      const itemName =
        item.productName.length > maxItemChars
          ? item.productName.substring(0, maxItemChars) + ".."
          : item.productName;
      const itemTotal =
        item.total ?? item.sellingPrice * item.quantity - (item.discount || 0);
      const rateStr = `${formatNumber(item.sellingPrice)}${item.unit ? '/' + item.unit : ''}`;
      const discStr = item.discount && item.discount > 0 ? formatNumber(item.discount) : "-";

      doc.text(String(slNo), colSl, y);
      doc.text(itemName, colItem, y);
      doc.text(String(item.quantity), qtyStart, y);
      doc.text(rateStr, rateStart, y);
      doc.text(discStr, discStart, y);
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