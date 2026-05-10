"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  CreditCard,
  Users,
  Truck,
  IndianRupee,
  Phone,
  Banknote,
  Smartphone,
  CheckCircle,
} from "lucide-react";

interface Party {
  id: string;
  name: string;
  phone: string;
  totalPurchases: number;
  totalDue: number;
  type: "customers" | "suppliers";
}

function DuesContent() {
  const searchParams = useSearchParams();
  const initialTab =
    searchParams.get("type") === "suppliers" ? "suppliers" : "customers";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [customers, setCustomers] = useState<Party[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDues = useCallback(async () => {
    setIsLoading(true);
    try {
      const [customersRes, suppliersRes] = await Promise.all([
        fetch("/api/dues?type=customers"),
        fetch("/api/dues?type=suppliers"),
      ]);

      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(data);
      }
      if (suppliersRes.ok) {
        const data = await suppliersRes.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error("Failed to fetch dues:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDues();
  }, [fetchDues]);

  const handlePayment = async () => {
    if (!selectedParty || !paymentAmount) {
      alert("Please enter payment amount");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedParty.totalDue) {
      alert("Invalid payment amount");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/dues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedParty.type === "customers" ? "customer" : "supplier",
          partyId: selectedParty.id,
          amount: paymentAmount,
          paymentMode,
          notes,
        }),
      });

      if (response.ok) {
        setIsPaymentDialogOpen(false);
        setSelectedParty(null);
        setPaymentAmount("");
        setNotes("");
        fetchDues();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to record payment");
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Failed to record payment");
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

  const totalCustomerDue = customers.reduce((sum, c) => sum + c.totalDue, 0);
  const totalSupplierDue = suppliers.reduce((sum, s) => sum + s.totalDue, 0);

  const renderPartyTable = (
    parties: Party[],
    type: "customers" | "suppliers",
  ) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (parties.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          {type === "customers" ? (
            <Users className="w-12 h-12 mb-4 opacity-50" />
          ) : (
            <Truck className="w-12 h-12 mb-4 opacity-50" />
          )}
          <p>No outstanding dues</p>
          <p className="text-sm">
            {type === "customers"
              ? "All customer payments are clear"
              : "All supplier payments are clear"}
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="text-right">Total Business</TableHead>
            <TableHead className="text-right">Due Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parties.map((party) => (
            <TableRow key={party.id}>
              <TableCell className="font-medium">{party.name}</TableCell>
              <TableCell>
                <a
                  href={`tel:${party.phone}`}
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Phone className="w-3 h-3" />
                  {party.phone}
                </a>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(party.totalPurchases)}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="destructive" className="text-base px-3">
                  {formatCurrency(party.totalDue)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedParty({ ...party, type });
                    setIsPaymentDialogOpen(true);
                  }}
                >
                  <IndianRupee className="w-4 h-4 mr-1" />
                  Record Payment
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dues Management</h1>
        <p className="text-muted-foreground">
          Track and manage customer and supplier dues
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Due from Customers
                </p>
                <p className="text-3xl font-bold text-success">
                  {formatCurrency(totalCustomerDue)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {customers.length} customer(s) with pending dues
                </p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center">
                <Users className="w-7 h-7 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Due to Suppliers
                </p>
                <p className="text-3xl font-bold text-destructive">
                  {formatCurrency(totalSupplierDue)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {suppliers.length} supplier(s) with pending dues
                </p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Truck className="w-7 h-7 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Customers ({customers.length})
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Suppliers ({suppliers.length})
          </TabsTrigger>
        </TabsList>

        <Card className="mt-4 border-border">
          <CardHeader>
            <CardTitle className="text-lg">
              {activeTab === "customers" ? "Customer Dues" : "Supplier Dues"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TabsContent value="customers" className="m-0">
              {renderPartyTable(customers, "customers")}
            </TabsContent>
            <TabsContent value="suppliers" className="m-0">
              {renderPartyTable(suppliers, "suppliers")}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>

          {selectedParty && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{selectedParty.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedParty.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Outstanding Due
                    </p>
                    <p className="text-xl font-bold text-destructive">
                      {formatCurrency(selectedParty.totalDue)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Amount *</Label>
                <Input
                  type="number"
                  placeholder={`Max: ${selectedParty.totalDue}`}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  max={selectedParty.totalDue}
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={paymentMode === "CASH" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPaymentMode("CASH")}
                    className="flex flex-col h-auto py-2"
                  >
                    <Banknote className="w-4 h-4 mb-1" />
                    Cash
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMode === "UPI" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPaymentMode("UPI")}
                    className="flex flex-col h-auto py-2"
                  >
                    <Smartphone className="w-4 h-4 mb-1" />
                    UPI
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMode === "BANK" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPaymentMode("BANK")}
                    className="flex flex-col h-auto py-2"
                  >
                    <CreditCard className="w-4 h-4 mb-1" />
                    Bank
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input
                  placeholder="Payment reference, cheque no., etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPaymentDialogOpen(false);
                    setSelectedParty(null);
                    setPaymentAmount("");
                    setNotes("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handlePayment} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Record Payment
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DuesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <DuesContent />
    </Suspense>
  );
}
