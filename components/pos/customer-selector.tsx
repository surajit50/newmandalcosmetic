// components/pos/customer-selector.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Trash2, User } from "lucide-react";
import { Customer } from "@/lib/types";

interface CustomerSelectorProps {
  selected: Customer | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  onClear: () => void;
  onNewCustomer: () => void;
}

export function CustomerSelector({
  selected,
  searchQuery,
  onSearchChange,
  customers,
  onSelect,
  onClear,
  onNewCustomer,
}: CustomerSelectorProps) {
  return (
    <div className="flex-1 max-w-md mx-4">
      {selected ? (
        <div className="flex items-center justify-between gap-2 px-3 py-1 rounded-full bg-secondary border border-border shadow-inner animate-in slide-in-from-top duration-300">
          <div className="flex flex-col items-start leading-none overflow-hidden">
            <span className="text-[10px] font-bold text-foreground truncate w-full">
              {selected.name}
            </span>
            <span className="text-[8px] text-muted-foreground">
              {selected.phone}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
            onClick={onClear}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Customer..."
            className="pl-8 h-8 rounded-full bg-secondary/50 border-border/50 focus:bg-background transition-all text-xs"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {customers.length > 0 && (
            <Card className="absolute top-full left-0 right-0 z-50 mt-2 max-h-64 overflow-y-auto shadow-2xl border-border rounded-xl animate-in fade-in zoom-in duration-200">
              <CardContent className="p-1">
                {customers.map((c) => (
                  <div
                    key={c.id}
                    className="p-2 hover:bg-primary/10 cursor-pointer rounded-lg flex justify-between items-center transition-colors group/item"
                    onClick={() => {
                      onSelect(c);
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground group-hover/item:text-primary transition-colors">
                        {c.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {c.phone}
                      </span>
                    </div>
                    <Plus className="w-3 h-3 text-muted-foreground group-hover/item:text-primary transition-colors" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        className="h-8 rounded-full border-primary/20 text-primary hover:bg-primary/10 px-3 ml-2 hidden sm:inline-flex"
        onClick={onNewCustomer}
      >
        <Plus className="w-3 h-3 sm:mr-1" />
        <span className="text-[10px] font-bold uppercase tracking-tighter">NEW</span>
      </Button>
    </div>
  );
}
