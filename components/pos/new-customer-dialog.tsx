// components/pos/new-customer-dialog.tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NewCustomerDialogProps {
  open: boolean;
  onClose: () => void;
  name: string;
  phone: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onSave: () => void;
}

export function NewCustomerDialog({
  open,
  onClose,
  name,
  phone,
  onNameChange,
  onPhoneChange,
  onSave,
}: NewCustomerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cust-name">Customer Name</Label>
            <Input
              id="cust-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cust-phone">Phone Number</Label>
            <Input
              id="cust-phone"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={onSave}>
            Save Customer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
