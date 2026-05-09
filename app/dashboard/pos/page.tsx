"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Loader2,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle,
  Printer,
  Package,
  IndianRupee,
  Download,
} from "lucide-react";
import { ThermalReceipt } from "@/components/pos/thermal-receipt";
import ReactDOMServer from "react-dom/server";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import jsPDF from "jspdf";

// ---------- Types (unchanged except CartItem adjustments) ----------
interface Product {
  id: string;
  name: string;
  barcode?: string;
  mrp: number;
  sellingPrice: number; // now always inclusive of GST
  gstRate: number;
  currentStock: number;
  unit: string;
}

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  mrp: number;
  sellingPrice: number;   // inclusive per unit
  discount: number;       // fixed discount on this line (in ₹)
  gstRate: number;
  gstAmount: number;      // GST amount per unit (derived from inclusive price)
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  totalDue: number;
}

interface Sale {
  id: string;
  invoiceNumber: string;
  grandTotal: number;
  subtotal: number;
  totalGst: number;
  totalDiscount: number;
  paidAmount: number;
  dueAmount: number;
  createdAt: string;
  customerName: string;
  items: any[];
}

export default function POSPage() {
  // ---------- State ----------
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CARD">("CASH");
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
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
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
      const response = await fetch(
        `/api/customers?search=${encodeURIComponent(query)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setShopSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSettings();
  }, [fetchProducts]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchCustomers(customerSearch);
    }, 300);
    return () => clearTimeout(debounce);
  }, [customerSearch, fetchCustomers]);

  useEffect(() => {
    if (searchQuery.length >= 1) {
      const query = searchQuery.toLowerCase();
      const results = products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            (p.barcode && p.barcode.includes(query)),
        )
        .slice(0, 10);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, products]);

  // ---------- Cart Functions (GST-inclusive) ----------
  const addToCart = (product: Product) => {
    if (product.currentStock <= 0) {
      alert("Product is out of stock");
      return;
    }

    const existingItem = cart.find((item) => item.productId === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.currentStock) {
        alert("Not enough stock available");
        return;
      }
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      // --- GST inclusive selling price ---
      const sellingPrice = product.sellingPrice;                    // inclusive
      const basePrice = sellingPrice / (1 + product.gstRate / 100); // taxable value
      const gstAmount = sellingPrice - basePrice;                   // GST per unit

      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          mrp: product.mrp,
          sellingPrice,
          discount: 0,
          gstRate: product.gstRate,
          gstAmount,
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
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (product && quantity > product.currentStock) {
      alert("Not enough stock available");
      return;
    }

    setCart(
      cart.map((item) =>
        item.productId === productId ? { ...item, quantity } : item,
      ),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  // ---------- Totals (with discount) ----------
  const subtotal = cart.reduce(
    (sum, item) => sum + item.sellingPrice * item.quantity,
    0,
  );
  const totalDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
  const totalGst = cart.reduce(
    (sum, item) => sum + item.gstAmount * item.quantity,
    0,
  );
  const grandTotal = subtotal - totalDiscount;
  const dueAmount = grandTotal - (parseFloat(paidAmount) || 0);

  // ---------- Checkout ----------
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,   // inclusive
            discount: item.discount,
            gstRate: item.gstRate,
            gstAmount: item.gstAmount,        // per unit
          })),
          customerId: selectedCustomer?.id,
          customerName: selectedCustomer?.name || "Walk-in Customer",
          customerPhone: selectedCustomer?.phone,
          paymentMode,
          paidAmount: paidAmount || grandTotal.toString(),
        }),
      });

      if (response.ok) {
        const sale = await response.json();
        setCompletedSale(sale);
        setShowSuccess(true);
        setCart([]);
        setSelectedCustomer(null);
        setPaidAmount("");
        fetchProducts();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to process sale");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to process sale");
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------- Print (unchanged) ----------
  const handlePrint = () => {
    if (!completedSale || !shopSettings || !printFrameRef.current) return;

    const receiptHtml = ReactDOMServer.renderToString(
      <ThermalReceipt
        shopName={shopSettings.shopName}
        address={shopSettings.address}
        phone={shopSettings.phone}
        gstin={shopSettings.gstin}
        invoiceNumber={completedSale.invoiceNumber}
        date={new Date(completedSale.createdAt)}
        customerName={completedSale.customerName}
        items={completedSale.items}
        subtotal={completedSale.subtotal}
        totalGst={completedSale.totalGst}
        totalDiscount={completedSale.totalDiscount}
        grandTotal={completedSale.grandTotal}
        paidAmount={completedSale.paidAmount}
        dueAmount={completedSale.dueAmount}
      />,
    );

    const frame = printFrameRef.current;
    const doc = frame.contentDocument || frame.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
<html>
<head>
<title>Receipt</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  html, body { width: 80mm; margin: 0; padding: 0; font-family: monospace; background: white; }
  body { padding: 4mm; box-sizing: border-box; }
  .receipt { width: 72mm; margin: 0 auto; font-size: 12px; color: black; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .line { border-top: 1px dashed black; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { padding: 2px 0; }
  .right { text-align: right; }
  .total { font-size: 14px; font-weight: bold; }
  @media print { html, body { width: 80mm; height: auto; } body { margin: 0; } .receipt { width: 72mm; } }
</style>
</head>
<body>
<div class="receipt">${receiptHtml}</div>
<script>window.onload = () => { window.print(); };</script>
</body>
</html>
`);
    doc.close();
  };

  // ---------- PDF Generation (unchanged, uses completedSale data) ----------
  const handleSavePDF = async () => {
    if (!completedSale || !shopSettings) {
      toast.error("No sale data available");
      return;
    }
    const toastId = toast.loading("Generating PDF...");
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 120] });
      const pageWidth = 80;
      const margin = 4;
      let y = 8;

      const centerText = (text: string, size = 10, style: "normal" | "bold" = "normal") => {
        doc.setFont("courier", style);
        doc.setFontSize(size);
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
        y += size * 0.5 + 1;
      };
      const leftText = (text: string, size = 9, style: "normal" | "bold" = "normal") => {
        doc.setFont("courier", style);
        doc.setFontSize(size);
        doc.text(text, margin, y);
        y += size * 0.5 + 1;
      };
      const twoColumn = (left: string, right: string, size = 9, style: "normal" | "bold" = "normal") => {
        doc.setFont("courier", style);
        doc.setFontSize(size);
        doc.text(left, margin, y);
        const rightWidth = doc.getTextWidth(right);
        doc.text(right, pageWidth - margin - rightWidth, y);
        y += size * 0.5 + 1;
      };
      const dashedLine = () => {
        let x = margin;
        while (x < pageWidth - margin) { doc.line(x, y, x + 1.5, y); x += 3; }
        y += 3;
      };

      centerText((shopSettings.shopName || "SHOP NAME").toUpperCase(), 12, "bold");
      if (shopSettings.address) centerText(shopSettings.address, 8);
      if (shopSettings.phone) centerText(`Phone: ${shopSettings.phone}`, 8);
      if (shopSettings.gstin) centerText(`GSTIN: ${shopSettings.gstin}`, 8);
      dashedLine();

      leftText(`Invoice: ${completedSale.invoiceNumber}`, 8);
      leftText(`Date: ${new Date(completedSale.createdAt).toLocaleString()}`, 8);
      leftText(`Customer: ${completedSale.customerName || "Walk-in Customer"}`, 8);
      dashedLine();

      doc.setFont("courier", "bold");
      doc.setFontSize(8);
      doc.text("Item", margin, y);
      doc.text("Qty", 42, y);
      doc.text("Rate", 54, y);
      doc.text("Amt", 70, y);
      y += 4;
      doc.setFont("courier", "normal");

      completedSale.items.forEach((item: any) => {
        const name = item.productName.length > 18 ? item.productName.substring(0, 18) + ".." : item.productName;
        doc.text(name, margin, y);
        doc.text(String(item.quantity), 42, y);
        doc.text(Number(item.sellingPrice || 0).toFixed(0), 54, y);
        doc.text(Number(item.total || 0).toFixed(0), 70, y);
        y += 4;
      });
      dashedLine();

      twoColumn("Subtotal", Number(completedSale.subtotal || 0).toFixed(0), 9);
      twoColumn("GST", Number(completedSale.totalGst || 0).toFixed(0), 9);
      if ((completedSale.totalDiscount || 0) > 0) {
        twoColumn("Discount", Number(completedSale.totalDiscount || 0).toFixed(0), 9);
      }
      doc.line(margin, y, pageWidth - margin, y); y += 1.5;
      doc.line(margin, y, pageWidth - margin, y); y += 4;
      twoColumn("TOTAL", Number(completedSale.grandTotal || 0).toFixed(0), 11, "bold");
      y += 2;
      twoColumn("Paid", Number(completedSale.paidAmount || 0).toFixed(0), 8);
      twoColumn("Due", Number(completedSale.dueAmount || 0).toFixed(0), 8);
      dashedLine();
      centerText("Thank You For Your Purchase!", 8);
      centerText("Visit Again", 8);
      y += 4;

      const finalHeight = y + 5;
      (doc as any).internal.pageSize.height = finalHeight;
      (doc as any).internal.pageSize.width = 80;
      doc.save(`Invoice-${completedSale.invoiceNumber}.pdf`);
      toast.success("PDF downloaded successfully", { id: toastId });
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("Failed to generate PDF", { id: toastId });
    }
  };

  // ---------- Customer creation ----------
  const handleNewCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      alert("Name and phone are required");
      return;
    }
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });
      if (response.ok) {
        const customer = await response.json();
        setSelectedCustomer(customer);
        setShowCustomerDialog(false);
        setNewCustomer({ name: "", phone: "" });
        setCustomerSearch("");
      } else {
        const data = await response.json();
        alert(data.error || "Failed to create customer");
      }
    } catch (error) {
      console.error("Create customer error:", error);
      alert("Failed to create customer");
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

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
            <p className="text-[8px] text-muted-foreground uppercase font-medium tracking-widest">New Mandal</p>
          </div>
        </div>

        <div className="flex-1 max-w-md mx-4">
          {selectedCustomer ? (
            <div className="flex items-center justify-between gap-2 px-3 py-1 rounded-full bg-secondary border border-border shadow-inner group animate-in slide-in-from-top duration-300">
              <div className="flex flex-col items-start leading-none overflow-hidden">
                <span className="text-[10px] font-bold text-foreground truncate w-full">{selectedCustomer.name}</span>
                <span className="text-[8px] text-muted-foreground">{selectedCustomer.phone}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0" onClick={() => setSelectedCustomer(null)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Customer..."
                className="pl-8 h-8 rounded-full bg-secondary/50 border-border/50 focus:bg-background transition-all text-xs"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              {customers.length > 0 && (
                <Card className="absolute top-full left-0 right-0 z-50 mt-2 max-h-64 overflow-y-auto shadow-2xl border-border rounded-xl animate-in fade-in zoom-in duration-200">
                  <CardContent className="p-1">
                    {customers.map((c) => (
                      <div
                        key={c.id}
                        className="p-2 hover:bg-primary/10 cursor-pointer rounded-lg flex justify-between items-center transition-colors group/item"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomers([]);
                          setCustomerSearch("");
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground group-hover/item:text-primary transition-colors">{c.name}</span>
                          <span className="text-[10px] text-muted-foreground">{c.phone}</span>
                        </div>
                        <Plus className="w-3 h-3 text-muted-foreground group-hover/item:text-primary transition-colors" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <Button variant="outline" size="sm" className="h-8 rounded-full border-primary/20 text-primary hover:bg-primary/10 px-3" onClick={() => setShowCustomerDialog(true)}>
          <Plus className="w-3 h-3 sm:mr-1" />
          <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-tighter">NEW</span>
        </Button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Product Search & List */}
        <div className="flex-1 flex flex-col p-3 sm:p-4 overflow-hidden border-r border-border/50">
          <div className="relative mb-3 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              ref={searchInputRef}
              placeholder="Search items or scan..."
              className="pl-10 h-10 rounded-xl bg-card border-border/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchResults.length > 0 && (
              <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[400px] overflow-y-auto shadow-2xl border-border rounded-xl animate-in fade-in zoom-in duration-200">
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    {searchResults.map((p) => (
                      <div
                        key={p.id}
                        className="p-2 sm:p-3 hover:bg-primary/5 cursor-pointer transition-all flex items-center justify-between group/prod"
                        onClick={() => addToCart(p)}
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center border border-border/50 group-hover/prod:scale-110 transition-transform">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] sm:text-xs font-bold text-foreground group-hover/prod:text-primary transition-colors truncate">{p.name}</span>
                            <span className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-medium tracking-tighter">{p.barcode || "No barcode"}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs sm:text-sm font-black text-primary">{formatCurrency(p.sellingPrice)}</div>
                          <div className="text-[7px] sm:text-[8px] text-muted-foreground uppercase font-bold tracking-widest">Stock: {p.currentStock}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1.5 sm:gap-2">
              {products
                .filter((p) => p.currentStock > 0)
                .slice(0, 40)
                .map((p) => (
                  <div
                    key={p.id}
                    className="group bg-card hover:bg-primary/5 cursor-pointer transition-all active:scale-[0.98] border border-border/50 rounded-lg p-2 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-3 shadow-sm hover:shadow-md hover:border-primary/20"
                    onClick={() => addToCart(p)}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-full">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                        <Package className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <h3 className="font-bold text-[10px] sm:text-xs text-foreground truncate group-hover:text-primary transition-colors leading-tight">{p.name}</h3>
                        <div className="flex items-center justify-between sm:justify-start gap-2 mt-0.5">
                          <span className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-bold tracking-tighter truncate">{p.barcode || "No SKU"}</span>
                          <span className="text-[9px] sm:text-[10px] font-black text-primary/80">{formatCurrency(p.sellingPrice)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 gap-1">
                      <Badge variant="secondary" className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0 h-3.5 sm:h-4 font-bold bg-secondary/80">
                        {p.currentStock} {p.unit}
                      </Badge>
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center sm:scale-0 group-hover:scale-100 transition-transform">
                        <Plus className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Cart & Checkout */}
        <div className="w-full md:w-[350px] lg:w-[400px] flex flex-col bg-card/30 backdrop-blur-2xl border-t md:border-t-0 md:border-l border-border/50 relative shadow-2xl h-[40vh] md:h-full shrink-0">
          <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between bg-card/50">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-3.5 h-3.5 text-primary" />
              <h2 className="font-black text-xs tracking-tight uppercase">Order</h2>
            </div>
            <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground">
              {cart.length} ITEMS
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center gap-3 opacity-30">
                <ShoppingCart className="w-10 h-10" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Cart is Empty</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="p-1.5 sm:p-2 rounded-xl bg-card border border-border/50 shadow-sm animate-in slide-in-from-right duration-300 group/item relative"
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <div className="flex flex-col pr-6">
                        <span className="font-bold text-[10px] sm:text-[11px] leading-tight text-foreground line-clamp-1">{item.productName}</span>
                        <span className="text-[7px] sm:text-[8px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">GST {item.gstRate}%</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 sm:h-6 sm:w-6 rounded-full text-destructive hover:bg-destructive/10 shrink-0 absolute top-1 right-1 opacity-100 sm:opacity-0 group-hover/item:opacity-100 transition-opacity"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <Trash2 className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                      </Button>
                    </div>

                    {/* Quantity controls + Discount input */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-secondary/50 rounded-full p-0.5 border border-border/50">
                        <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6 rounded-full hover:bg-background" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                          <Minus className="w-2 sm:w-2.5 h-2 sm:h-2.5" />
                        </Button>
                        <span className="w-5 sm:w-6 text-center text-[10px] sm:text-[11px] font-black text-foreground">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6 rounded-full hover:bg-background" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                          <Plus className="w-2 sm:w-2.5 h-2 sm:h-2.5" />
                        </Button>
                      </div>

                      {/* ---- Discount field ---- */}
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          placeholder="0"
                          value={item.discount || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setCart(cart.map((i) => (i.productId === item.productId ? { ...i, discount: val } : i)));
                          }}
                          className="w-12 h-6 text-xs p-1 text-right rounded"
                        />
                        <span className="text-[8px] font-bold text-muted-foreground">disc</span>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-xs sm:text-sm text-primary">
                          {formatCurrency(item.sellingPrice * item.quantity - item.discount)}
                        </div>
                        <div className="text-[8px] sm:text-[9px] text-muted-foreground font-bold">
                          {formatCurrency(item.sellingPrice)}/u (incl. GST)
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals & Checkout */}
          <div className="p-3 sm:p-4 bg-card border-t border-border shadow-2xl space-y-3">
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

            <div className="grid grid-cols-3 gap-2">
              {["CASH", "UPI", "CARD"].map((mode) => (
                <Button
                  key={mode}
                  variant={paymentMode === mode ? "default" : "outline"}
                  className={cn(
                    "h-10 rounded-xl flex flex-col gap-0.5 transition-all p-0",
                    paymentMode === mode ? "shadow-md shadow-primary/20 scale-105" : "bg-card border-border/50",
                  )}
                  onClick={() => setPaymentMode(mode as any)}
                >
                  {mode === "CASH" && <Banknote className="w-3.5 h-3.5" />}
                  {mode === "UPI" && <Smartphone className="w-3.5 h-3.5" />}
                  {mode === "CARD" && <CreditCard className="w-3.5 h-3.5" />}
                  <span className="text-[8px] font-bold uppercase tracking-tighter">{mode}</span>
                </Button>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-[9px] font-black uppercase text-muted-foreground">Paid Amount</span>
                {dueAmount > 0 && (
                  <span className="text-[9px] font-black text-destructive uppercase animate-pulse">Due: {formatCurrency(dueAmount)}</span>
                )}
              </div>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder={grandTotal.toFixed(0)}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="pl-9 h-10 text-lg font-black rounded-xl bg-secondary/30 border-border/50 focus:bg-background transition-all"
                />
              </div>
            </div>

            <Button
              className="w-full h-12 text-sm font-black rounded-xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] group"
              disabled={cart.length === 0 || isProcessing}
              onClick={handleCheckout}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ShoppingCart className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
              )}
              COMPLETE BILL
            </Button>
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Sale Completed!</h2>
              <p className="text-muted-foreground">Invoice #{completedSale?.invoiceNumber}</p>
            </div>
            <div className="text-3xl font-bold text-primary">{formatCurrency(completedSale?.grandTotal || 0)}</div>
            <div className="flex flex-col gap-2 w-full pt-4">
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1" onClick={() => setShowSuccess(false)}>New Sale</Button>
                <Button className="flex-1" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" />Print</Button>
              </div>
              <Button variant="secondary" className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSavePDF}><Download className="w-4 h-4 mr-2" />Save as PDF</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Customer Dialog */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cust-name">Customer Name</Label>
              <Input id="cust-name" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-phone">Phone Number</Label>
              <Input id="cust-phone" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
            </div>
            <Button className="w-full" onClick={handleNewCustomer}>Save Customer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden iframe for printing */}
      <iframe ref={printFrameRef} className="hidden" title="Print Frame" />
    </div>
  );
}
