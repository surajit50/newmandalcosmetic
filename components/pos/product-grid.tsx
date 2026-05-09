// components/pos/product-grid.tsx
"use client";

import { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Plus, Package } from "lucide-react";

interface ProductGridProps {
  products: Product[];
  onAdd: (product: Product) => void;
}

export function ProductGrid({ products, onAdd }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5 sm:gap-2">
      {products
        .filter((p) => p.currentStock > 0)
        .slice(0, 40)
        .map((p) => (
          <div
            key={p.id}
            className="group bg-card hover:bg-primary/5 cursor-pointer transition-all active:scale-[0.98] border border-border/50 rounded-lg p-2 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center justify-start"
            onClick={() => onAdd(p)}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-full">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <h3 className="font-bold text-[10px] sm:text-xs text-foreground truncate group-hover:text-primary transition-colors leading-tight">
                  {p.name}
                </h3>
                <div className="flex items-center justify-between sm:justify-start gap-2 mt-0.5">
                  <span className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-bold tracking-tighter truncate">
                    {p.barcode || "No SKU"}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-black text-primary/80">
                    {formatCurrency(p.sellingPrice)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 gap-1">
              <Badge
                variant="secondary"
                className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0 h-3.5 sm:h-4 font-bold bg-secondary/80"
              >
                {p.currentStock} {p.unit}
              </Badge>
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center sm:scale-0 group-hover:scale-100 transition-transform">
                <Plus className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
