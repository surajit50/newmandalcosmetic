"use client";

import {
  Suspense,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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
  AlertCircle,
  RefreshCcw,
} from "lucide-react";

type PartyType = "customers" | "suppliers";

type PaymentMode = "CASH" | "UPI" | "BANK";

interface Party {
  id: string;
  name: string;
  phone: string;
  totalPurchases: number;
  totalDue: number;
  type: PartyType;
}

const PAYMENT_MODES: {
  value: PaymentMode;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "CASH",
    label: "Cash",
    icon: <Banknote className="w-4 h-4 mb-1" />,
  },
  {
    value: "UPI",
    label: "UPI",
    icon: <Smartphone className="w-4 h-4 mb-1" />,
  },
  {
    value: "BANK",
    label: "Bank",
    icon: <CreditCard className="w-4 h-4 mb-1" />,
  },
];

function DuesContent() {
  const searchParams = useSearchParams();

  const initialTab: PartyType =
    searchParams.get("type") === "suppliers"
      ? "suppliers"
      : "customers";

  const [activeTab, setActiveTab] =
    useState<PartyType>(initialTab);

  const [customers, setCustomers] = useState<Party[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");

  const [selectedParty, setSelectedParty] =
    useState<Party | null>(null);

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] =
    useState(false);

  const [paymentAmount, setPaymentAmount] = useState("");

  const [paymentMode, setPaymentMode] =
    useState<PaymentMode>("CASH");

  const [notes, setNotes] = useState("");

  const resetPaymentForm = useCallback(() => {
    setSelectedParty(null);
    setPaymentAmount("");
    setPaymentMode("CASH");
    setNotes("");
    setIsPaymentDialogOpen(false);
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const fetchDues = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const [customersRes, suppliersRes] = await Promise.all([
        fetch("/api/dues?type=customers"),
        fetch("/api/dues?type=suppliers"),
      ]);

      if (!customersRes.ok || !suppliersRes.ok) {
        throw new Error("Failed to fetch dues");
      }

      const customersData = await customersRes.json();
      const suppliersData = await suppliersRes.json();

      setCustomers(customersData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error(error);
      setError("Failed to load dues data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDues();
  }, [fetchDues]);

  const totalCustomerDue = useMemo(() => {
    return customers.reduce(
      (sum, customer) => sum + customer.totalDue,
      0,
    );
  }, [customers]);

  const totalSupplierDue = useMemo(() => {
    return suppliers.reduce(
      (sum, supplier) => sum + supplier.totalDue,
      0,
    );
  }, [suppliers]);

  const openPaymentDialog = useCallback(
    (party: Party) => {
      setSelectedParty(party);
      setIsPaymentDialogOpen(true);
    },
    [],
  );

  const handlePayment = async () => {
    if (!selectedParty) return;

    const amount = Number(paymentAmount);

    if (!amount || amount <= 0) {
      alert("Please enter valid amount");
      return;
    }

    if (amount > selectedParty.totalDue) {
      alert("Amount exceeds due");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/dues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          type:
            selectedParty.type === "customers"
              ? "customer"
              : "supplier",

          partyId: selectedParty.id,
          amount,
          paymentMode,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to record payment",
        );
      }

      resetPaymentForm();
      fetchDues();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Payment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const EmptyState = ({
    type,
  }: {
    type: PartyType;
  }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {type === "customers" ? (
        <Users className="w-14 h-14 text-muted-foreground opacity-50 mb-4" />
      ) : (
        <Truck className="w-14 h-14 text-muted-foreground opacity-50 mb-4" />
      )}

      <h3 className="text-lg font-semibold">
        No Outstanding Dues
      </h3>

      <p className="text-sm text-muted-foreground mt-1">
        {type === "customers"
          ? "All customer payments are cleared"
          : "All supplier payments are cleared"}
      </p>
    </div>
  );

  const renderPartyTable = (
    parties: Party[],
    type: PartyType,
  ) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!parties.length) {
      return <EmptyState type={type} />;
    }

    return (
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>

              <TableHead>Phone</TableHead>

              <TableHead className="text-right">
                Total Business
              </TableHead>

              <TableHead className="text-right">
                Due Amount
              </TableHead>

              <TableHead className="text-right">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {parties.map((party) => (
              <TableRow key={party.id}>
                <TableCell className="font-medium">
                  {party.name}
                </TableCell>

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
                  {formatCurrency(
                    party.totalPurchases,
                  )}
                </TableCell>

                <TableCell className="text-right">
                  <Badge
                    variant="destructive"
                    className="text-sm px-3 py-1"
                  >
                    {formatCurrency(party.totalDue)}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <Button
                    size="sm"
                    onClick={() =>
                      openPaymentDialog({
                        ...party,
                        type,
                      })
                    }
                  >
                    <IndianRupee className="w-4 h-4 mr-1" />
                    Record Payment
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-14">
            <div className="flex flex-col items-center text-center">
              <AlertCircle className="w-14 h-14 text-destructive mb-4" />

              <h2 className="text-xl font-semibold">
                Something went wrong
              </h2>

              <p className="text-muted-foreground mt-2">
                {error}
              </p>

              <Button
                className="mt-6"
                onClick={fetchDues}
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Dues Management
          </h1>

          <p className="text-muted-foreground mt-1">
            Track and manage customer & supplier dues
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchDues}
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Due from Customers
                </p>

                <h2 className="text-3xl font-bold text-green-600 mt-1">
                  {formatCurrency(totalCustomerDue)}
                </h2>

                <p className="text-sm text-muted-foreground mt-2">
                  {customers.length} customer(s)
                  pending
                </p>
              </div>

              <div className="w-14 h-14 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Users className="w-7 h-7 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Due to Suppliers
                </p>

                <h2 className="text-3xl font-bold text-red-600 mt-1">
                  {formatCurrency(totalSupplierDue)}
                </h2>

                <p className="text-sm text-muted-foreground mt-2">
                  {suppliers.length} supplier(s)
                  pending
                </p>
              </div>

              <div className="w-14 h-14 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Truck className="w-7 h-7 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}

      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as PartyType)
        }
      >
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="customers">
            Customers ({customers.length})
          </TabsTrigger>

          <TabsTrigger value="suppliers">
            Suppliers ({suppliers.length})
          </TabsTrigger>
        </TabsList>

        <Card className="mt-5">
          <CardHeader>
            <CardTitle>
              {activeTab === "customers"
                ? "Customer Dues"
                : "Supplier Dues"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <TabsContent
              value="customers"
              className="m-0"
            >
              {renderPartyTable(
                customers,
                "customers",
              )}
            </TabsContent>

            <TabsContent
              value="suppliers"
              className="m-0"
            >
              {renderPartyTable(
                suppliers,
                "suppliers",
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {/* Payment Dialog */}

      <Dialog
        open={isPaymentDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetPaymentForm();
          }

          setIsPaymentDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Record Payment
            </DialogTitle>
          </DialogHeader>

          {selectedParty && (
            <div className="space-y-5">
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {selectedParty.name}
                    </h3>

                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedParty.phone}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Outstanding Due
                    </p>

                    <h2 className="text-xl font-bold text-destructive">
                      {formatCurrency(
                        selectedParty.totalDue,
                      )}
                    </h2>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Payment Amount *
                </Label>

                <Input
                  type="number"
                  min={1}
                  max={selectedParty.totalDue}
                  placeholder={`Maximum ${selectedParty.totalDue}`}
                  value={paymentAmount}
                  onChange={(e) =>
                    setPaymentAmount(
                      e.target.value,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Payment Mode
                </Label>

                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_MODES.map((mode) => (
                    <Button
                      key={mode.value}
                      type="button"
                      variant={
                        paymentMode === mode.value
                          ? "default"
                          : "outline"
                      }
                      className="flex flex-col h-auto py-3"
                      onClick={() =>
                        setPaymentMode(mode.value)
                      }
                    >
                      {mode.icon}
                      {mode.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Notes (Optional)
                </Label>

                <Input
                  placeholder="Cheque no, reference, remarks..."
                  value={notes}
                  onChange={(e) =>
                    setNotes(e.target.value)
                  }
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={resetPaymentForm}
                >
                  Cancel
                </Button>

                <Button
                  onClick={handlePayment}
                  disabled={isSubmitting}
                >
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
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      }
    >
      <DuesContent />
    </Suspense>
  );
}
