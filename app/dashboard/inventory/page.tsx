"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Search,
  Plus,
  Minus,
  RefreshCw,
  ArrowUpDown,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  currentStock: number;
  minStock: number;
  purchasePrice: number;
  sellingPrice: number;
  unit: string;
}

interface StockMovement {
  id: string;
  productName: string;
  type: "in" | "out" | "adjustment";
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceType: string;
  notes?: string;
  createdAt: string;
}

interface StockAdjustment {
  id: string;
  productName: string;
  adjustmentType: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdAt: string;
}

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("stock");
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isStockOutOpen, setIsStockOutOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: stockData, mutate: mutateStock } = useSWR(
    "/api/stock",
    fetcher,
  );
  const { data: movementsData, mutate: mutateMovements } = useSWR(
    "/api/stock?type=movements",
    fetcher,
  );
  const { data: adjustmentsData, mutate: mutateAdjustments } = useSWR(
    "/api/stock?type=adjustments",
    fetcher,
  );
  const { data: lowStockData } = useSWR("/api/stock?type=low-stock", fetcher);

  const products: Product[] = stockData?.products || [];
  const movements: StockMovement[] = movementsData?.movements || [];
  const adjustments: StockAdjustment[] = adjustmentsData?.adjustments || [];
  const lowStockProducts: Product[] = lowStockData?.products || [];
  const summary = stockData?.summary || {
    totalValue: 0,
    totalItems: 0,
    lowStockCount: 0,
    totalProducts: 0,
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleStockIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "stock-in",
          productId: selectedProduct.id,
          quantity: parseInt(formData.get("quantity") as string),
          notes: formData.get("notes"),
        }),
      });

      if (res.ok) {
        setIsStockInOpen(false);
        setSelectedProduct(null);
        mutateStock();
        mutateMovements();
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStockOut = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "stock-out",
          productId: selectedProduct.id,
          quantity: parseInt(formData.get("quantity") as string),
          notes: formData.get("notes"),
        }),
      });

      if (res.ok) {
        setIsStockOutOpen(false);
        setSelectedProduct(null);
        mutateStock();
        mutateMovements();
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "adjustment",
          productId: selectedProduct.id,
          adjustmentType: formData.get("adjustmentType"),
          quantity: parseInt(formData.get("quantity") as string),
          reason: formData.get("reason"),
        }),
      });

      if (res.ok) {
        setIsAdjustmentOpen(false);
        setSelectedProduct(null);
        mutateStock();
        mutateAdjustments();
        mutateMovements();
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Inventory Management
          </h1>
          <p className="text-muted-foreground">
            Track stock levels, movements, and adjustments
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold text-foreground">
                  {summary.totalProducts}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold text-foreground">
                  {summary.totalItems.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <ArrowUpDown className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stock Value</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(summary.totalValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/10">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold text-foreground">
                  {summary.lowStockCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="stock">Current Stock</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock Alert</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, SKU, or barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background border-border"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => mutateStock()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Product</TableHead>
                    <TableHead>SKU / Barcode</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Min Stock</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id} className="border-border">
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{product.sku}</div>
                          {product.barcode && (
                            <div className="text-muted-foreground text-xs">
                              {product.barcode}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {product.currentStock} {product.unit}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {product.minStock} {product.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          product.currentStock * product.purchasePrice,
                        )}
                      </TableCell>
                      <TableCell>
                        {product.currentStock <= product.minStock ? (
                          <Badge variant="destructive">Low Stock</Badge>
                        ) : product.currentStock <= product.minStock * 2 ? (
                          <Badge
                            variant="secondary"
                            className="bg-amber-500/20 text-amber-500"
                          >
                            Warning
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/20 text-emerald-500"
                          >
                            In Stock
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedProduct(product);
                              setIsStockInOpen(true);
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedProduct(product);
                              setIsStockOutOpen(true);
                            }}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedProduct(product);
                              setIsAdjustmentOpen(true);
                            }}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Stock Movement History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Previous</TableHead>
                    <TableHead className="text-right">New</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id} className="border-border">
                      <TableCell className="text-sm">
                        {formatDate(movement.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {movement.productName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            movement.type === "in"
                              ? "bg-emerald-500/20 text-emerald-500"
                              : movement.type === "out"
                                ? "bg-destructive/20 text-destructive"
                                : "bg-blue-500/20 text-blue-500"
                          }
                        >
                          {movement.type === "in"
                            ? "Stock In"
                            : movement.type === "out"
                              ? "Stock Out"
                              : "Adjustment"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {movement.type === "in" ? "+" : "-"}
                        {movement.quantity}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {movement.previousStock}
                      </TableCell>
                      <TableCell className="text-right">
                        {movement.newStock}
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {movement.referenceType}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {movement.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjustments" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Stock Adjustments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Previous</TableHead>
                    <TableHead className="text-right">New</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map((adj) => (
                    <TableRow key={adj.id} className="border-border">
                      <TableCell className="text-sm">
                        {formatDate(adj.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {adj.productName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {adj.adjustmentType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {adj.quantity}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {adj.previousStock}
                      </TableCell>
                      <TableCell className="text-right">
                        {adj.newStock}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[300px] truncate">
                        {adj.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Low Stock Alert ({lowStockProducts.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Min Stock</TableHead>
                    <TableHead className="text-right">Shortage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.map((product) => (
                    <TableRow key={product.id} className="border-border">
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.sku}
                      </TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        {product.currentStock} {product.unit}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {product.minStock} {product.unit}
                      </TableCell>
                      <TableCell className="text-right text-destructive font-medium">
                        {product.minStock - product.currentStock} {product.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsStockInOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Stock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stock In Dialog */}
      <Dialog open={isStockInOpen} onOpenChange={setIsStockInOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Stock In - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStockIn}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Current Stock</Label>
                <p className="text-lg font-medium">
                  {selectedProduct?.currentStock} {selectedProduct?.unit}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity to Add *</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  required
                  placeholder="Enter quantity"
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Enter notes (optional)"
                  className="bg-background border-border"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsStockInOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Stock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock Out Dialog */}
      <Dialog open={isStockOutOpen} onOpenChange={setIsStockOutOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Stock Out - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStockOut}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Current Stock</Label>
                <p className="text-lg font-medium">
                  {selectedProduct?.currentStock} {selectedProduct?.unit}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity to Remove *</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  max={selectedProduct?.currentStock || 1}
                  required
                  placeholder="Enter quantity"
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Enter notes (optional)"
                  className="bg-background border-border"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsStockOutOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} variant="destructive">
                {isLoading ? "Removing..." : "Remove Stock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjustment Dialog */}
      <Dialog open={isAdjustmentOpen} onOpenChange={setIsAdjustmentOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              Stock Adjustment - {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdjustment}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Current Stock</Label>
                <p className="text-lg font-medium">
                  {selectedProduct?.currentStock} {selectedProduct?.unit}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjustmentType">Adjustment Type *</Label>
                <Select name="adjustmentType" required>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="wastage">Wastage</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="theft">Theft/Loss</SelectItem>
                    <SelectItem value="correction">Stock Correction</SelectItem>
                    <SelectItem value="opening">Opening Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  required
                  placeholder="Enter quantity"
                  className="bg-background border-border"
                />
                <p className="text-xs text-muted-foreground">
                  For damage/wastage/expired/theft: quantity to deduct. For
                  correction/opening: new stock level.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <Textarea
                  id="reason"
                  name="reason"
                  required
                  placeholder="Enter reason for adjustment"
                  className="bg-background border-border"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdjustmentOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Adjustment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
