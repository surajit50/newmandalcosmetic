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
    // PDF SETUP
    // ==========================================

    const doc = new jsPDF({
  orientation: "portrait",
  unit: "pt", // use points for better precision
  format: [226, 1200], // 80mm thermal width in points
  compress: false,
  precision: 32,
  putOnlyUsedFonts: true,
  hotfixes: ["px_scaling"],
});

    doc.setProperties({
      title: `Invoice-${completedSale.invoiceNumber}`,
      subject: "Thermal Receipt",
      author: shopSettings.shopName,
    });

    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);

    doc.setLineWidth(0.3);

    const pageWidth = 226;
const margin = 10;

    let y = 6;

    // ==========================================
    // HELPERS
    // ==========================================

    const centerText = (
      text: string,
      size = 10,
      style: "normal" | "bold" = "bold"
    ) => {
      doc.setFont("courier", style);

      doc.setFontSize(size);

      const textWidth = doc.getTextWidth(text);

      doc.text(text, (pageWidth - textWidth) / 2, y);

      y += size * 0.45 + 1.5;
    };

    const leftText = (
      text: string,
      size = 8,
      style: "normal" | "bold" = "bold"
    ) => {
      doc.setFont("courier", style);

      doc.setFontSize(size);

      doc.text(text, margin, y);

      y += size * 0.45 + 1.5;
    };

    const rightText = (
      text: string,
      size = 8,
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
      size = 8,
      style: "normal" | "bold" = "bold"
    ) => {
      doc.setFont("courier", style);

      doc.setFontSize(size);

      doc.text(left, margin, y);

      const width = doc.getTextWidth(right);

      doc.text(right, pageWidth - margin - width, y);

      y += size * 0.45 + 1.8;
    };

    const line = () => {
      doc.line(margin, y, pageWidth - margin, y);

      y += 3;
    };

    // ==========================================
    // HEADER
    // ==========================================

    centerText(shopSettings.shopName.toUpperCase(), 14, "bold");

    if (shopSettings.address) {
      centerText(shopSettings.address, 8);
    }

    if (shopSettings.phone) {
      centerText(`Phone: ${shopSettings.phone}`, 8);
    }

    if (shopSettings.gstin) {
      centerText(`GSTIN: ${shopSettings.gstin}`, 8);
    }

    line();

    // ==========================================
    // BILL DETAILS
    // ==========================================

    leftText(`Bill No : ${completedSale.invoiceNumber}`, 8);

    const tempY = y;

    rightText(
      new Date(completedSale.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      7
    );

    y = tempY + 4;

    leftText(
      `Customer : ${completedSale.customerName || "Walk-in Customer"}`,
      8
    );

    line();

    // ==========================================
    // TABLE HEADER
    // ==========================================

    doc.setFont("courier", "bold");

    doc.setFontSize(8);

    const colNo = 3;
    const colItem = 10;
    const colQty = 46;
    const colRate = 60;
    const colAmt = 77;

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

    y += 4;

    line();

    // ==========================================
    // ITEMS WITH WRAP
    // ==========================================

    completedSale.items.forEach((item, index) => {
      doc.setFont("courier", "bold");

      doc.setFontSize(8);

      const itemTotal =
        item.total ??
        item.sellingPrice * item.quantity - (item.discount || 0);

      // ==========================================
      // WRAP LONG ITEM NAME
      // ==========================================

      const itemLines = doc.splitTextToSize(
        item.productName,
        32
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

      y += 4;

      // ==========================================
      // EXTRA WRAPPED LINES
      // ==========================================

      if (itemLines.length > 1) {
        for (let i = 1; i < itemLines.length; i++) {
          doc.text(itemLines[i], colItem, y);

          y += 4;
        }
      }

      // Space after item
      y += 1;

      // ==========================================
      // PAGE BREAK
      // ==========================================

      if (y > 280) {
        doc.addPage([80, 300], "portrait");

        y = 10;
      }
    });

    line();

    // ==========================================
    // TOTALS
    // ==========================================

    twoColumn(
      "Subtotal",
      formatNumber(completedSale.subtotal),
      8
    );

    if (completedSale.totalDiscount > 0) {
      twoColumn(
        "Discount",
        "-" + formatNumber(completedSale.totalDiscount),
        8
      );
    }

    twoColumn(
      "GST",
      formatNumber(completedSale.totalGst),
      8
    );

    line();

    // ==========================================
    // GRAND TOTAL
    // ==========================================

    doc.setFont("courier", "bold");

    doc.setFontSize(10);

    doc.text("GRAND TOTAL", margin, y);

    doc.text(
      formatNumber(completedSale.grandTotal),
      pageWidth - margin,
      y,
      {
        align: "right",
      }
    );

    y += 6;

    line();

    // ==========================================
    // PAYMENT DETAILS
    // ==========================================

    twoColumn(
      "Paid Amount",
      formatNumber(completedSale.paidAmount),
      8
    );

    twoColumn(
      "Due Amount",
      formatNumber(completedSale.dueAmount),
      8
    );

    const change =
      completedSale.paidAmount - completedSale.grandTotal;

    if (change > 0) {
      twoColumn(
        "Change",
        formatNumber(change),
        8
      );
    }

    line();

    // ==========================================
    // FOOTER
    // ==========================================

    y += 2;

    centerText("THANK YOU", 9, "bold");

    centerText("VISIT AGAIN", 8);

    y += 2;

    centerText("Software by SS Software", 7);

    // ==========================================
    // SAVE PDF
    // ==========================================

    doc.save(`Invoice-${completedSale.invoiceNumber}.pdf`);

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
