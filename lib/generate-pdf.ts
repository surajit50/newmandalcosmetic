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

export async function generatePDF({ completedSale, shopSettings }: GeneratePDFParams) {
  const toastId = toast.loading("Generating PDF...");
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 120],
    });
    const pageWidth = 80;
    const margin = 4;
    let y = 6;

    const centerText = (text: string, size = 10, style: "normal" | "bold" = "normal") => {
      doc.setFont("courier", style);
      doc.setFontSize(size);
      const textWidth = doc.getTextWidth(text);
      doc.text(text, (pageWidth - textWidth) / 2, y);
      y += size * 0.5 + 1.5;
    };

    const leftText = (text: string, size = 9) => {
      doc.setFont("courier", "normal");
      doc.setFontSize(size);
      doc.text(text, margin, y);
      y += size * 0.5 + 1.2;
    };

    const rightText = (text: string, size = 9) => {
      doc.setFont("courier", "normal");
      doc.setFontSize(size);
      const textWidth = doc.getTextWidth(text);
      doc.text(text, pageWidth - margin - textWidth, y);
    };

    const twoColumn = (left: string, right: string, size = 9, style: "normal" | "bold" = "normal") => {
      doc.setFont("courier", style);
      doc.setFontSize(size);
      doc.text(left, margin, y);
      const rightWidth = doc.getTextWidth(right);
      doc.text(right, pageWidth - margin - rightWidth, y);
      y += size * 0.5 + 1.2;
    };

    const dashedLine = () => {
      let x = margin;
      while (x < pageWidth - margin) {
        doc.line(x, y, x + 1.5, y);
        x += 3;
      }
      y += 3;
    };

    const solidLine = () => {
      doc.line(margin, y, pageWidth - margin, y);
      y += 2;
    };

    // Shop header
    centerText(shopSettings.shopName.toUpperCase(), 12, "bold");
    if (shopSettings.address) centerText(shopSettings.address, 8);
    if (shopSettings.phone) centerText(`Phone: ${shopSettings.phone}`, 8);
    if (shopSettings.gstin) centerText(`GSTIN: ${shopSettings.gstin}`, 8);

    dashedLine();

    // Invoice details
    leftText(`Invoice: ${completedSale.invoiceNumber}`, 9);
    const currentY = y;
    rightText(
      new Date(completedSale.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      9
    );
    y = currentY + 4;
    leftText(`Customer: ${completedSale.customerName || "Walk-in"}`, 9);

    dashedLine();

    // Table header
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.text("Item", margin, y);
    doc.text("Qty", 30, y);
    doc.text("Rate", 40, y);
    doc.text("Disc", 50, y);
    doc.text("Amt", 65, y);
    y += 4;
    doc.setFont("courier", "normal");

    // Items
    completedSale.items.forEach((item: any) => {
      const name = item.productName.length > 16
        ? item.productName.substring(0, 16) + "."
        : item.productName;
      const itemTotal = item.total ?? (item.sellingPrice * item.quantity - (item.discount || 0));
      doc.text(name, margin, y);
      doc.text(String(item.quantity), 30, y);
      doc.text(formatNumber(item.sellingPrice), 40, y);
      doc.text(item.discount > 0 ? formatNumber(item.discount) : "-", 50, y);
      doc.text(formatNumber(itemTotal), 65, y);
      y += 4;
    });

    dashedLine();

    // Totals
    twoColumn("Subtotal", formatNumber(completedSale.subtotal));
    if ((completedSale.totalDiscount || 0) > 0) {
      twoColumn("Discount", "-" + formatNumber(completedSale.totalDiscount));
    }
    twoColumn("Taxable", formatNumber(completedSale.subtotal - completedSale.totalDiscount));
    twoColumn("GST", formatNumber(completedSale.totalGst));
    solidLine();
    twoColumn("TOTAL", "₹ " + formatNumber(completedSale.grandTotal), 11, "bold");

    dashedLine();

    // Payment
    twoColumn("Paid", formatNumber(completedSale.paidAmount));
    twoColumn("Due", formatNumber(completedSale.dueAmount));
    const change = completedSale.paidAmount - completedSale.grandTotal;
    if (change > 0) {
      twoColumn("Change", formatNumber(change));
    }

    dashedLine();
    centerText("Thank you for your purchase!", 8);
    centerText("Visit again", 8);
    y += 4;

    const finalHeight = y + 5;
    (doc as any).internal.pageSize.height = finalHeight;
    (doc as any).internal.pageSize.width = 80;
    doc.save(`Invoice-${completedSale.invoiceNumber}.pdf`);
    toast.success("PDF downloaded successfully", { id: toastId });
  } catch (error) {
    console.error("PDF Error:", error);
    toast.error("Failed to generate PDF", { id: toastId });
  }
}
