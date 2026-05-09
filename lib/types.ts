import { ObjectId } from 'mongodb'

export type UserRole = 'admin' | 'manager' | 'cashier'
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

export interface User {
  _id?: ObjectId
  name: string
  email: string
  password: string
  role: UserRole
  phone?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Category {
  _id?: ObjectId
  name: string
  description?: string
  parentId?: ObjectId | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  _id?: ObjectId
  name: string
  sku: string
  barcode?: string
  categoryId: ObjectId
  description?: string
  unit: string // pcs, kg, ltr, box, etc.
  mrp: number
  sellingPrice: number
  purchasePrice: number
  gstRate: number // 0, 5, 12, 18, 28
  hsnCode?: string
  minStock: number
  currentStock: number
  supplierId?: ObjectId
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Customer {
  _id?: ObjectId
  name: string
  phone: string
  email?: string
  address?: string
  gstin?: string
  totalPurchases: number
  totalDue: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Supplier {
  _id?: ObjectId
  name: string
  phone: string
  email?: string
  address?: string
  gstin?: string
  totalPurchases: number
  totalDue: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PurchaseItem {
  productId: ObjectId
  productName: string
  quantity: number
  purchasePrice: number
  gstRate: number
  gstAmount: number
  total: number
}

export interface Purchase {
  _id?: ObjectId
  invoiceNumber: string
  supplierId: ObjectId
  supplierName: string
  items: PurchaseItem[]
  subtotal: number
  totalGst: number
  grandTotal: number
  paidAmount: number
  dueAmount: number
  paymentStatus: 'paid' | 'partial' | 'due'
  paymentMode?: 'cash' | 'upi' | 'card' | 'bank'
  notes?: string
  createdBy: ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface SaleItem {
  productId: ObjectId
  productName: string
  quantity: number
  mrp: number
  sellingPrice: number
  discount: number
  gstRate: number
  gstAmount: number
  total: number
}

export interface Sale {
  _id?: ObjectId
  invoiceNumber: string
  customerId?: ObjectId
  customerName: string
  customerPhone?: string
  items: SaleItem[]
  subtotal: number
  totalDiscount: number
  totalGst: number
  grandTotal: number
  paidAmount: number
  dueAmount: number
  paymentStatus: 'paid' | 'partial' | 'due'
  paymentMode: 'cash' | 'upi' | 'card' | 'bank'
  notes?: string
  createdBy: ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface StockMovement {
  _id?: ObjectId
  productId: ObjectId
  productName: string
  type: 'in' | 'out' | 'adjustment'
  quantity: number
  previousStock: number
  newStock: number
  referenceType: 'purchase' | 'sale' | 'adjustment' | 'return'
  referenceId?: ObjectId
  notes?: string
  createdBy: ObjectId
  createdAt: Date
}

export interface DuePayment {
  _id?: ObjectId
  type: 'customer' | 'supplier'
  partyId: ObjectId
  partyName: string
  referenceId: ObjectId
  referenceType: 'sale' | 'purchase'
  invoiceNumber: string
  totalAmount: number
  paidAmount: number
  dueAmount: number
  payments: {
    amount: number
    paymentMode: 'cash' | 'upi' | 'card' | 'bank'
    date: Date
    notes?: string
    receivedBy: ObjectId
  }[]
  status: 'pending' | 'partial' | 'cleared'
  createdAt: Date
  updatedAt: Date
}

export interface Settings {
  _id?: ObjectId
  shopName: string
  address: string
  phone: string
  email?: string
  gstin?: string
  invoicePrefix: string
  currentInvoiceNumber: number
  financialYearStart: Date
  financialYearEnd: Date
  updatedAt: Date
}

export interface AuditLog {
  _id?: ObjectId
  userId: ObjectId
  userName: string
  action: string
  module: string
  details: Record<string, unknown>
  ipAddress?: string
  createdAt: Date
}

export interface Expense {
  _id?: ObjectId
  category: 'rent' | 'salary' | 'utilities' | 'transport' | 'maintenance' | 'packaging' | 'other'
  description: string
  amount: number
  paymentMode: 'cash' | 'upi' | 'card' | 'bank'
  date: Date
  notes?: string
  createdBy: ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface CashbookEntry {
  _id?: ObjectId
  type: 'income' | 'expense'
  category: string
  description: string
  amount: number
  referenceType?: 'sale' | 'purchase' | 'expense' | 'due_collection' | 'supplier_payment'
  referenceId?: ObjectId
  balance: number
  date: Date
  createdBy: ObjectId
  createdAt: Date
}

export interface StockAdjustment {
  _id?: ObjectId
  productId: ObjectId
  productName: string
  adjustmentType: 'damage' | 'wastage' | 'expired' | 'theft' | 'correction' | 'opening'
  quantity: number
  previousStock: number
  newStock: number
  reason: string
  createdBy: ObjectId
  createdAt: Date
}

// Dashboard Stats
export interface DashboardStats {
  todaySales: number
  todayOrders: number
  totalCustomers: number
  lowStockItems: number
  totalDueFromCustomers: number
  totalDueToSuppliers: number
  monthlySales: { date: string; amount: number }[]
  topProducts: { name: string; quantity: number }[]
  recentSales: Sale[]
}

// Invoice number format: INV/24-25/0001
export function generateInvoiceNumber(prefix: string, number: number): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 0-indexed
  
  // Financial year starts in April
  let fyStart: number
  let fyEnd: number
  
  if (month >= 4) {
    fyStart = year % 100
    fyEnd = (year + 1) % 100
  } else {
    fyStart = (year - 1) % 100
    fyEnd = year % 100
  }
  
  const paddedNumber = number.toString().padStart(4, '0')
  return `${prefix}/${fyStart}-${fyEnd}/${paddedNumber}`
}
