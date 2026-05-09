// lib/print-receipt.ts
import ReactDOMServer from "react-dom/server";
import { ThermalReceipt } from "@/components/pos/thermal-receipt";

interface PrintReceiptParams {
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
  printFrameRef: React.RefObject<HTMLIFrameElement | null>;
}

export function printReceipt({ completedSale, shopSettings, printFrameRef }: PrintReceiptParams) {
  if (!printFrameRef.current) return;

  // Ensure every item has a 'total' field
  const receiptItems = completedSale.items.map((item: any) => ({
    ...item,
    total: item.total ?? (item.sellingPrice * item.quantity - (item.discount || 0)),
  }));

  const receiptHtml = ReactDOMServer.renderToString(
    ThermalReceipt({
      shopName: shopSettings.shopName,
      address: shopSettings.address,
      phone: shopSettings.phone,
      gstin: shopSettings.gstin,
      invoiceNumber: completedSale.invoiceNumber,
      date: new Date(completedSale.createdAt),
      customerName: completedSale.customerName || "Walk-in Customer",
      items: receiptItems,
      subtotal: completedSale.subtotal,
      totalGst: completedSale.totalGst,
      totalDiscount: completedSale.totalDiscount,
      grandTotal: completedSale.grandTotal,
      paidAmount: completedSale.paidAmount,
      dueAmount: completedSale.dueAmount,
    })
  );

  const frame = printFrameRef.current;
  const doc = frame.contentDocument || frame.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <html>
    <head>
      <title>Receipt</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        html, body { width: 80mm; margin: 0; padding: 0; font-family: monospace; background: white; }
        body { padding: 4mm; box-sizing: border-box; }
        .receipt { width: 72mm; margin: 0 auto; font-size: 12px; color: black; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed black; margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { padding: 2px 0; }
        .right { text-align: right; }
        .total { font-size: 14px; font-weight: bold; }
        @media print { html, body { width: 80mm; height: auto; } body { margin: 0; } .receipt { width: 72mm; } }
      </style>
    </head>
    <body>
      <div class="receipt">${receiptHtml}</div>
      <script>window.onload = () => { window.print(); };</script>
    </body>
    </html>
  `);
  doc.close();
}
