// lib/generate-pdf.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
  const toastId = toast.loading("Generating PDF...");

  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 220],
    });

    const pageWidth = 80;
    const margin = 3;
    let y = 5;

    // ===============================
    // Helpers
    // ===============================
    const centerText = (
      text: string,
      size = 10,
      style: "normal" | "bold" = "normal"
    ) => {
      doc.setFont("courier", style);
      doc.setFontSize(size);

      const lines = doc.splitTextToSize(text, pageWidth - margin * 2);

      lines.forEach((line: string) => {
        const textWidth = doc.getTextWidth(line);
        doc.text(line, (pageWidth - textWidth) / 2, y);
        y += size * 0.38 + 1;
      });
    };

    const leftText = (
      text: string,
      size = 8,
      style: "normal" | "bold" = "normal"
    ) => {
      doc.setFont("courier", style);
      doc.setFontSize(size);

      const lines = doc.splitTextToSize(text, pageWidth - margin * 2);

      lines.forEach((line: string) => {
        doc.text(line, margin, y);
        y += size * 0.38 + 1;
      });
    };

    const line = () => {
      doc.setDrawColor(0);
      doc.line(margin, y, pageWidth - margin, y);
      y += 2;
    };

    // ===============================
    // Header
    // ===============================
    centerText(shopSettings.shopName || "SHOP NAME", 13, "bold");

    if (shopSettings.address) {
      centerText(shopSettings.address, 7);
    }

    if (shopSettings.phone) {
      centerText(`Ph: ${shopSettings.phone}`, 7);
    }

    if (shopSettings.gstin) {
      centerText(`GSTIN: ${shopSettings.gstin}`, 7);
    }

    line();

    // ===============================
    // Invoice Info
    // ===============================
    leftText(`Invoice : ${completedSale.invoiceNumber}`, 8, "bold");

    leftText(
      `Date    : ${new Date(
        completedSale.createdAt
      ).toLocaleString("en-IN")}`,
      8
    );

    if (completedSale.customerName) {
      leftText(`Customer: ${completedSale.customerName}`, 8);
    }

    line();

    // ===============================
    // Items Table
    // ===============================
    autoTable(doc, {
      startY: y,
      margin: {
        left: margin,
        right: margin,
      },
      theme: "plain",
      styles: {
        font: "courier",
        fontSize: 7,
        cellPadding: 1,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
      },
      headStyles: {
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { halign: "center", cellWidth: 10 },
        2: { halign: "right", cellWidth: 16 },
        3: { halign: "right", cellWidth: 20 },
      },
      head: [["Item", "Qty", "Rate", "Total"]],
      body: completedSale.items.map((item) => {
        const qtyText = `${item.quantity}${
          item.unit ? " " + item.unit : ""
        }`;

        return [
          item.productName,
          qtyText,
          formatNumber(item.sellingPrice),
          formatNumber(
            item.total ??
              item.quantity * item.sellingPrice - (item.discount || 0)
          ),
        ];
      }),
      didDrawPage: () => {},
    });

    y = (doc as any).lastAutoTable.finalY + 3;

    line();

    // ===============================
    // Totals
    // ===============================
    const totalRow = (label: string, value: number, bold = false) => {
      doc.setFont("courier", bold ? "bold" : "normal");
      doc.setFontSize(8);

      doc.text(label, margin, y);

      const valueText = formatNumber(value);

      doc.text(
        valueText,
        pageWidth - margin,
        y,
        { align: "right" }
      );

      y += 4.5;
    };

    totalRow("Subtotal", completedSale.subtotal);

    if (completedSale.totalGst > 0) {
      totalRow("GST", completedSale.totalGst);
    }

    if (completedSale.totalDiscount > 0) {
      totalRow("Discount", completedSale.totalDiscount);
    }

    line();

    totalRow("Grand Total", completedSale.grandTotal, true);

    line();

    totalRow("Paid", completedSale.paidAmount);

    totalRow("Due", completedSale.dueAmount, true);

    line();

    // ===============================
    // Footer
    // ===============================
    centerText("Thank You Visit Again", 8, "bold");
    centerText("Software By New Mandal Cosmetic", 6);

    // ===============================
    // Save
    // ===============================
    doc.save(
      `Invoice-${completedSale.invoiceNumber}.pdf`
    );

    toast.success("PDF Generated Successfully", {
      id: toastId,
    });
  } catch (error) {
    console.error(error);

    toast.error("Failed to Generate PDF", {
      id: toastId,
    });
  }
}
