"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Menu, Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <AppSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-30 lg:hidden flex items-center gap-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg hover:bg-primary/10 -ml-2"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-xs tracking-tight text-foreground uppercase">
              New Mandal
            </span>
          </div>
        </header>

        <main
          className={cn(
            "flex-1 transition-all duration-300",
            "lg:ml-64", // Offset for fixed sidebar on desktop
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
