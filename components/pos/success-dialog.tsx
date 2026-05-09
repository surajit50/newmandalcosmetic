// components/pos/success-dialog.tsx
"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Printer, Download } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface SuccessDialogProps {
  open: boolean;
  onClose: () => void;
  invoiceNumber?: string;
  grandTotal?: number;
  onPrint: () => void;
  onSavePDF: () => void;
}

export function SuccessDialog({
  open,
  onClose,
  invoiceNumber,
  grandTotal = 0,
  onPrint,
  onSavePDF,
}: SuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">
        <div className="flex flex-col items-center space-y-4 py-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Sale Completed!</h2>
            <p className="text-muted-foreground">Invoice #{invoiceNumber}</p>
          </div>
          <div className="text-3xl font-bold text-primary">
            {formatCurrency(grandTotal)}
          </div>
          <div className="flex flex-col gap-2 w-full pt-4">
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                New Sale
              </Button>
              <Button className="flex-1" onClick={onPrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
            <Button
              variant="secondary"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={onSavePDF}
            >
              <Download className="w-4 h-4 mr-2" />
              Save as PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
