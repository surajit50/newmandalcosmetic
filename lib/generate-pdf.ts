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
  const toastId = toast.loading("Generating receipt...");

  try {
    // ==========================================
    // THERMAL PRINTER OPTIMIZED PDF
    // ==========================================
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 220],
      compress: false,
      precision: 16,
    });

    doc.setProperties({
      title: `Invoice-${completedSale.invoiceNumber}`,
      subject: "Thermal Receipt",
      author: shopSettings.shopName,
    });

    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);

    // Thick lines for thermal printer
    doc.setLineWidth(0.4);

    // Auto print
    doc.autoPrint();

    const pageWidth = 80;
    const margin = 3;

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

      y += size * 0.5 + 1;
    };

    const leftText = (
      text: string,
      size = 9,
      style: "normal" | "bold" = "bold"
    ) => {
      doc.setFont("courier", style);
      doc.setFontSize(size);

      doc.text(text, margin, y);

      y += size * 0.5 + 1.5;
    };

    const rightText = (
      text: string,
      size = 9,
      style: "normal" | "bold" = "bold"
    ) => {
      doc.setFont("courier", style);
      doc.setFontSize(size);

      const textWidth = doc.getTextWidth(text);

      doc.text(text, pageWidth - margin - textWidth, y);
    };

    const twoColumn = (
      left: string,
      right: string,
      size = 9,
      style: "normal" | "bold" = "bold"
    ) => {
      doc.setFont("courier", style);
      doc.setFontSize(size);

      doc.text(left, margin, y);

      const rightWidth = doc.getTextWidth(right);

      doc.text(right, pageWidth - margin - rightWidth, y);

      y += size * 0.5 + 1.5;
    };

    const line = () => {
      doc.setLineWidth(0.3);

      doc.line(margin, y, pageWidth - margin, y);

      y += 3;
    };

    // ==========================================
    // HEADER
    // ==========================================

    centerText(shopSettings.shopName.toUpperCase(), 14, "bold");

    if (shopSettings.address) {
      centerText(shopSettings.address, 9, "bold");
    }

    if (shopSettings.phone) {
      centerText(`Phone: ${shopSettings.phone}`, 9, "bold");
    }

    if (shopSettings.gstin) {
      centerText(`GSTIN: ${shopSettings.gstin}`, 9, "bold");
    }

    line();

    // ==========================================
    // INVOICE DETAILS
    // ==========================================

    leftText(`Bill No : ${completedSale.invoiceNumber}`, 9);

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

    y = currentY + 4;

    leftText(
      `Customer : ${completedSale.customerName || "Walk-in Customer"}`,
      9
    );

    line();

    // ==========================================
    // TABLE HEADER
    // ==========================================

    doc.setFont("courier", "bold");
    doc.setFontSize(9);

    const col1 = 3;
    const col2 = 10;
    const col3 = 42;
    const col4 = 55;
    const col5 = 77;

    doc.text("No", col1, y);
    doc.text("Item", col2, y);
    doc.text("Qty", col3, y);
    doc.text("Rate", col4, y);
    doc.text("Amt", col5, y, { align: "right" });

    y += 5;

    line();

    // ==========================================
    // ITEMS
    // ==========================================

    doc.setFont("courier", "bold");

    completedSale.items.forEach((item, index) => {
      doc.setFontSize(9);

      const itemTotal =
        item.total ??
        item.sellingPrice * item.quantity - (item.discount || 0);

      let itemName = item.productName;

      // Shorten for thermal printer
      if (itemName.length > 18) {
        itemName = itemName.substring(0, 18) + "..";
      }

      doc.text(String(index + 1), col1, y);

      doc.text(itemName, col2, y);

      doc.text(String(item.quantity), col3, y);

      doc.text(formatNumber(item.sellingPrice), col4, y);

      doc.text(formatNumber(itemTotal), col5, y, {
        align: "right",
      });

      y += 5;

      // Page break
      if (y > 200) {
        doc.addPage([80, 220], "portrait");

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
      9,
      "bold"
    );

    if (completedSale.totalDiscount > 0) {
      twoColumn(
        "Discount",
        "-" + formatNumber(completedSale.totalDiscount),
        9,
        "bold"
      );
    }

    twoColumn("GST", formatNumber(completedSale.totalGst), 9, "bold");

    line();

    doc.setFont("courier", "bold");
    doc.setFontSize(11);

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
    // PAYMENT
    // ==========================================

    twoColumn(
      "Paid Amount",
      formatNumber(completedSale.paidAmount),
      9,
      "bold"
    );

    twoColumn(
      "Due Amount",
      formatNumber(completedSale.dueAmount),
      9,
      "bold"
    );

    const change =
      completedSale.paidAmount - completedSale.grandTotal;

    if (change > 0) {
      twoColumn("Change", formatNumber(change), 9, "bold");
    }

    line();

    // ==========================================
    // FOOTER
    // ==========================================

    y += 2;

    centerText("THANK YOU", 10, "bold");

    centerText("VISIT AGAIN", 9, "bold");

    y += 4;

    centerText("Software by SS Software", 8, "bold");

    // ==========================================
    // SAVE PDF
    // ==========================================

    doc.save(`Invoice-${completedSale.invoiceNumber}.pdf`);

    toast.success("Receipt downloaded successfully", {
      id: toastId,
    });
  } catch (error) {
    console.error("PDF Error:", error);

    toast.error("Failed to generate receipt", {
      id: toastId,
    });
  }
}
