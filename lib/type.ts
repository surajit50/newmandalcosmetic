// lib/types.ts
export interface Product {
  id: string;
  name: string;
  barcode?: string;
  mrp: number;
  sellingPrice: number;
  gstRate: number;
  currentStock: number;
  unit: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  mrp: number;
  sellingPrice: number;
  discount: number;
  gstRate: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  totalDue: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  grandTotal: number;
  subtotal: number;
  totalGst: number;
  totalDiscount: number;
  paidAmount: number;
  dueAmount: number;
  createdAt: string;
  customerName: string;
  items: any[];   // keep flexible, backend returns raw items
}

export type PaymentMode = "CASH" | "UPI" | "CARD" | "BANK";
