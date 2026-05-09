// components/pos/search-bar.tsx
"use client";

import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Package } from "lucide-react";
import { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

interface SearchBarProps {
  query: string;
  onChange: (value: string) => void;
  results: Product[];
  onSelect: (product: Product) => void;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ query, onChange, results, onSelect }, ref) => {
    return (
      <div className="relative mb-3 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          ref={ref}
          placeholder="Search items or scan..."
          className="pl-10 h-10 rounded-xl bg-card border-border/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm text-sm"
          value={query}
          onChange={(e) => onChange(e.target.value)}
        />
        {results.length > 0 && (
          <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[400px] overflow-y-auto shadow-2xl border-border rounded-xl animate-in fade-in zoom-in duration-200">
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {results.map((p) => (
                  <div
                    key={p.id}
                    className="p-2 sm:p-3 hover:bg-primary/5 cursor-pointer transition-all flex items-center justify-between group/prod"
                    onClick={() => onSelect(p)}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center border border-border/50 group-hover/prod:scale-110 transition-transform">
                        <Package className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] sm:text-xs font-bold text-foreground group-hover/prod:text-primary transition-colors truncate">
                          {p.name}
                        </span>
                        <span className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-medium tracking-tighter">
                          {p.barcode || "No barcode"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-black text-primary">
                        {formatCurrency(p.sellingPrice)}
                      </div>
                      <div className="text-[7px] sm:text-[8px] text-muted-foreground uppercase font-bold tracking-widest">
                        Stock: {p.currentStock}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
);

SearchBar.displayName = "SearchBar";
