"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

interface QuickBillItem {
  productId: string;
  quantity: number;
}

interface QuickBillPreset {
  id: string;
  label: string;
  items: QuickBillItem[];
}

export default function QuickBillPresetsPage() {
  const [presets, setPresets] = useState<QuickBillPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [items, setItems] = useState<QuickBillItem[]>([
    { productId: "", quantity: 1 },
  ]);
  const [creating, setCreating] = useState(false);

  // Fetch presets
  const fetchPresets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quick-bill-presets");
      if (res.ok) setPresets(await res.json());
    } catch (error) {
      toast.error("Failed to load presets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  // Handle item field changes
  const handleItemChange = (index: number, field: keyof QuickBillItem, value: string | number) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: field === "quantity" ? Number(value) : value,
    };
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { productId: "", quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Create new preset
  const handleCreate = async () => {
    if (!label.trim()) {
      toast.error("Label is required");
      return;
    }

    // Validate items
    for (const item of items) {
      if (!item.productId.trim()) {
        toast.error("All product IDs are required");
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
          items,
          // In production, pass the current admin user ID via session
          // createdBy: session.user.id
        }),
      });

      if (res.ok) {
        toast.success("Preset created!");
        setLabel("");
        setItems([{ productId: "", quantity: 1 }]);
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

  // Delete preset
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this preset?")) return;
    try {
      const res = await fetch(`/api/quick-bill-presets?id=${id}`, {
        method: "DELETE",
      });
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
      <h1 className="text-2xl font-bold">⚡ Quick Bill Presets</h1>

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
          <label className="block text-sm mb-2">Products</label>
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 mb-2 items-center">
              <Input
                placeholder="Product ID"
                value={item.productId}
                onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                min={1}
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                className="w-24"
              />
              {items.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(idx)}
                >
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
            <div
              key={preset.id}
              className="border rounded-lg p-4 flex items-center justify-between"
            >
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(preset.id)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
