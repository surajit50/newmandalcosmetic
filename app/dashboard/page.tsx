"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  IndianRupee,
  ShoppingCart,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  ArrowRight,
  Loader2,
  Calendar,
  ChevronRight,
  Plus,
  Receipt,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  todayPurchases: number;
  totalCustomers: number;
  lowStockItems: number;
  totalDueFromCustomers: number;
  totalDueToSuppliers: number;
  cashInHand: number;
  monthlySales: { date: string; amount: number }[];
  topProducts: { name: string; quantity: number }[];
  recentSales: {
    id: string;
    invoiceNumber: string;
    customerName: string;
    grandTotal: number;
    createdAt: string;
  }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const seedDatabase = async () => {
    setIsSeeding(true);
    try {
      const response = await fetch("/api/seed", { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        fetchStats();
      } else {
        setError(data.error || "Failed to seed database");
      }
    } catch {
      setError("Failed to connect to database");
    } finally {
      setIsSeeding(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dashboard");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setError(null);
      } else {
        setError("Failed to fetch dashboard data");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const chartData = stats?.monthlySales || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse font-medium">
            Loading business insights...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            Database Setup Required
          </h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            Click the button below to initialize the database with default data
            including an admin user.
          </p>
          <Button onClick={seedDatabase} disabled={isSeeding}>
            {isSeeding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              "Initialize Database"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Business Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time performance metrics for New Mandal Cosmetic.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/purchases">
            <Button variant="outline" className="rounded-xl border-border/50 hover:bg-accent/50">
              <Plus className="w-4 h-4 mr-2" />
              New Purchase
            </Button>
          </Link>
          <Link href="/dashboard/pos">
            <Button className="rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Launch POS
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(stats?.todaySales || 0)}
          icon={IndianRupee}
          iconClassName="bg-primary/20 text-primary border border-primary/20"
          className="rounded-2xl border-none bg-card shadow-sm hover:shadow-md transition-all duration-300"
        />
        <StatCard
          title="Today's Purchases"
          value={formatCurrency(stats?.todayPurchases || 0)}
          icon={Package}
          iconClassName="bg-chart-4/20 text-chart-4 border border-chart-4/20"
          className="rounded-2xl border-none bg-card shadow-sm hover:shadow-md transition-all duration-300"
        />
        <StatCard
          title="Cash in Hand"
          value={formatCurrency(stats?.cashInHand || 0)}
          icon={IndianRupee}
          iconClassName="bg-success/20 text-success border border-success/20"
          className="rounded-2xl border-none bg-card shadow-sm hover:shadow-md transition-all duration-300"
        />
        <StatCard
          title="Low Stock Items"
          value={stats?.lowStockItems || 0}
          icon={AlertTriangle}
          iconClassName="bg-warning/20 text-warning border border-warning/20"
          className="rounded-2xl border-none bg-card shadow-sm hover:shadow-md transition-all duration-300"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <Card className="lg:col-span-2 border-none bg-card rounded-3xl overflow-hidden shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-8">
            <div>
              <CardTitle className="text-xl font-bold">Sales Trend</CardTitle>
              <p className="text-sm text-muted-foreground">Daily revenue over the last 30 days</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-bold uppercase tracking-wider">
              <TrendingUp className="w-3 h-3" />
              +12.5%
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    tickFormatter={(str) => new Date(str).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    }}
                    itemStyle={{ color: "var(--primary)", fontWeight: "bold" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorAmount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <div className="space-y-8">
          <Card className="border-none bg-card rounded-3xl shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold">Recent Sales</CardTitle>
              <Link href="/dashboard/reports">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 rounded-full h-8">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {stats?.recentSales.map((sale) => (
                  <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-accent/30 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center border border-border/50">
                        <Receipt className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {sale.customerName}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">
                          #{sale.invoiceNumber}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-foreground">
                        {formatCurrency(sale.grandTotal)}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Dues Quick View */}
          <div className="grid grid-cols-1 gap-4">
            <Card className="border-none bg-success/5 border border-success/10 rounded-3xl p-6 relative overflow-hidden group">
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-success uppercase tracking-widest mb-1">Due from Customers</p>
                  <p className="text-2xl font-black text-foreground">{formatCurrency(stats?.totalDueFromCustomers || 0)}</p>
                </div>
                <Link href="/dashboard/dues?type=customers">
                  <Button size="icon" variant="ghost" className="rounded-full bg-success/10 text-success hover:bg-success/20">
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
              <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 text-success/5 -rotate-12 group-hover:scale-110 transition-transform" />
            </Card>

            <Card className="border-none bg-destructive/5 border border-destructive/10 rounded-3xl p-6 relative overflow-hidden group">
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-destructive uppercase tracking-widest mb-1">Due to Suppliers</p>
                  <p className="text-2xl font-black text-foreground">{formatCurrency(stats?.totalDueToSuppliers || 0)}</p>
                </div>
                <Link href="/dashboard/dues?type=suppliers">
                  <Button size="icon" variant="ghost" className="rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20">
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
              <TrendingDown className="absolute -right-4 -bottom-4 w-24 h-24 text-destructive/5 rotate-12 group-hover:scale-110 transition-transform" />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
