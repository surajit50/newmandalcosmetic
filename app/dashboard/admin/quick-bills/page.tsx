"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Plus, Zap, Search, X } from "lucide-react";

interface QuickBillItem {
  productId: string;
  productName?: string; // for display only
  quantity: number;
}

interface QuickBillPreset {
  id: string;
  label: string;
  items: QuickBillItem[];
}

interface ProductOption {
  id: string;
  name: string;
}

export default function QuickBillPresetsPage() {
  const [presets, setPresets] = useState<QuickBillPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [items, setItems] = useState<QuickBillItem[]>([
    { productId: "", productName: "", quantity: 1 },
  ]);
  const [creating, setCreating] = useState(false);

  // Product search state (per item row)
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});
  const [searchResults, setSearchResults] = useState<Record<number, ProductOption[]>>({});
  const [showDropdown, setShowDropdown] = useState<Record<number, boolean>>({});

  // Fetch presets
  const fetchPresets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quick-bill-presets");
      if (res.ok) setPresets(await res.json());
    } catch {
      toast.error("Failed to load presets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  // Product search function using your existing /api/products endpoint
  const searchProducts = useCallback(async (index: number, query: string) => {
    setSearchTerms(prev => ({ ...prev, [index]: query }));
    if (query.length < 2) {
      setSearchResults(prev => ({ ...prev, [index]: [] }));
      return;
    }
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const products = await res.json();
        setSearchResults(prev => ({
          ...prev,
          [index]: products.map((p: any) => ({ id: p.id, name: p.name })),
        }));
      }
    } catch (error) {
      console.error("Product search error:", error);
    }
  }, []);

  // Item row handlers
  const handleItemChange = (index: number, field: keyof QuickBillItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const addItem = () => {
    const newIndex = items.length;
    setItems([...items, { productId: "", productName: "", quantity: 1 }]);
    setShowDropdown(prev => ({ ...prev, [newIndex]: false }));
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
    // Clean up search state
    setSearchTerms(prev => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
    setSearchResults(prev => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  };

  // Select a product for an item row
  const selectProduct = (index: number, product: ProductOption) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: product.id,
      productName: product.name,
    };
    setItems(updated);
    setSearchTerms(prev => ({ ...prev, [index]: product.name }));
    setShowDropdown(prev => ({ ...prev, [index]: false }));
  };

  // Create preset
  const handleCreate = async () => {
    if (!label.trim()) {
      toast.error("Label is required");
      return;
    }
    for (const item of items) {
      if (!item.productId.trim()) {
        toast.error("Please select a product for each row");
        return;
      }
      if (item.quantity <= 0) {
        toast.error("Quantity must be > 0");
        return;
      }
    }

    setCreating(true);
    try {
      const res = await fetch("/api/quick-bill-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          items: items.map(({ productId, quantity }) => ({ productId, quantity })),
        }),
      });
      if (res.ok) {
        toast.success("Preset created!");
        setLabel("");
        setItems([{ productId: "", productName: "", quantity: 1 }]);
        fetchPresets();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create preset");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this preset?")) return;
    try {
      const res = await fetch(`/api/quick-bill-presets?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Preset deleted");
        fetchPresets();
      } else {
        const data = await res.json();
        toast.error(data.error || "Delete failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Zap className="w-6 h-6 text-primary" />
        Quick Bill Presets
      </h1>

      {/* Create Form */}
      <div className="border rounded-xl p-6 space-y-4 bg-card">
        <h2 className="font-semibold">Create New Preset</h2>

        <div>
          <label className="block text-sm mb-1">Label</label>
          <Input
            placeholder="e.g., Morning Combo"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm mb-2 flex items-center">
            <Search className="w-4 h-4 mr-1" />
            Products (search by name)
          </label>
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 mb-2 items-start relative">
              <div className="flex-1">
                <div className="relative">
                  <Input
                    placeholder="Search product..."
                    value={searchTerms[idx] || item.productName || ""}
                    onChange={(e) => {
                      searchProducts(idx, e.target.value);
                      setShowDropdown(prev => ({ ...prev, [idx]: true }));
                    }}
                    onFocus={() => {
                      if (searchResults[idx]?.length > 0)
                        setShowDropdown(prev => ({ ...prev, [idx]: true }));
                    }}
                  />
                  {/* Dropdown results */}
                  {showDropdown[idx] && searchResults[idx]?.length > 0 && (
                    <div className="absolute z-10 w-full bg-card border rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                      {searchResults[idx].map((product) => (
                        <div
                          key={product.id}
                          onClick={() => selectProduct(idx, product)}
                          className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                        >
                          {product.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <Input
                type="number"
                min={1}
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                className="w-24"
              />
              {items.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addItem} className="mt-2">
            <Plus className="w-4 h-4 mr-1" /> Add Product
          </Button>
        </div>

        <Button onClick={handleCreate} disabled={creating}>
          {creating ? "Creating..." : "Create Preset"}
        </Button>
      </div>

      {/* Presets List */}
      <div className="space-y-4">
        <h2 className="font-semibold">Existing Presets ({presets.length})</h2>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : presets.length === 0 ? (
          <p className="text-muted-foreground">No presets yet.</p>
        ) : (
          presets.map((preset) => (
            <div key={preset.id} className="border rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{preset.label}</p>
                <p className="text-sm text-muted-foreground">
                  {preset.items.length} products
                </p>
                <ul className="text-xs text-muted-foreground mt-1">
                  {preset.items.map((item, i) => (
                    <li key={i}>
                      {item.productId} × {item.quantity}
                    </li>
                  ))}
                </ul>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(preset.id)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
