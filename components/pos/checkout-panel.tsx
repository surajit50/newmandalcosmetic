// components/pos/checkout-panel.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Loader2, IndianRupee, Banknote, Smartphone, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { PaymentMode } from "@/lib/types";

interface CheckoutPanelProps {
  itemCount: number;
  subtotal: number;
  totalDiscount: number;
  totalGst: number;
  grandTotal: number;
  paymentMode: PaymentMode;
  paidAmount: string;
  dueAmount: number;
  isOverpaid: boolean;
  isProcessing: boolean;
  onPaymentModeChange: (mode: PaymentMode) => void;
  onPaidAmountChange: (value: string) => void;
  onCheckout: () => void;
}

const paymentIcons: Record<PaymentMode, JSX.Element> = {
  CASH: <Banknote className="w-3.5 h-3.5" />,
  UPI: <Smartphone className="w-3.5 h-3.5" />,
  CARD: <CreditCard className="w-3.5 h-3.5" />,
  BANK: <CreditCard className="w-3.5 h-3.5" />,
};

export function CheckoutPanel({
  itemCount,
  subtotal,
  totalDiscount,
  totalGst,
  grandTotal,
  paymentMode,
  paidAmount,
  dueAmount,
  isOverpaid,
  isProcessing,
  onPaymentModeChange,
  onPaidAmountChange,
  onCheckout,
}: CheckoutPanelProps) {
  const paidAmountNum = parseFloat(paidAmount) || 0;
  return (
    <div className="p-3 sm:p-4 bg-card border-t border-border shadow-2xl space-y-3">
      {/* Totals */}
      <div className="space-y-1">
        <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {totalDiscount > 0 && (
          <div className="flex justify-between text-[9px] font-bold text-red-500 uppercase tracking-widest">
            <span>Discount</span>
            <span>-{formatCurrency(totalDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
          <span>Tax (GST)</span>
          <span>{formatCurrency(totalGst)}</span>
        </div>
        <div className="flex justify-between items-end pt-1">
          <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Total</span>
          <span className="text-xl font-black text-primary leading-none">{formatCurrency(grandTotal)}</span>
        </div>
        <div className="text-[9px] text-muted-foreground text-right">(Prices include GST)</div>
      </div>

      {/* Payment Mode */}
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(paymentIcons) as PaymentMode[]).map((mode) => (
          <Button
            key={mode}
            variant={paymentMode === mode ? "default" : "outline"}
            className={cn(
              "h-10 rounded-xl flex flex-col gap-0.5 transition-all p-0",
              paymentMode === mode ? "shadow-md shadow-primary/20 scale-105" : "bg-card border-border/50"
            )}
            onClick={() => onPaymentModeChange(mode)}
          >
            {paymentIcons[mode]}
            <span className="text-[8px] font-bold uppercase tracking-tighter">{mode}</span>
          </Button>
        ))}
      </div>

      {/* Paid Amount */}
      <div className="space-y-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] font-black uppercase text-muted-foreground">Paid Amount</span>
          {dueAmount > 0 && (
            <span className="text-[9px] font-black text-destructive uppercase animate-pulse">
              Due: {formatCurrency(dueAmount)}
            </span>
          )}
          {isOverpaid && (
            <span className="text-[9px] font-black text-amber-600 uppercase">
              Overpay {formatCurrency(paidAmountNum - grandTotal)}
            </span>
          )}
        </div>
        <div className="relative">
          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="number"
            placeholder={grandTotal.toFixed(0)}
            value={paidAmount}
            onChange={(e) => onPaidAmountChange(e.target.value)}
            className={cn(
              "pl-9 h-10 text-lg font-black rounded-xl bg-secondary/30 border-border/50 focus:bg-background transition-all",
              isOverpaid && "border-amber-500 focus:ring-amber-500"
            )}
          />
        </div>
        {isOverpaid && (
          <p className="text-[10px] text-amber-600 font-medium">
            Paid amount exceeds the total. Please adjust.
          </p>
        )}
      </div>

      <Button
        className="w-full h-12 text-sm font-black rounded-xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] group"
        disabled={itemCount === 0 || isProcessing || isOverpaid}
        onClick={onCheckout}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <ShoppingCart className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
        )}
        COMPLETE BILL
      </Button>
    </div>
  );
}
