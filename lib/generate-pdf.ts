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
  const toastId = toast.loading("Generating Invoice...");

  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 220],
    });

    const pageWidth = 80;
    const margin = 4;

    let y = 6;

    // =========================
    // Helpers
    // =========================

    const center = (
      text: string,
      size = 9,
      bold = false
    ) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);

      const width = doc.getTextWidth(text);

      doc.text(text, (pageWidth - width) / 2, y);

      y += size * 0.45;
    };

    const line = () => {
      doc.setDrawColor(180);
      doc.line(margin, y, pageWidth - margin, y);
      y += 3;
    };

    const row = (
      left: string,
      right: string,
      bold = false,
      size = 8
    ) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);

      doc.text(left, margin, y);

      doc.text(right, pageWidth - margin, y, {
        align: "right",
      });

      y += 4.2;
    };

    // =========================
    // HEADER
    // =========================

    center(shopSettings.shopName.toUpperCase(), 13, true);

    if (shopSettings.address) {
      center(shopSettings.address, 7);
    }

    if (shopSettings.phone) {
      center(`Phone: ${shopSettings.phone}`, 7);
    }

    if (shopSettings.gstin) {
      center(`GSTIN: ${shopSettings.gstin}`, 7);
    }

    y += 1;

    line();

    row("Invoice No", completedSale.invoiceNumber, true);

    row(
      "Date",
      new Date(completedSale.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );

    row(
      "Customer",
      completedSale.customerName || "Walk-in Customer"
    );

    line();

    // =========================
    // TABLE HEADER
    // =========================

    doc.setFillColor(240);

    doc.rect(margin, y - 3, pageWidth - margin * 2, 6, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);

    doc.text("Item", margin, y + 1);

    doc.text("Qty", 42, y + 1, {
      align: "right",
    });

    doc.text("Rate", 56, y + 1, {
      align: "right",
    });

    doc.text("Amt", 76, y + 1, {
      align: "right",
    });

    y += 7;

    // =========================
    // ITEMS
    // =========================

    doc.setFont("helvetica", "normal");

    completedSale.items.forEach((item) => {
      const total =
        item.total ??
        item.quantity * item.sellingPrice -
          (item.discount || 0);

      const itemLines = doc.splitTextToSize(
        item.productName,
        34
      );

      doc.setFontSize(7);

      doc.text(itemLines, margin, y);

      doc.text(
        String(item.quantity),
        42,
        y,
        { align: "right" }
      );

      doc.text(
        `${formatNumber(item.sellingPrice)}`,
        56,
        y,
        { align: "right" }
      );

      doc.text(
        formatNumber(total),
        76,
        y,
        { align: "right" }
      );

      y += itemLines.length * 3.5 + 2;

      if (item.unit) {
        doc.setFontSize(6);
        doc.setTextColor(120);

        doc.text(
          `Unit: ${item.unit}`,
          margin,
          y - 1
        );

        doc.setTextColor(0);
      }

      if (item.discount && item.discount > 0) {
        doc.setFontSize(6);

        doc.text(
          `Discount: ₹${formatNumber(item.discount)}`,
          76,
          y - 1,
          {
            align: "right",
          }
        );
      }

      y += 2;

      if (y > 190) {
        doc.addPage([80, 220], "portrait");
        y = 10;
      }
    });

    line();

    // =========================
    // TOTALS
    // =========================

    row(
      "Subtotal",
      `₹${formatNumber(completedSale.subtotal)}`
    );

    if (completedSale.totalDiscount > 0) {
      row(
        "Discount",
        `- ₹${formatNumber(
          completedSale.totalDiscount
        )}`
      );
    }

    row(
      "GST",
      `₹${formatNumber(completedSale.totalGst)}`
    );

    line();

    // GRAND TOTAL BOX

    doc.setFillColor(20);

    doc.rect(margin, y - 2, pageWidth - margin * 2, 8, "F");

    doc.setTextColor(255);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    doc.text("GRAND TOTAL", margin + 1, y + 3);

    doc.text(
      `₹${formatNumber(completedSale.grandTotal)}`,
      pageWidth - margin - 1,
      y + 3,
      {
        align: "right",
      }
    );

    doc.setTextColor(0);

    y += 10;

    // =========================
    // PAYMENT
    // =========================

    row(
      "Paid",
      `₹${formatNumber(completedSale.paidAmount)}`
    );

    row(
      "Due",
      `₹${formatNumber(completedSale.dueAmount)}`
    );

    const change =
      completedSale.paidAmount -
      completedSale.grandTotal;

    if (change > 0) {
      row("Change", `₹${formatNumber(change)}`);
    }

    line();

    // =========================
    // FOOTER
    // =========================

    y += 2;

    center("Thank You!", 9, true);

    center("Visit Again", 8);

    y += 2;

    center(
      "Software by New Mandal Cosmetic",
      6
    );

    // =========================
    // SAVE
    // =========================

    doc.save(
      `Invoice-${completedSale.invoiceNumber}.pdf`
    );

    toast.success("Invoice downloaded", {
      id: toastId,
    });
  } catch (error) {
    console.error(error);

    toast.error("Failed to generate PDF", {
      id: toastId,
    });
  }
}
