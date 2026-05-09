'use client'

import { format } from 'date-fns'

interface ReceiptItem {
  productName: string
  quantity: number
  sellingPrice: number
  total: number
}

interface ReceiptProps {
  shopName: string
  address: string
  phone: string
  gstin?: string
  invoiceNumber: string
  date: Date
  customerName: string
  items: ReceiptItem[]
  subtotal: number
  totalGst: number
  totalDiscount: number
  grandTotal: number
  paidAmount: number
  dueAmount: number
}

export function ThermalReceipt({
  shopName,
  address,
  phone,
  gstin,
  invoiceNumber,
  date,
  customerName,
  items,
  subtotal,
  totalGst,
  totalDiscount,
  grandTotal,
  paidAmount,
  dueAmount,
}: ReceiptProps) {
  return (
    <div className="w-[80mm] p-2 bg-white text-black font-mono text-[10px] leading-tight">
      <div className="text-center space-y-1 mb-2">
        <h1 className="text-[14px] font-bold uppercase">{shopName}</h1>
        <p className="whitespace-pre-line">{address}</p>
        <p>Ph: {phone}</p>
        {gstin && <p>GSTIN: {gstin}</p>}
      </div>

      <div className="border-t border-b border-black border-dashed py-1 my-1">
        <div className="flex justify-between">
          <span>Inv: {invoiceNumber}</span>
          <span>{format(date, 'dd/MM/yy HH:mm')}</span>
        </div>
        <div>Customer: {customerName}</div>
      </div>

      <table className="w-full my-2">
        <thead>
          <tr className="border-b border-black border-dashed">
            <th className="text-left font-normal py-1">Item</th>
            <th className="text-right font-normal py-1">Qty</th>
            <th className="text-right font-normal py-1">Rate</th>
            <th className="text-right font-normal py-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td className="py-1">{item.productName}</td>
              <td className="text-right py-1">{item.quantity}</td>
              <td className="text-right py-1">{item.sellingPrice.toFixed(0)}</td>
              <td className="text-right py-1">{item.total.toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-black border-dashed pt-1 space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{subtotal.toFixed(2)}</span>
        </div>
        {totalGst > 0 && (
          <div className="flex justify-between">
            <span>GST:</span>
            <span>{totalGst.toFixed(2)}</span>
          </div>
        )}
        {totalDiscount > 0 && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>-{totalDiscount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-[12px] border-t border-black border-double pt-1">
          <span>GRAND TOTAL:</span>
          <span>₹{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-2 space-y-0.5">
        <div className="flex justify-between">
          <span>Paid:</span>
          <span>{paidAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Balance Due:</span>
          <span>{dueAmount.toFixed(2)}</span>
        </div>
      </div>

      <div className="text-center mt-4 space-y-1">
        <p className="font-bold">THANK YOU!</p>
        <p>Please come again.</p>
        <div className="pt-2 border-t border-black border-dashed">
          <p className="text-[8px]">Software by New Mandal Cosmetic ERP</p>
        </div>
      </div>
    </div>
  )
}
