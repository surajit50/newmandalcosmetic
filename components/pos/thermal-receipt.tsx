// components/pos/thermal-receipt.tsx
interface ReceiptItem {
  productName: string;
  quantity: number;
  sellingPrice: number;
  discount: number;
  gstRate: number;
  total: number; // line total after discount (sellingPrice * quantity – discount)
}

interface ThermalReceiptProps {
  shopName: string;
  address?: string;
  phone?: string;
  gstin?: string;
  invoiceNumber: string;
  date: Date;
  customerName?: string;
  items: ReceiptItem[];
  subtotal: number;
  totalGst: number;
  totalDiscount: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
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
}: ThermalReceiptProps) {
  const currency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);

  const dateStr = date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const changeAmount = paidAmount - grandTotal;

  return (
    <div className="receipt">
      {/* Shop Header */}
      <div className="center bold">{shopName.toUpperCase()}</div>
      {address && <div className="center">{address}</div>}
      {phone && <div className="center">Ph: {phone}</div>}
      {gstin && <div className="center">GSTIN: {gstin}</div>}

      <div className="line" />

      {/* Invoice Details */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Invoice: {invoiceNumber}</span>
        <span>{dateStr}</span>
      </div>
      <div>Customer: {customerName || "Walk-in"}</div>

      <div className="line" />

      {/* Item Table */}
      <table>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Item</th>
            <th style={{ textAlign: "right", width: "10mm" }}>Qty</th>
            <th style={{ textAlign: "right", width: "14mm" }}>Rate</th>
            <th style={{ textAlign: "right", width: "12mm" }}>Disc</th>
            <th style={{ textAlign: "right", width: "16mm" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td>{item.productName}</td>
              <td className="right">{item.quantity}</td>
              <td className="right">{currency(item.sellingPrice)}</td>
              <td className="right">{item.discount > 0 ? currency(item.discount) : "-"}</td>
              <td className="right">{currency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="line" />

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Subtotal</span>
        <span>{currency(subtotal)}</span>
      </div>
      {totalDiscount > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Discount</span>
          <span>-{currency(totalDiscount)}</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Taxable</span>
        <span>{currency(subtotal - totalDiscount)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>GST</span>
        <span>{currency(totalGst)}</span>
      </div>

      <div className="line" />

      <div
        className="bold total"
        style={{ display: "flex", justifyContent: "space-between" }}
      >
        <span>GRAND TOTAL</span>
        <span>₹ {currency(grandTotal)}</span>
      </div>

      <div className="line" />

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Paid</span>
        <span>{currency(paidAmount)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Due</span>
        <span>{currency(dueAmount)}</span>
      </div>
      {changeAmount > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Change</span>
          <span>{currency(changeAmount)}</span>
        </div>
      )}

      <div className="line" />
      <div className="center">Thank you for your purchase!</div>
      <div className="center">Visit again</div>
      <div className="line" />
    </div>
  );
}
