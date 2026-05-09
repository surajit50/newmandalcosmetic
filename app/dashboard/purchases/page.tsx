"use client";

import { useEffect, useState, useCallback } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Loader2, Receipt, Trash2, Minus } from "lucide-react";

interface Product {
  id: string;
  name: string;
  barcode?: string;
  purchasePrice: number;
  gstRate: number;
  currentStock: number;
  unit: string;
}

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
  phone: string;
}

interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  purchasePrice: number;
  gstRate: number;
  gstAmount: number;
  total: number;
}

interface Purchase {
  id: string;
  invoiceNumber: string;
  supplier: { name: string };
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  createdAt: string;
  items: PurchaseItem[];
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);

  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [cart, setCart] = useState<PurchaseItem[]>([]);
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");

  const [newProductData, setNewProductData] = useState({
    name: "",
    barcode: "",
    categoryId: "",
    brandId: "",
    unit: "pcs",
    gstRate: "0",
    purchasePrice: "0",
    sellingPrice: "0",
    mrp: "0",
  });

  const fetchPurchases = useCallback(async () => {
    try {
      const response = await fetch("/api/purchases");
      if (response.ok) {
        const data = await response.json();
        setPurchases(data);
      }
    } catch (error) {
      console.error("Failed to fetch purchases:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch("/api/suppliers");
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await fetch("/api/brands");
      if (response.ok) {
        const data = await response.json();
        setBrands(data);
      }
    } catch (error) {
      console.error("Failed to fetch brands:", error);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchProducts();
    fetchSuppliers();
    fetchCategories();
    fetchBrands();
  }, [fetchPurchases]);

  useEffect(() => {
    if (searchQuery.length >= 1) {
      const query = searchQuery.toLowerCase();
      const results = products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            (p.barcode && p.barcode.toLowerCase().includes(query)),
        )
        .slice(0, 10);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, products]);

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.productId === product.id);

    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      const gstAmount = product.purchasePrice * (product.gstRate / 100);
      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          purchasePrice: product.purchasePrice,
          gstRate: product.gstRate,
          gstAmount,
          total: product.purchasePrice + gstAmount,
        },
      ]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleCreateNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProductData),
      });

      if (response.ok) {
        const newProduct = await response.json();
        // Add to cart automatically
        const gstAmount =
          parseFloat(newProduct.purchasePrice) *
          (parseFloat(newProduct.gstRate) / 100);
        setCart([
          ...cart,
          {
            productId: newProduct.id,
            productName: newProduct.name,
            quantity: 1,
            purchasePrice: parseFloat(newProduct.purchasePrice),
            gstRate: parseFloat(newProduct.gstRate),
            gstAmount,
            total: parseFloat(newProduct.purchasePrice) + gstAmount,
          },
        ]);
        setIsNewProductDialogOpen(false);
        setNewProductData({
          name: "",
          barcode: "",
          categoryId: "",
          brandId: "",
          unit: "pcs",
          gstRate: "0",
          purchasePrice: "0",
          sellingPrice: "0",
          mrp: "0",
        });
        fetchProducts(); // Refresh local list
      } else {
        const data = await response.json();
        alert(data.error || "Failed to create product");
      }
    } catch (error) {
      console.error("Failed to create product:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(
      cart.map((item) => {
        if (item.productId === productId) {
          const subtotal = item.purchasePrice * quantity;
          const gstAmount = subtotal * (item.gstRate / 100);
          return {
            ...item,
            quantity,
            gstAmount,
            total: subtotal + gstAmount,
          };
        }
        return item;
      }),
    );
  };

  const updatePrice = (productId: string, price: number) => {
    setCart(
      cart.map((item) => {
        if (item.productId === productId) {
          const subtotal = price * item.quantity;
          const gstAmount = subtotal * (item.gstRate / 100);
          return {
            ...item,
            purchasePrice: price,
            gstAmount,
            total: subtotal + gstAmount,
          };
        }
        return item;
      }),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.purchasePrice * item.quantity,
    0,
  );
  const totalGst = cart.reduce((sum, item) => sum + item.gstAmount, 0);
  const grandTotal = subtotal + totalGst;

  const handleSubmit = async () => {
    if (!selectedSupplier) {
      alert("Please select a supplier");
      return;
    }
    if (cart.length === 0) {
      alert("Please add items to the purchase");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplier,
          items: cart,
          paidAmount: paidAmount || "0",
          paymentMode,
        }),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        setCart([]);
        setSelectedSupplier("");
        setPaidAmount("");
        fetchPurchases();
        fetchProducts();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to create purchase");
      }
    } catch (error) {
      console.error("Failed to create purchase:", error);
      alert("Failed to create purchase");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchases</h1>
          <p className="text-muted-foreground">
            Manage stock purchases from suppliers
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Purchase
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Purchase Entry</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Supplier Selection */}
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Select
                  value={selectedSupplier}
                  onValueChange={setSelectedSupplier}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name} - {supplier.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Search */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Add Products</Label>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-primary"
                    onClick={() => setIsNewProductDialogOpen(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add New Kind of Item
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                      {searchResults.map((product) => (
                        <button
                          key={product.id}
                          className="w-full px-4 py-2 flex items-center justify-between hover:bg-accent text-left"
                          onClick={() => addToCart(product)}
                        >
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.barcode || "No barcode"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {formatCurrency(product.purchasePrice)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              GST: {product.gstRate}%
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Cart Items */}
              {cart.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="w-32">Price</TableHead>
                        <TableHead className="w-32">Qty</TableHead>
                        <TableHead className="w-20">GST</TableHead>
                        <TableHead className="text-right w-32">Total</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.purchasePrice}
                              onChange={(e) =>
                                updatePrice(
                                  item.productId,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-24 h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="w-7 h-7"
                                onClick={() =>
                                  updateQuantity(
                                    item.productId,
                                    item.quantity - 1,
                                  )
                                }
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="w-7 h-7"
                                onClick={() =>
                                  updateQuantity(
                                    item.productId,
                                    item.quantity + 1,
                                  )
                                }
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{item.gstRate}%</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.total)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-destructive"
                              onClick={() => removeFromCart(item.productId)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Totals */}
              {cart.length > 0 && (
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>GST</span>
                    <span>{formatCurrency(totalGst)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Grand Total</span>
                    <span className="text-primary">
                      {formatCurrency(grandTotal)}
                    </span>
                  </div>
                </div>
              )}

              {/* Payment */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Mode</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount Paid</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setCart([]);
                    setSelectedSupplier("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Purchase"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Purchases Table */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">
            Purchase History ({purchases.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Receipt className="w-12 h-12 mb-4 opacity-50" />
              <p>No purchases found</p>
              <p className="text-sm">Create your first purchase entry</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase) => (
                  <TableRow key={purchase._id}>
                    <TableCell className="font-mono text-sm">
                      {purchase.invoiceNumber}
                    </TableCell>
                    <TableCell>{purchase.supplierName}</TableCell>
                    <TableCell>
                      {new Date(purchase.createdAt).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(purchase.grandTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(purchase.paidAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(purchase.dueAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          purchase.paymentStatus === "paid"
                            ? "secondary"
                            : purchase.paymentStatus === "partial"
                              ? "outline"
                              : "destructive"
                        }
                      >
                        {purchase.paymentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {/* New Product Dialog */}
      <Dialog
        open={isNewProductDialogOpen}
        onOpenChange={setIsNewProductDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Kind of Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateNewProduct} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input
                  value={newProductData.name}
                  onChange={(e) =>
                    setNewProductData({
                      ...newProductData,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Barcode</Label>
                <Input
                  value={newProductData.barcode}
                  onChange={(e) =>
                    setNewProductData({
                      ...newProductData,
                      barcode: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={newProductData.categoryId}
                  onValueChange={(val) =>
                    setNewProductData({ ...newProductData, categoryId: val })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Brand</Label>
                <Select
                  value={newProductData.brandId}
                  onValueChange={(val) =>
                    setNewProductData({ ...newProductData, brandId: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select
                  value={newProductData.unit}
                  onValueChange={(val) =>
                    setNewProductData({ ...newProductData, unit: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="pcs" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "pcs",
                      "kg",
                      "g",
                      "ltr",
                      "ml",
                      "box",
                      "pack",
                      "dozen",
                    ].map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>GST Rate (%)</Label>
                <Select
                  value={newProductData.gstRate}
                  onValueChange={(val) =>
                    setNewProductData({ ...newProductData, gstRate: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="0" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 5, 12, 18, 28].map((r) => (
                      <SelectItem key={r} value={r.toString()}>
                        {r}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Purchase Price *</Label>
                <Input
                  type="number"
                  value={newProductData.purchasePrice}
                  onChange={(e) =>
                    setNewProductData({
                      ...newProductData,
                      purchasePrice: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Selling Price *</Label>
                <Input
                  type="number"
                  value={newProductData.sellingPrice}
                  onChange={(e) =>
                    setNewProductData({
                      ...newProductData,
                      sellingPrice: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>MRP *</Label>
                <Input
                  type="number"
                  value={newProductData.mrp}
                  onChange={(e) =>
                    setNewProductData({
                      ...newProductData,
                      mrp: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewProductDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Create and Add to Cart
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
