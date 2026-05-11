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
      unit?: string;
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
  const toastId = toast.loading("Generating Receipt...");

  try {
    // ==========================================
    // HIGH RESOLUTION THERMAL PDF
    // ==========================================

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: [226, 2000], // 80mm thermal width
      compress: false,
      precision: 32,
      putOnlyUsedFonts: true,
      hotfixes: ["px_scaling"],
    });

    // Increase rendering quality
    doc.internal.scaleFactor = 4;

    doc.setProperties({
      title: `Invoice-${completedSale.invoiceNumber}`,
      subject: "Thermal Receipt",
      author: shopSettings.shopName,
    });

    // Pure black for thermal printer
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);

    // Better line quality
    doc.setLineWidth(0.8);

    const pageWidth = 226;
    const margin = 10;

    let y = 20;

    // ==========================================
    // HELPERS
    // ==========================================

    const centerText = (
      text: string,
      size = 14,
      style: "normal" | "bold" = "bold"
    ) => {
      doc.setFont("courier", style);

      doc.setFontSize(size);

      const textWidth = doc.getTextWidth(text);

      doc.text(text, (pageWidth - textWidth) / 2, y);

      y += size + 6;
    };

    const leftText = (
      text: string,
      size = 11,
      style: "normal" | "bold" = "bold"
    ) => {
      doc.setFont("courier", style);

      doc.setFontSize(size);

      doc.text(text, margin, y);

      y += size + 5;
    };

    const rightText = (
      text: string,
      size = 11,
      style: "normal" | "bold" = "bold"
    ) => {
      doc.setFont("courier", style);

      doc.setFontSize(size);

      const width = doc.getTextWidth(text);

      doc.text(text, pageWidth - margin - width, y);
    };

    const twoColumn = (
      left: string,
      right: string,
      size = 11,
      style: "normal" | "bold" = "bold"
    ) => {
      doc.setFont("courier", style);

      doc.setFontSize(size);

      doc.text(left, margin, y);

      const width = doc.getTextWidth(right);

      doc.text(right, pageWidth - margin - width, y);

      y += size + 6;
    };

    const line = () => {
      doc.line(margin, y, pageWidth - margin, y);

      y += 10;
    };

    // ==========================================
    // HEADER
    // ==========================================

    centerText(
      shopSettings.shopName.toUpperCase(),
      18,
      "bold"
    );

    if (shopSettings.address) {
      centerText(shopSettings.address, 11);
    }

    if (shopSettings.phone) {
      centerText(`Phone: ${shopSettings.phone}`, 11);
    }

    if (shopSettings.gstin) {
      centerText(`GSTIN: ${shopSettings.gstin}`, 11);
    }

    line();

    // ==========================================
    // BILL DETAILS
    // ==========================================

    leftText(`Bill No : ${completedSale.invoiceNumber}`, 11);

    const tempY = y;

    rightText(
      new Date(completedSale.createdAt).toLocaleString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      ),
      10
    );

    y = tempY + 10;

    leftText(
      `Customer : ${
        completedSale.customerName || "Walk-in Customer"
      }`,
      11
    );

    line();

    // ==========================================
    // TABLE HEADER
    // ==========================================

    doc.setFont("courier", "bold");

    doc.setFontSize(11);

    const colNo = 10;
    const colItem = 28;
    const colQty = 140;
    const colRate = 180;
    const colAmt = 216;

    doc.text("No", colNo, y);

    doc.text("Item", colItem, y);

    doc.text("Qty", colQty, y, {
      align: "right",
    });

    doc.text("Rate", colRate, y, {
      align: "right",
    });

    doc.text("Amt", colAmt, y, {
      align: "right",
    });

    y += 10;

    line();

    // ==========================================
    // ITEMS
    // ==========================================

    completedSale.items.forEach((item, index) => {
      doc.setFont("courier", "bold");

      doc.setFontSize(11);

      const itemTotal =
        item.total ??
        item.sellingPrice * item.quantity -
          (item.discount || 0);

      // ==========================================
      // WRAP LONG ITEM NAME
      // ==========================================

      const itemLines = doc.splitTextToSize(
        item.productName,
        95
      );

      const qtyText = String(item.quantity);

      const rateText = formatNumber(item.sellingPrice);

      const amtText = formatNumber(itemTotal);

      // ==========================================
      // FIRST LINE
      // ==========================================

      doc.text(String(index + 1), colNo, y);

      doc.text(itemLines[0], colItem, y);

      doc.text(qtyText, colQty, y, {
        align: "right",
      });

      doc.text(rateText, colRate, y, {
        align: "right",
      });

      doc.text(amtText, colAmt, y, {
        align: "right",
      });

      y += 12;

      // ==========================================
      // EXTRA WRAPPED LINES
      // ==========================================

      if (itemLines.length > 1) {
        for (let i = 1; i < itemLines.length; i++) {
          doc.text(itemLines[i], colItem, y);

          y += 12;
        }
      }

      // Gap between items
      y += 4;

      // ==========================================
      // PAGE BREAK
      // ==========================================

      if (y > 1900) {
        doc.addPage([226, 2000], "portrait");

        y = 20;
      }
    });

    line();

    // ==========================================
    // TOTALS
    // ==========================================

    twoColumn(
      "Subtotal",
      formatNumber(completedSale.subtotal),
      11
    );

    if (completedSale.totalDiscount > 0) {
      twoColumn(
        "Discount",
        "-" +
          formatNumber(completedSale.totalDiscount),
        11
      );
    }

    twoColumn(
      "GST",
      formatNumber(completedSale.totalGst),
      11
    );

    line();

    // ==========================================
    // GRAND TOTAL
    // ==========================================

    doc.setFont("courier", "bold");

    doc.setFontSize(14);

    doc.text("GRAND TOTAL", margin, y);

    doc.text(
      formatNumber(completedSale.grandTotal),
      pageWidth - margin,
      y,
      {
        align: "right",
      }
    );

    y += 18;

    line();

    // ==========================================
    // PAYMENT DETAILS
    // ==========================================

    twoColumn(
      "Paid Amount",
      formatNumber(completedSale.paidAmount),
      11
    );

    twoColumn(
      "Due Amount",
      formatNumber(completedSale.dueAmount),
      11
    );

    const change =
      completedSale.paidAmount -
      completedSale.grandTotal;

    if (change > 0) {
      twoColumn(
        "Change",
        formatNumber(change),
        11
      );
    }

    line();

    // ==========================================
    // FOOTER
    // ==========================================

    y += 10;

    centerText("THANK YOU", 14, "bold");

    centerText("VISIT AGAIN", 12);

    y += 6;

    centerText("Software by SS Software", 10);

    // ==========================================
    // SAVE PDF
    // ==========================================

    doc.save(
      `Invoice-${completedSale.invoiceNumber}.pdf`
    );

    toast.success("Receipt Downloaded", {
      id: toastId,
    });
  } catch (error) {
    console.error(error);

    toast.error("Failed to generate receipt", {
      id: toastId,
    });
  }
}
