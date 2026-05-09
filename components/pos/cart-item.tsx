// components/pos/cart-item.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Trash2 } from "lucide-react";
import { CartItem as CartItemType } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

interface CartItemProps {
  item: CartItemType;
  lineGst: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onDiscountChange: (productId: string, value: string) => void;
}

export function CartItemRow({
  item,
  lineGst,
  onUpdateQuantity,
  onRemove,
  onDiscountChange,
}: CartItemProps) {
  return (
    <div className="p-1.5 rounded-xl bg-card border border-border/50 shadow-sm animate-in slide-in-from-right duration-300 relative">
      {/* Name & trash */}
      <div className="flex justify-between items-start gap-2 mb-1">
        <div className="flex flex-col pr-6">
          <span className="font-bold text-[10px] sm:text-[11px] leading-tight text-foreground line-clamp-1">
            {item.productName}
          </span>
          <span className="text-[7px] sm:text-[8px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
            GST {item.gstRate}% · {formatCurrency(lineGst)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 rounded-full text-destructive hover:bg-destructive/10 shrink-0 absolute top-1 right-1"
          onClick={() => onRemove(item.productId)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      {/* Quantity, Price, Discount */}
      <div className="flex flex-col gap-1 mt-1">
        <div className="flex items-center justify-between">
          {/* Quantity controls */}
          <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-0.5 border border-border/50">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-background"
              onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="w-6 text-center text-sm font-black text-foreground">
              {item.quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-background"
              onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          {/* Price */}
          <div className="text-right">
            <div className="font-black text-sm text-primary">
              {formatCurrency(item.sellingPrice * item.quantity - item.discount)}
            </div>
            <div className="text-[9px] text-muted-foreground font-bold">
              {formatCurrency(item.sellingPrice)}/u (incl. GST)
            </div>
          </div>
        </div>

        {/* Discount row */}
        <div className="flex items-center gap-2">
          <Label className="text-[10px] font-bold text-muted-foreground shrink-0">
            Disc.:
          </Label>
          <Input
            type="number"
            placeholder="0"
            value={item.discount || ""}
            onChange={(e) => onDiscountChange(item.productId, e.target.value)}
            className="h-7 w-16 text-sm p-1 text-right rounded-md"
          />
        </div>
      </div>
    </div>
  );
}
