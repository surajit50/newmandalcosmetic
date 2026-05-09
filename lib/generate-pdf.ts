// lib/generate-pdf.ts
import jsPDF from "jspdf";
import { toast } from "sonner";

// ---------- Types ----------
interface ReceiptItem {
  productName: string;
  quantity: number;
  sellingPrice: number;
  discount?: number;
  total?: number;               // line total after discount (sellingPrice * quantity - discount)
}

interface ShopSettings {
  shopName: string;
  address?: string;
  phone?: string;
  gstin?: string;
}

interface SaleData {
  invoiceNumber: string;
  createdAt: string;
  customerName?: string;
  items: ReceiptItem[];
  subtotal: number;
  totalGst: number;
  totalDiscount: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
}

// ---------- Constants ----------
const PAGE_WIDTH = 80;          // mm
const MARGIN = 4;               // mm
const FONT_FAMILY = "courier";
const FONT_SIZES = {
  header: 12,
  body: 9,
  small: 8,
  total: 11,
};

const COLUMNS = {
  item: { x: MARGIN, width: 28 },
  qty:  { x: 30, width: 10 },
  rate: { x: 40, width: 10 },
  disc: { x: 50, width: 10 },
  amt:  { x: 65, width: 15 },
};

// ---------- Helpers ----------
const formatNumber = (val: number): string =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);

/** Returns truncated product name that fits within COLUMNS.item.width */
const truncateName = (name: string, maxChars = 16): string => {
  if (name.length <= maxChars) return name;
  if (maxChars <= 2) return name.substring(0, maxChars);
  return name.substring(0, maxChars - 1) + ".";
};

// Builder class to encapsulate jsPDF operations
class ReceiptBuilder {
  private y: number;
  private doc: jsPDF;

  constructor(doc: jsPDF, startY = 6) {
    this.doc = doc;
    this.y = startY;
  }

  get currentY() { return this.y; }
  set currentY(val: number) { this.y = val; }

  font(size: number, style: "normal" | "bold" = "normal") {
    this.doc.setFont(FONT_FAMILY, style);
    this.doc.setFontSize(size);
  }

  center(text: string, size = FONT_SIZES.body, style: "normal" | "bold" = "normal", yOffset = 1.5) {
    this.font(size, style);
    const w = this.doc.getTextWidth(text);
    this.doc.text(text, (PAGE_WIDTH - w) / 2, this.y);
    this.y += size * 0.5 + yOffset;
  }

  left(text: string, size = FONT_SIZES.body, yOffset = 1.2) {
    this.font(size);
    this.doc.text(text, MARGIN, this.y);
    this.y += size * 0.5 + yOffset;
  }

  right(text: string, size = FONT_SIZES.body) {
    this.font(size);
    const w = this.doc.getTextWidth(text);
    this.doc.text(text, PAGE_WIDTH - MARGIN - w, this.y);
  }

  twoColumn(left: string, right: string, size = FONT_SIZES.body, style: "normal" | "bold" = "normal", yOffset = 1.2) {
    this.font(size, style);
    this.doc.text(left, MARGIN, this.y);
    const rw = this.doc.getTextWidth(right);
    this.doc.text(right, PAGE_WIDTH - MARGIN - rw, this.y);
    this.y += size * 0.5 + yOffset;
  }

  dashedLine() {
    let x = MARGIN;
    while (x < PAGE_WIDTH - MARGIN) {
      this.doc.line(x, this.y, x + 1.5, this.y);
      x += 3;
    }
    this.y += 3;
  }

  solidLine() {
    this.doc.line(MARGIN, this.y, PAGE_WIDTH - MARGIN, this.y);
    this.y += 2;
  }

  /** Writes the table header */
  writeTableHeader() {
    this.font(FONT_SIZES.small, "bold");
    this.doc.text("Item", COLUMNS.item.x, this.y);
    this.doc.text("Qty", COLUMNS.qty.x, this.y);
    this.doc.text("Rate", COLUMNS.rate.x, this.y);
    this.doc.text("Disc", COLUMNS.disc.x, this.y);
    this.doc.text("Amt", COLUMNS.amt.x, this.y);
    this.y += 4;
    this.font(FONT_SIZES.small); // reset to normal
  }

  /** Writes one item row */
  writeItem(item: ReceiptItem) {
    const name = truncateName(item.productName, 16);
    const discount = item.discount && item.discount > 0 ? formatNumber(item.discount) : "-";
    const lineTotal = item.total ?? (item.sellingPrice * item.quantity - (item.discount || 0));
    this.font(FONT_SIZES.small);
    this.doc.text(name, COLUMNS.item.x, this.y);
    this.doc.text(String(item.quantity), COLUMNS.qty.x, this.y);
    this.doc.text(formatNumber(item.sellingPrice), COLUMNS.rate.x, this.y);
    this.doc.text(discount, COLUMNS.disc.x, this.y);
    this.doc.text(formatNumber(lineTotal), COLUMNS.amt.x, this.y);
    this.y += 4;
  }
}

// ---------- Main Function ----------
export async function generatePDF(sale: SaleData, settings: ShopSettings) {
  const toastId = toast.loading("Generating PDF...");
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [PAGE_WIDTH, 120], // initial height, will be adjusted
    });

    const rb = new ReceiptBuilder(doc, 6);

    // ----- Header -----
    rb.center(settings.shopName.toUpperCase(), FONT_SIZES.header, "bold");
    if (settings.address) rb.center(settings.address, FONT_SIZES.small);
    if (settings.phone) rb.center(`Phone: ${settings.phone}`, FONT_SIZES.small);
    if (settings.gstin) rb.center(`GSTIN: ${settings.gstin}`, FONT_SIZES.small);
    rb.dashedLine();

    // Invoice details
    rb.left(`Invoice: ${sale.invoiceNumber}`, FONT_SIZES.body);
    const dateLineY = rb.currentY; // save Y after left
    rb.right(
      new Date(sale.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      FONT_SIZES.body
    );
    rb.currentY = dateLineY + 4; // next line
    rb.left(`Customer: ${sale.customerName || "Walk-in"}`, FONT_SIZES.body);
    rb.dashedLine();

    // ----- Table -----
    rb.writeTableHeader();
    sale.items.forEach((item) => rb.writeItem(item));
    rb.dashedLine();

    // ----- Totals -----
    const taxable = sale.subtotal - sale.totalDiscount;
    rb.twoColumn("Subtotal", formatNumber(sale.subtotal));
    if (sale.totalDiscount > 0)
      rb.twoColumn("Discount", "-" + formatNumber(sale.totalDiscount));
    rb.twoColumn("Taxable", formatNumber(taxable));
    rb.twoColumn("GST", formatNumber(sale.totalGst));
    rb.solidLine();
    rb.twoColumn("TOTAL", "₹ " + formatNumber(sale.grandTotal), FONT_SIZES.total, "bold");

    rb.dashedLine();

    // ----- Payment -----
    rb.twoColumn("Paid", formatNumber(sale.paidAmount));
    rb.twoColumn("Due", formatNumber(sale.dueAmount));
    const change = sale.paidAmount - sale.grandTotal;
    if (change > 0) {
      rb.twoColumn("Change", formatNumber(change));
    }

    rb.dashedLine();
    rb.center("Thank you for your purchase!", FONT_SIZES.small);
    rb.center("Visit again", FONT_SIZES.small);
    rb.currentY += 4;

    // ----- Finalise -----
    const finalHeight = rb.currentY + 5;
    (doc as any).internal.pageSize.height = finalHeight;
    doc.save(`Invoice-${sale.invoiceNumber}.pdf`);

    toast.success("PDF downloaded successfully", { id: toastId });
  } catch (error) {
    console.error("PDF Error:", error);
    toast.error("Failed to generate PDF", { id: toastId });
  }
}
