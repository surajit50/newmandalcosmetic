// app/pos/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";
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

export default function POSPage() {
  // ---------- State ----------
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [paidAmount, setPaidAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });
  const [shopSettings, setShopSettings] = useState<any>(null);

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

  useEffect(() => {
    fetchProducts();
    fetchSettings();
  }, [fetchProducts]);

  useEffect(() => {
    const debounce = setTimeout(() => fetchCustomers(customerSearch), 300);
    return () => clearTimeout(debounce);
  }, [customerSearch, fetchCustomers]);

  useEffect(() => {
    if (searchQuery.length >= 1) {
      const q = searchQuery.toLowerCase();
      setSearchResults(
        products
          .filter(p => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q)))
          .slice(0, 10)
      );
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, products]);

  // ---------- Cart Operations ----------
  const addToCart = (product: Product) => {
    if (product.currentStock <= 0) {
      alert("Product is out of stock");
      return;
    }
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.currentStock) {
        alert("Not enough stock available");
        return;
      }
      updateQuantity(product.id, existing.quantity + 1);
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          mrp: product.mrp,
          sellingPrice: product.sellingPrice,
          discount: 0,
          gstRate: product.gstRate,
        },
      ]);
    }
    setSearchQuery("");
    setSearchResults([]);
    toast.success(`${product.name} added to cart`, {
      duration: 1000,
      position: "top-center",
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) return removeFromCart(productId);
    const product = products.find(p => p.id === productId);
    if (product && quantity > product.currentStock) {
      alert("Not enough stock available");
      return;
    }
    setCart(cart.map(item => (item.productId === productId ? { ...item, quantity } : item)));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const handleDiscountChange = (productId: string, raw: string) => {
    const val = parseFloat(raw) || 0;
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    const max = item.sellingPrice * item.quantity;
    setCart(prev =>
      prev.map(i => (i.productId === productId ? { ...i, discount: Math.min(val, max) } : i))
    );
  };

  // ---------- Computed Totals ----------
  const { subtotal, totalDiscount, totalGst, grandTotal, lineGstMap } = useMemo(() => {
    const map: Record<string, number> = {};
    let sub = 0,
      disc = 0,
      gst = 0;
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
    return {
      subtotal: sub,
      totalDiscount: disc,
      totalGst: gst,
      grandTotal: sub - disc,
      lineGstMap: map,
    };
  }, [cart]);

  const paidAmountNum = parseFloat(paidAmount) || 0;
  const dueAmount = grandTotal - paidAmountNum;
  const isOverpaid = paidAmountNum > grandTotal && grandTotal > 0;

  // ---------- Checkout ----------
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }
    if (isOverpaid) {
      alert("Paid amount exceeds the total. Please adjust.");
      return;
    }
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
        fetchProducts();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to process sale");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to process sale");
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------- Print & PDF (now using lib) ----------
  const handlePrint = () => {
    if (!completedSale || !shopSettings) return;
    printReceipt({ completedSale, shopSettings, printFrameRef });
  };

  const handleSavePDF = () => {
    if (!completedSale || !shopSettings) return;
    generatePDF({ completedSale, shopSettings });
  };

  // ---------- New Customer ----------
  const handleNewCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      alert("Name and phone are required");
      return;
    }
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
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create customer");
      }
    } catch (error) {
      alert("Failed to create customer");
    }
  };

  // ---------- Render ----------
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
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
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Product Area */}
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

        {/* Cart Area */}
        <div className="w-full md:w-[350px] lg:w-[400px] flex flex-col bg-card/30 backdrop-blur-2xl border-t md:border-t-0 md:border-l border-border/50 relative shadow-2xl h-[40vh] md:h-full shrink-0">
          <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between bg-card/50">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-3.5 h-3.5 text-primary" />
              <h2 className="font-black text-xs tracking-tight uppercase">Order</h2>
            </div>
            <Badge
              variant="secondary"
              className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground"
            >
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
        </div>
      </div>

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

      {/* Hidden iframe for printing */}
      <iframe ref={printFrameRef} className="hidden" title="Print Frame" />
    </div>
  );
}
