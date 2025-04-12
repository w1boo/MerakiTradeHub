import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/ui/theme";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddFundsModal({ isOpen, onClose }: AddFundsModalProps) {
  const [amount, setAmount] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Format number with commas for VND
  const formatVND = (value: string): string => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '');
    
    // Format with commas for thousands
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Handle quick amount selection
  const handleQuickAmount = (value: string) => {
    setAmount(value);
  };

  // Format amount on input
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    setAmount(rawValue);
  };

  // Deposit mutation
  const depositMutation = useMutation({
    mutationFn: async (data: { amount: number, method: string }) => {
      const res = await apiRequest("POST", "/api/deposits", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Deposit request submitted",
        description: `${formatVND(amount)} VND will be added to your account after your bank transfer is confirmed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] }); // Refresh user balance
      onClose();
      setAmount("");
    },
    onError: (error) => {
      toast({
        title: "Deposit request failed",
        description: error.message || "Could not process your deposit request. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = () => {
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount < 10000) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount of at least 10,000 VND.",
        variant: "destructive",
      });
      return;
    }

    depositMutation.mutate({
      amount: numAmount,
      method: "bankTransfer"
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Add Funds</DialogTitle>
          <DialogDescription>
            Add funds to your Meraki account to use for purchases or as escrow deposit for trades.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-6">
          <Label htmlFor="amount" className="block text-sm font-medium text-neutral-600 mb-1">
            Amount (VND)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 font-medium">₫</span>
            <Input
              id="amount"
              value={formatVND(amount)}
              onChange={handleAmountChange}
              className="pl-8 pr-4 py-3 text-xl font-medium"
              placeholder="0"
            />
          </div>
          <p className="text-sm text-neutral-500 mt-1">Minimum amount: 10,000 VND</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {["10000", "50000", "100000", "200000", "500000", "1000000"].map((value) => (
            <Button
              key={value}
              variant="outline"
              onClick={() => handleQuickAmount(value)}
              className={amount === value ? "border-primary" : ""}
            >
              {formatVND(value)} ₫
            </Button>
          ))}
        </div>

        <div className="mb-6">
          <h4 className="font-medium mb-3">Bank Transfer Details</h4>
          <div className="p-4 border rounded-lg border-primary bg-primary/5">
            <div className="flex items-center mb-2">
              <Icon icon="ri-bank-line text-xl mr-2 text-primary" />
              <span className="font-medium">Bank: Vietcombank</span>
            </div>
            <div className="mb-2">
              <p className="font-semibold">Account Number: 1017158927</p>
              <p className="font-semibold">Name: NGUYEN LE DANG KHOA</p>
            </div>
            <div className="mt-3 border-t pt-3 border-dashed border-primary/30">
              <p className="text-sm font-medium">Transfer Description:</p>
              <p className="bg-white p-2 rounded border mt-1 font-mono text-sm">
                MERAKI {user?.username || ""}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Please include your username in the transfer description exactly as shown above.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="p-3 bg-neutral-100 rounded-lg text-neutral-700 text-sm">
            <p>
              After making your bank transfer, click the button below to submit your deposit request. 
              Your funds will be available in your account once the transfer is confirmed.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={parseInt(amount, 10) < 10000 || depositMutation.isPending}
          >
            {depositMutation.isPending ? (
              <>
                <Icon icon="ri-loader-4-line animate-spin mr-2" />
                Processing...
              </>
            ) : (
              "Submit Deposit Request"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
