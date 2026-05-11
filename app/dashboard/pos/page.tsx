// app/pos/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, X, UserPlus, Zap, Trash2 } from "lucide-react";
import { ThermalReceipt } from "@/components/pos/thermal-receipt";
import { SearchBar } from "@/components/pos/search-bar";
import { ProductGrid } from "@/components/pos/product-grid";
import { CustomerSelector } from "@/components/pos/customer-selector";
import { CartItemRow } from "@/components/pos/cart-item";
import { CheckoutPanel } from "@/components/pos/checkout-panel";
import { SuccessDialog } from "@/components/pos/success-dialog";
import { NewCustomerDialog } from "@/components/pos/new-customer-dialog";
import { toast } from "sonner";
import { Product, CartItem, Customer, Sale, PaymentMode } from "@/lib/type";
import { printReceipt } from "@/lib/print-receipt";
import { generatePDF } from "@/lib/generate-pdf";

interface QuickBillPreset {
  id: string;
  label: string;
  items: { productId: string; quantity: number }[];
}

export default function POSPage() {
  // ---------- State ----------
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [paidAmount, setPaidAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });
  const [shopSettings, setShopSettings] = useState<any>(null);

  // Mobile‑only
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileCustomerOpen, setMobileCustomerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Quick Bill
  const [quickBillOpen, setQuickBillOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<QuickBillPreset | null>(null);
  const [quickBillPresets, setQuickBillPresets] = useState<QuickBillPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(true);

  // ---- NEW: editable items for Quick Bill ----
  const [editingItems, setEditingItems] = useState<CartItem[] | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  // ---------- Data Fetching ----------
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) setProducts(await res.json());
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  }, []);

  const fetchCustomers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setCustomers([]);
      return;
    }
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}`);
      if (res.ok) setCustomers(await res.json());
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed");
      setShopSettings(await res.json());
    } catch (error) {
      toast.error("Could not load shop settings");
    }
  };

  const fetchPresets = async () => {
    setPresetsLoading(true);
    try {
      const res = await fetch("/api/quick-bill-presets");
      if (res.ok) {
        const data = await res.json();
        setQuickBillPresets(data);
      } else {
        toast.error("Could not load quick bill presets");
      }
    } catch {
      toast.error("Network error loading presets");
    } finally {
      setPresetsLoading(false);
    }
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 767);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchSettings();
    fetchPresets();
  }, [fetchProducts]);

  useEffect(() => {
    const debounce = setTimeout(() => fetchCustomers(customerSearch), 300);
    return () => clearTimeout(debounce);
  }, [customerSearch, fetchCustomers]);

  const searchResults = useMemo(() => {
    if (searchQuery.length < 1) return [];
    const q = searchQuery.toLowerCase();
    return products
      .filter(p => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q)))
      .slice(0, 10);
  }, [searchQuery, products]);

  useEffect(() => {
    if (isMobile) {
      searchInputRef.current?.focus();
    }
  }, [isMobile]);

  useEffect(() => {
    if (!mobileCustomerOpen && isMobile) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [mobileCustomerOpen, isMobile]);

  // ---------- Cart Operations ----------
  const addToCart = useCallback((product: Product) => {
    if (product.currentStock <= 0) {
      toast.error("Product is out of stock", { duration: 2000, position: isMobile ? "bottom-center" : "top-center" });
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          toast.error("Not enough stock available", { duration: 2000, position: isMobile ? "bottom-center" : "top-center" });
          return prev;
        }
        return prev.map(item =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            mrp: product.mrp,
            sellingPrice: product.sellingPrice,
            discount: 0,
            gstRate: product.gstRate,
          },
        ];
      }
    });
    setSearchQuery("");
    toast.success(`${product.name} added to cart`, {
      duration: 1000,
      position: isMobile ? "bottom-center" : "top-center",
    });
  }, [isMobile]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      return removeFromCart(productId);
    }
    setCart(prev =>
      prev.map(item => {
        if (item.productId !== productId) return item;
        const product = products.find(p => p.id === productId);
        if (product && quantity > product.currentStock) {
          toast.error("Not enough stock available", { duration: 2000, position: isMobile ? "bottom-center" : "top-center" });
          return item;
        }
        return { ...item, quantity };
      })
    );
  }, [products, isMobile]);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  }, []);

  const handleDiscountChange = useCallback((productId: string, raw: string) => {
    const val = parseFloat(raw) || 0;
    setCart(prev =>
      prev.map(item => {
        if (item.productId !== productId) return item;
        const max = item.sellingPrice * item.quantity;
        return { ...item, discount: Math.min(val, max) };
      })
    );
  }, []);

  // ---------- Computed Cart Totals ----------
  const { subtotal, totalDiscount, totalGst, grandTotal, lineGstMap } = useMemo(() => {
    const map: Record<string, number> = {};
    let sub = 0, disc = 0, gst = 0;
    cart.forEach(item => {
      const lineTotal = item.sellingPrice * item.quantity;
      const incl = lineTotal - item.discount;
      const taxable = incl / (1 + item.gstRate / 100);
      const lg = incl - taxable;
      map[item.productId] = lg;
      sub += lineTotal;
      disc += item.discount;
      gst += lg;
    });
    return { subtotal: sub, totalDiscount: disc, totalGst: gst, grandTotal: sub - disc, lineGstMap: map };
  }, [cart]);

  const paidAmountNum = parseFloat(paidAmount) || 0;
  const dueAmount = grandTotal - paidAmountNum;
  const isOverpaid = paidAmountNum > grandTotal && grandTotal > 0;

  // ---------- Checkout ----------
  const handleCheckout = useCallback(async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty", { duration: 2000 });
      return;
    }
    if (isOverpaid) {
      toast.error("Paid amount exceeds the total.", { duration: 3000 });
      return;
    }
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            mrp: item.mrp,
            sellingPrice: item.sellingPrice,
            discount: item.discount,
            gstRate: item.gstRate,
          })),
          customerId: selectedCustomer?.id || null,
          customerName: selectedCustomer?.name || "Walk-in Customer",
          customerPhone: selectedCustomer?.phone || null,
          paymentMode,
          paidAmount: paidAmount || grandTotal.toString(),
        }),
      });
      if (res.ok) {
        const sale = await res.json();
        setCompletedSale(sale);
        setShowSuccess(true);
        setCart([]);
        setSelectedCustomer(null);
        setPaidAmount("");
        setCartOpen(false);
        fetchProducts();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to process sale", { duration: 3000 });
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to process sale", { duration: 3000 });
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [cart, isOverpaid, selectedCustomer, paymentMode, paidAmount, grandTotal, fetchProducts]);

  // ---------- Quick Bill Helpers ----------
  const resolvePresetItems = useCallback(
    (preset: QuickBillPreset): CartItem[] => {
      return preset.items
        .map(pi => {
          const product = products.find(p => p.id === pi.productId);
          if (!product) return null;
          return {
            productId: product.id,
            productName: product.name,
            quantity: pi.quantity,
            mrp: product.mrp,
            sellingPrice: product.sellingPrice,
            discount: 0,
            gstRate: product.gstRate,
          };
        })
        .filter(Boolean) as CartItem[];
    },
    [products]
  );

  const handleQuickBillCheckout = useCallback(async () => {
    if (!editingItems || editingItems.length === 0) {
      toast.error("No items in the Quick Bill");
      return;
    }
    if (processingRef.current) return;

    // Stock validation
    const missing: string[] = [];
    for (const item of editingItems) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        missing.push(`${item.productName} (product not found)`);
      } else if (product.currentStock <= 0) {
        missing.push(`${item.productName} (out of stock)`);
      } else if (item.quantity > product.currentStock) {
        missing.push(`${item.productName} (only ${product.currentStock} available)`);
      }
    }
    if (missing.length > 0) {
      toast.error(`Cannot complete: ${missing.join(", ")}`, { duration: 4000 });
      return;
    }

    const subtotal = editingItems.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
    const grandTotal = subtotal; // no discount for quick bill items (discount can be added if needed)
    const finalPaidAmount = paidAmountNum > 0 ? paidAmountNum : grandTotal;

    if (finalPaidAmount > grandTotal) {
      toast.error("Paid amount exceeds total", { duration: 2000 });
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: editingItems.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            mrp: item.mrp,
            sellingPrice: item.sellingPrice,
            discount: item.discount,
            gstRate: item.gstRate,
          })),
          customerId: selectedCustomer?.id || null,
          customerName: selectedCustomer?.name || "Walk-in Customer",
          customerPhone: selectedCustomer?.phone || null,
          paymentMode,
          paidAmount: finalPaidAmount.toString(),
        }),
      });
      if (res.ok) {
        const sale = await res.json();
        setCompletedSale(sale);
        setShowSuccess(true);
        resetQuickBill();
        fetchProducts();
        toast.success("Quick bill completed!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to process quick bill", { duration: 3000 });
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error", { duration: 3000 });
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [editingItems, products, paidAmountNum, paymentMode, selectedCustomer, fetchProducts]);

  // Reset Quick Bill state
  const resetQuickBill = () => {
    setQuickBillOpen(false);
    setSelectedPreset(null);
    setEditingItems(null);
    setPaidAmount("");
  };

  // Handlers for editing preset items
  const updateEditingItemQuantity = (index: number, newQty: number) => {
    if (!editingItems) return;
    const updated = [...editingItems];
    if (newQty <= 0) {
      // remove item
      updated.splice(index, 1);
    } else {
      const product = products.find(p => p.id === updated[index].productId);
      if (product && newQty > product.currentStock) {
        toast.error("Not enough stock", { duration: 2000 });
        return;
      }
      updated[index] = { ...updated[index], quantity: newQty };
    }
    setEditingItems(updated);
  };

  const removeEditingItem = (index: number) => {
    if (!editingItems) return;
    const updated = [...editingItems];
    updated.splice(index, 1);
    setEditingItems(updated);
  };

  // ---------- Print & PDF ----------
  const handlePrint = useCallback(() => {
    if (!completedSale || !shopSettings) {
      toast.error("Shop settings not loaded yet. Please wait.");
      return;
    }
    printReceipt({ completedSale, shopSettings, printFrameRef });
  }, [completedSale, shopSettings]);

  const handleSavePDF = useCallback(() => {
    if (!completedSale || !shopSettings) {
      toast.error("Shop settings not loaded yet. Please wait.");
      return;
    }
    generatePDF({ completedSale, shopSettings });
  }, [completedSale, shopSettings]);

  // ---------- New Customer ----------
  const handleNewCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      toast.error("Name and phone are required", { duration: 2000 });
      return;
    }
    try {
      const checkRes = await fetch(`/api/customers?search=${encodeURIComponent(newCustomer.phone)}`);
      if (checkRes.ok) {
        const existing = await checkRes.json();
        if (existing.length > 0) {
          const existingCust = existing[0];
          setSelectedCustomer(existingCust);
          setShowCustomerDialog(false);
          setNewCustomer({ name: "", phone: "" });
          setCustomerSearch("");
          setMobileCustomerOpen(false);
          toast.success(`Customer found: ${existingCust.name}`, { duration: 3000 });
          return;
        }
      }
    } catch (error) { /* proceed */ }
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });
      if (res.ok) {
        const customer = await res.json();
        setSelectedCustomer(customer);
        setShowCustomerDialog(false);
        setNewCustomer({ name: "", phone: "" });
        setCustomerSearch("");
        setMobileCustomerOpen(false);
        toast.success("Customer created", { duration: 2000 });
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create customer", { duration: 3000 });
      }
    } catch (error) {
      toast.error("Failed to create customer", { duration: 3000 });
    }
  };

  const openQuickBillModal = useCallback(() => {
    if (cart.length > 0) {
      if (!window.confirm("You have items in the main cart. Opening Quick Bill will not affect them. Continue?")) return;
    }
    setPaidAmount("");
    setQuickBillOpen(true);
  }, [cart.length]);

  // ---------- Shared Cart Content (unchanged) ----------
  const CartContent = () => (
    <>
      <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between bg-card/50">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-3.5 h-3.5 text-primary" />
          <h2 className="font-black text-xs tracking-tight uppercase">Order</h2>
        </div>
        <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground">
          {cart.length} ITEMS
        </Badge>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 opacity-30">
            <ShoppingCart className="w-10 h-10" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Cart is Empty</p>
          </div>
        ) : (
          cart.map(item => (
            <CartItemRow
              key={item.productId}
              item={item}
              lineGst={lineGstMap[item.productId] || 0}
              onUpdateQuantity={updateQuantity}
              onRemove={removeFromCart}
              onDiscountChange={handleDiscountChange}
            />
          ))
        )}
      </div>
      <CheckoutPanel
        itemCount={cart.length}
        subtotal={subtotal}
        totalDiscount={totalDiscount}
        totalGst={totalGst}
        grandTotal={grandTotal}
        paymentMode={paymentMode}
        paidAmount={paidAmount}
        dueAmount={dueAmount}
        isOverpaid={isOverpaid}
        isProcessing={isProcessing}
        onPaymentModeChange={setPaymentMode}
        onPaidAmountChange={setPaidAmount}
        onCheckout={handleCheckout}
      />
    </>
  );

  // ---------- Quick Bill Modal (UPDATED with editing) ----------
  const QuickBillModal = () => {
    if (!quickBillOpen) return null;

    const handlePresetSelect = (preset: QuickBillPreset) => {
      setSelectedPreset(preset);
      const resolved = resolvePresetItems(preset);
      setEditingItems(resolved);
      setPaidAmount("");
    };

    // Compute totals from editingItems
    const qbSubtotal = editingItems ? editingItems.reduce((sum, i) => sum + i.sellingPrice * i.quantity, 0) : 0;
    const qbGrandTotal = qbSubtotal; // no discount
    const qbItemCount = editingItems ? editingItems.length : 0;

    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-5 border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">⚡ Quick Bill</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => resetQuickBill()}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Customer info */}
          <div className="mb-4 text-sm flex items-center gap-2">
            <span className="text-muted-foreground">Customer:</span>
            <span className="font-medium">{selectedCustomer?.name || "Walk-in Customer"}</span>
            {selectedCustomer?.phone && (
              <span className="text-muted-foreground">({selectedCustomer.phone})</span>
            )}
            {selectedCustomer && (
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-xs text-destructive hover:underline ml-auto"
              >
                Remove
              </button>
            )}
          </div>

          {/* Step 1: Choose preset */}
          {!selectedPreset && (
            <div className="space-y-2">
              {presetsLoading && (
                <div className="text-center py-8 text-muted-foreground">Loading presets...</div>
              )}
              {!presetsLoading && quickBillPresets.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No quick bill presets defined yet.</div>
              )}
              {quickBillPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <div className="font-semibold">{preset.label}</div>
                  <div className="text-xs text-muted-foreground">{preset.items.length} products</div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Edit selected preset */}
          {selectedPreset && editingItems !== null && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedPreset(null);
                    setEditingItems(null);
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  ← Back to presets
                </button>
                <h3 className="font-bold">{selectedPreset.label}</h3>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {editingItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No items. Add from presets or go back.</p>
                ) : (
                  editingItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm border-b pb-1">
                      <div className="flex-1">{item.productName}</div>
                      <div className="flex items-center">
                        <button
                          className="px-2 py-1 border rounded-l bg-muted hover:bg-muted-foreground/20"
                          onClick={() => updateEditingItemQuantity(idx, item.quantity - 1)}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) updateEditingItemQuantity(idx, val);
                          }}
                          className="w-14 text-center border-t border-b py-1"
                        />
                        <button
                          className="px-2 py-1 border rounded-r bg-muted hover:bg-muted-foreground/20"
                          onClick={() => updateEditingItemQuantity(idx, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <div className="w-20 text-right font-medium">
                        ₹{(item.sellingPrice * item.quantity).toFixed(2)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeEditingItem(idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total</span>
                  <span>₹{qbGrandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                </select>
                <input
                  type="number"
                  placeholder={`Paid amount (default ₹${qbGrandTotal.toFixed(2)})`}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>

              <Button
                className="w-full"
                disabled={isProcessing || qbItemCount === 0}
                onClick={handleQuickBillCheckout}
              >
                {isProcessing ? "Processing..." : `Complete Sale – ₹${qbGrandTotal.toFixed(2)}`}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---------- Mobile Customer Overlay (unchanged) ----------
  const MobileCustomerOverlay = () => (
    <div className="fixed inset-0 z-50 bg-background flex flex-col md:hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-bold">Select Customer</h2>
        <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={() => {
          setMobileCustomerOpen(false);
          setCustomerSearch("");
          setCustomers([]);
        }}>
          <X className="w-5 h-5" />
        </Button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        <input
          type="text"
          placeholder="Search customer by name or phone..."
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          className="w-full rounded-lg border px-4 py-3 mb-4 min-h-[44px]"
          autoFocus
        />
        <div className="space-y-2">
          {customers.map(cust => (
            <button
              key={cust.id}
              className="w-full text-left p-3 rounded-lg border hover:bg-muted min-h-[44px]"
              onClick={() => {
                setSelectedCustomer(cust);
                setCustomers([]);
                setCustomerSearch("");
                setMobileCustomerOpen(false);
              }}
            >
              <div className="font-medium">{cust.name}</div>
              {cust.phone && <div className="text-xs text-muted-foreground">{cust.phone}</div>}
            </button>
          ))}
          {customerSearch.length >= 2 && customers.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No customers found</p>
          )}
        </div>
        <Button
          variant="outline"
          className="w-full mt-4 min-h-[44px]"
          onClick={() => {
            setMobileCustomerOpen(false);
            setShowCustomerDialog(true);
          }}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add New Customer
        </Button>
      </div>
    </div>
  );

  // ---------- Render (unchanged header, product area, etc.) ----------
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <div className="px-4 py-2 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20">
            <ShoppingCart className="w-4 h-4 text-primary" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-foreground leading-tight">POS Billing</h1>
            <p className="text-[8px] text-muted-foreground uppercase font-medium tracking-widest">
              New Mandal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <CustomerSelector
              selected={selectedCustomer}
              searchQuery={customerSearch}
              onSearchChange={setCustomerSearch}
              customers={customers}
              onSelect={(cust) => {
                setSelectedCustomer(cust);
                setCustomers([]);
                setCustomerSearch("");
              }}
              onClear={() => setSelectedCustomer(null)}
              onNewCustomer={() => setShowCustomerDialog(true)}
            />
            {selectedCustomer && (
              <div className="flex items-center gap-1 text-sm px-1">
                <span className="text-muted-foreground">{selectedCustomer.phone}</span>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-xs text-destructive hover:underline"
                  aria-label="Clear customer"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={openQuickBillModal}
            className="min-h-[44px] min-w-[44px]"
          >
            <Zap className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Quick Bill</span>
          </Button>

          <div className="md:hidden">
            <Button
              variant="outline"
              className="min-h-[44px] min-w-[44px] text-xs"
              onClick={() => setMobileCustomerOpen(true)}
            >
              {selectedCustomer ? selectedCustomer.name : "Walk-in Customer"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col p-3 sm:p-4 overflow-hidden border-r border-border/50">
          <SearchBar
            ref={searchInputRef}
            query={searchQuery}
            onChange={setSearchQuery}
            results={searchResults}
            onSelect={addToCart}
          />
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <ProductGrid products={products} onAdd={addToCart} />
          </div>
        </div>
        <div className="hidden md:flex md:w-[350px] lg:w-[400px] flex-col bg-card/30 backdrop-blur-2xl border-t md:border-t-0 md:border-l border-border/50 relative shadow-2xl h-full shrink-0">
          <CartContent />
        </div>
      </div>

      <div
        className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-30 p-3 flex items-center justify-between cursor-pointer min-h-[56px]"
        onClick={() => {
          if (cart.length > 0) setCartOpen(true);
        }}
      >
        <Badge variant="secondary" className="font-bold">
          {cart.length} ITEMS
        </Badge>
        <span className="font-bold text-lg">₹{grandTotal.toFixed(2)}</span>
        <ShoppingCart className="w-5 h-5 text-primary" />
      </div>

      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col md:hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-bold">Order</h2>
            <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={() => setCartOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <CartContent />
        </div>
      )}

      {mobileCustomerOpen && <MobileCustomerOverlay />}
      {quickBillOpen && <QuickBillModal />}

      <SuccessDialog
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        invoiceNumber={completedSale?.invoiceNumber}
        grandTotal={completedSale?.grandTotal}
        onPrint={handlePrint}
        onSavePDF={handleSavePDF}
      />

      <NewCustomerDialog
        open={showCustomerDialog}
        onClose={() => setShowCustomerDialog(false)}
        name={newCustomer.name}
        phone={newCustomer.phone}
        onNameChange={(v) => setNewCustomer({ ...newCustomer, name: v })}
        onPhoneChange={(v) => setNewCustomer({ ...newCustomer, phone: v })}
        onSave={handleNewCustomer}
      />

      <iframe ref={printFrameRef} className="hidden" title="Print Frame" />
    </div>
  );
}
