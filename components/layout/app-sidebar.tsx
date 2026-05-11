"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Package,
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Users,
  Truck,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  Tags,
  BarChart3,
  Receipt,
  AlertCircle,
  X,
  Zap
} from "lucide-react";

// ------------------------------------------------------------------
// Role-based access configuration
// ------------------------------------------------------------------
// Each role (string, matching your backend enum) maps to an array of allowed
// navigation group titles. You can later extend this to also filter individual
// items inside a group.
const roleGroupAccess: Record<string, string[]> = {
  ADMIN: ["Overview", "Inventory", "Finance", "People", "Analytics", "System"],
  MANAGER: ["Overview", "Inventory", "People", "Analytics"],
  CASHIER: ["Overview"],
  STAFF: ["Overview", "Inventory"],
};

// Optionally, you can refine access to specific items inside a group.
// For simplicity, we use the group-level filter above.
// ------------------------------------------------------------------

const navigation = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "POS Billing", href: "/dashboard/pos", icon: ShoppingCart },
    ],
  },
  {
    title: "Inventory",
    items: [
      { name: "Products", href: "/dashboard/products", icon: Boxes },
      { name: "Categories", href: "/dashboard/categories", icon: Tags },
      { name: "Brands", href: "/dashboard/brands", icon: Tags },
      { name: "Inventory", href: "/dashboard/inventory", icon: Boxes },
      { name: "Low Stock", href: "/dashboard/low-stock", icon: AlertCircle },
      { name: "Quick Bill Presets", href: "/dashboard/admin/quick-bills", icon: Zap },
    ],
  },
  {
    title: "Finance",
    items: [
      { name: "Expenses", href: "/dashboard/expenses", icon: CreditCard },
      { name: "Purchases", href: "/dashboard/purchases", icon: Receipt },
      { name: "Dues", href: "/dashboard/dues", icon: CreditCard },
    ],
  },
  {
    title: "People",
    items: [
      { name: "Customers", href: "/dashboard/customers", icon: Users },
      { name: "Suppliers", href: "/dashboard/suppliers", icon: Truck },
      { name: "Employees", href: "/dashboard/employees", icon: Users },
    ],
  },
  {
    title: "Analytics",
    items: [
      { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
      { name: "GST Reports", href: "/dashboard/gst", icon: FileText },
    ],
  },
  {
    title: "System",
    items: [{ name: "Settings", href: "/dashboard/settings", icon: Settings }],
  },
];

export function AppSidebar({
  isOpen,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // ---------------------------------------------------------------
  // Filter navigation based on user role
  // ---------------------------------------------------------------
  const userRole = session?.user?.role ?? ""; // e.g., "ADMIN", "MANAGER", etc.
  const allowedGroups = roleGroupAccess[userRole] ?? []; // fallback: empty (no menu) if role unknown

  const filteredNavigation = navigation.filter((group) =>
    allowedGroups.includes(group.title)
  );
  // ---------------------------------------------------------------

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col shadow-xl transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      {/* Logo */}
      <div className="h-14 lg:h-16 flex items-center justify-between px-6 border-b border-sidebar-border bg-sidebar/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20">
            <Package className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-sidebar-foreground text-xs lg:text-sm tracking-tight">
              NEW MANDAL
            </span>
            <span className="text-[8px] lg:text-[10px] text-muted-foreground uppercase font-medium tracking-widest">
              ERP System
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden -mr-2 rounded-lg hover:bg-primary/10"
          onClick={onClose}
        >
          <X className="w-5 h-5 text-primary" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 scrollbar-hide">
        <div className="space-y-6">
          {filteredNavigation.map((group) => (
            <div key={group.title} className="space-y-2">
              <h3 className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                {group.title}
              </h3>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "w-4 h-4 transition-transform group-hover:scale-110",
                            isActive
                              ? "text-primary-foreground"
                              : "text-muted-foreground group-hover:text-sidebar-foreground",
                          )}
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* User Menu */}
      <div className="p-4 border-t border-sidebar-border bg-sidebar/50 backdrop-blur-md">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between px-3 py-2 h-auto hover:bg-sidebar-accent border border-transparent hover:border-sidebar-border rounded-xl transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 ring-2 ring-primary/5">
                  <span className="text-sm font-bold text-primary">
                    {session?.user?.name?.charAt(0).toUpperCase() || "A"}
                  </span>
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold text-sidebar-foreground text-left truncate w-24">
                    {session?.user?.name || "Admin"}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                    {session?.user?.role || "Administrator"}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="w-56 rounded-xl p-2 shadow-2xl"
          >
            <DropdownMenuItem asChild className="rounded-lg">
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 opacity-50" />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive rounded-lg"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
