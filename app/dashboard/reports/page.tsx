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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  BarChart3,
  IndianRupee,
  ShoppingCart,
  Receipt,
  Download,
  FileText,
  Banknote,
  Smartphone,
  CreditCard,
  Printer,
} from "lucide-react";
import { ThermalReceipt } from "@/components/pos/thermal-receipt";
import ReactDOMServer from "react-dom/server";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Sale {
  id: string;
  invoiceNumber: string;
  customerName: string;
  grandTotal: number;
  subtotal: number;
  totalGst: number;
  totalDiscount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMode: string;
  paymentStatus: string;
  createdAt: string;
  items: any[];
}

interface SalesSummary {
  totalSales: number;
  totalGst: number;
  totalTransactions: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
}

interface PurchasesSummary {
  totalPurchases: number;
  totalGst: number;
  totalTransactions: number;
  totalDue: number;
}

interface Purchase {
  id: string | null | undefined;
  invoiceNumber: string;
  supplierName: string;
  grandTotal: number;
  totalGst: number;
  paymentStatus: string;
  createdAt: string;
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState("sales");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [salesData, setSalesData] = useState<{
    summary: SalesSummary;
    data: Sale[];
  } | null>(null);
  const [purchasesData, setPurchasesData] = useState<{
    summary: PurchasesSummary;
    data: Purchase[];
  } | null>(null);
  const [shopSettings, setShopSettings] = useState<any>(null);

  // Set default dates (current month)
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);

    // Fetch shop settings for printing
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setShopSettings(data))
      .catch((err) => console.error("Failed to fetch settings:", err));
  }, []);

  const fetchReport = useCallback(async () => {
    if (!startDate || !endDate) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        type: reportType,
        startDate,
        endDate,
      });

      const response = await fetch(`/api/reports?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (reportType === "sales") {
          setSalesData(data);
          setPurchasesData(null);
        } else if (reportType === "purchases") {
          setPurchasesData(data);
          setSalesData(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setIsLoading(false);
    }
  }, [reportType, startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReport();
    }
  }, [fetchReport, startDate, endDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportToCSV = () => {
    const data = reportType === "sales" ? salesData?.data : purchasesData?.data;
    if (!data) return;

    const headers =
      reportType === "sales"
        ? [
            "Invoice",
            "Customer",
            "Date",
            "Total",
            "GST",
            "Payment Mode",
            "Status",
          ]
        : ["Invoice", "Supplier", "Date", "Total", "GST", "Status"];

    const rows = data.map((item: Sale | Purchase) => {
      if (reportType === "sales") {
        const sale = item as Sale;
        return [
          sale.invoiceNumber,
          sale.customerName,
          new Date(sale.createdAt).toLocaleDateString("en-IN"),
          sale.grandTotal,
          sale.totalGst,
          sale.paymentMode,
          sale.paymentStatus,
        ];
      } else {
        const purchase = item as Purchase;
        return [
          purchase.invoiceNumber,
          purchase.supplierName,
          new Date(purchase.createdAt).toLocaleDateString("en-IN"),
          purchase.grandTotal,
          purchase.totalGst,
          purchase.paymentStatus,
        ];
      }
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}-report-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  const handlePrint = (sale: Sale) => {
    if (!shopSettings) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const receiptHtml = ReactDOMServer.renderToString(
      <ThermalReceipt
        shopName={shopSettings.shopName}
        address={shopSettings.address}
        phone={shopSettings.phone}
        gstin={shopSettings.gstin}
        invoiceNumber={sale.invoiceNumber}
        date={new Date(sale.createdAt)}
        customerName={sale.customerName}
        items={sale.items}
        subtotal={sale.subtotal}
        totalGst={sale.totalGst}
        totalDiscount={sale.totalDiscount}
        grandTotal={sale.grandTotal}
        paidAmount={sale.paidAmount}
        dueAmount={sale.dueAmount}
      />,
    );

    printWindow.document.write(`
      <html>
        <head>
          <title>Reprint Invoice - ${sale.invoiceNumber}</title>
          <style>
            @media print {
              @page { margin: 0; size: 80mm auto; }
              body { margin: 0; }
            }
            body { font-family: monospace; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${receiptHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSavePDF = async (sale: Sale) => {
    if (!shopSettings) return;

    const toastId = toast.loading("Generating PDF...");

    try {
      const receiptElement = document.createElement("div");
      receiptElement.style.position = "absolute";
      receiptElement.style.left = "-9999px";
      receiptElement.style.top = "0";
      receiptElement.style.width = "80mm";
      receiptElement.style.background = "white";
      document.body.appendChild(receiptElement);

      const receiptHtml = ReactDOMServer.renderToString(
        <ThermalReceipt
          shopName={shopSettings.shopName}
          address={shopSettings.address}
          phone={shopSettings.phone}
          gstin={shopSettings.gstin}
          invoiceNumber={sale.invoiceNumber}
          date={new Date(sale.createdAt)}
          customerName={sale.customerName}
          items={sale.items}
          subtotal={sale.subtotal}
          totalGst={sale.totalGst}
          totalDiscount={sale.totalDiscount}
          grandTotal={sale.grandTotal}
          paidAmount={sale.paidAmount}
          dueAmount={sale.dueAmount}
        />,
      );

      receiptElement.innerHTML = `
        <div style="width: 80mm; padding: 10px; font-family: monospace;">
          ${receiptHtml}
        </div>
      `;

      const canvas = await html2canvas(receiptElement, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        unit: "mm",
        format: [80, (canvas.height * 80) / canvas.width],
      });

      pdf.addImage(
        imgData,
        "PNG",
        0,
        0,
        80,
        (canvas.height * 80) / canvas.width,
        undefined,
        "FAST",
      );
      pdf.save(`Invoice-${sale.invoiceNumber}.pdf`);

      document.body.removeChild(receiptElement);
      toast.success("PDF saved successfully", { id: toastId });
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("Failed to save PDF", { id: toastId });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">
            Generate and analyze business reports
          </p>
        </div>
        <Button
          onClick={exportToCSV}
          disabled={isLoading || (!salesData && !purchasesData)}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales Report</SelectItem>
                  <SelectItem value="purchases">Purchase Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={fetchReport}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Report */}
      {reportType === "sales" && salesData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <IndianRupee className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Sales</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(salesData.summary.totalSales)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-chart-2" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      GST Collected
                    </p>
                    <p className="text-lg font-bold">
                      {formatCurrency(salesData.summary.totalGst)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-chart-3" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Transactions
                    </p>
                    <p className="text-lg font-bold">
                      {salesData.summary.totalTransactions}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <Banknote className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cash</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(salesData.summary.cashSales)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-chart-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">UPI</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(salesData.summary.upiSales)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-chart-5/10 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-chart-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Card</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(salesData.summary.cardSales)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sales Table */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Sales Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {salesData.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Receipt className="w-12 h-12 mb-4 opacity-50" />
                  <p>No sales found for this period</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">GST</TableHead>
                      <TableHead className="text-center">Payment</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.data.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-mono text-sm">
                          {sale.invoiceNumber}
                        </TableCell>
                        <TableCell>{sale.customerName}</TableCell>
                        <TableCell>
                          {new Date(sale.createdAt).toLocaleDateString("en-IN")}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(sale.grandTotal)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(sale.totalGst)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="capitalize">
                            {sale.paymentMode}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              sale.paymentStatus === "paid"
                                ? "secondary"
                                : "destructive"
                            }
                            className="capitalize"
                          >
                            {sale.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePrint(sale)}
                              title="Reprint Invoice"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleSavePDF(sale)}
                              title="Save as PDF"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Purchases Report */}
      {reportType === "purchases" && purchasesData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <IndianRupee className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Total Purchases
                    </p>
                    <p className="text-lg font-bold">
                      {formatCurrency(purchasesData.summary.totalPurchases)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-chart-2" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">GST Paid</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(purchasesData.summary.totalGst)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-chart-3" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Transactions
                    </p>
                    <p className="text-lg font-bold">
                      {purchasesData.summary.totalTransactions}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <IndianRupee className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Outstanding Due
                    </p>
                    <p className="text-lg font-bold">
                      {formatCurrency(purchasesData.summary.totalDue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Purchases Table */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Purchase Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {purchasesData.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Receipt className="w-12 h-12 mb-4 opacity-50" />
                  <p>No purchases found for this period</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">GST</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchasesData.data.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-mono text-sm">
                          {purchase.invoiceNumber}
                        </TableCell>
                        <TableCell>{purchase.supplierName}</TableCell>
                        <TableCell>
                          {new Date(purchase.createdAt).toLocaleDateString(
                            "en-IN",
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(purchase.grandTotal)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(purchase.totalGst)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              purchase.paymentStatus === "paid"
                                ? "secondary"
                                : "destructive"
                            }
                            className="capitalize"
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
        </>
      )}
    </div>
  );
}
