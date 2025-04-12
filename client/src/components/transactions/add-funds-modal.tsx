import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Icon } from "@/components/ui/theme";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddFundsModal({ isOpen, onClose }: AddFundsModalProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const { toast } = useToast();

  // Handle quick amount selection
  const handleQuickAmount = (value: string) => {
    setAmount(value);
  };

  // Deposit mutation
  const depositMutation = useMutation({
    mutationFn: async (data: { amount: number, method: string }) => {
      const res = await apiRequest("POST", "/api/deposits", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Deposit successful",
        description: `$${amount} has been added to your account.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] }); // Refresh user balance
      onClose();
      setAmount("");
    },
    onError: (error) => {
      toast({
        title: "Deposit failed",
        description: error.message || "Could not process your deposit. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than zero.",
        variant: "destructive",
      });
      return;
    }

    depositMutation.mutate({
      amount: numAmount,
      method: paymentMethod
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Add Funds</DialogTitle>
        </DialogHeader>

        <p className="text-neutral-600 mb-6">
          Add funds to your Meraki account to use for purchases or as escrow deposit for trades.
        </p>

        <div className="mb-6">
          <Label htmlFor="amount" className="block text-sm font-medium text-neutral-600 mb-1">
            Amount
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 font-medium">$</span>
            <Input
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-8 pr-4 py-3 text-xl font-medium"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {["25", "50", "100", "200", "500", "1000"].map((value) => (
            <Button
              key={value}
              variant="outline"
              onClick={() => handleQuickAmount(value)}
              className={amount === value ? "border-primary" : ""}
            >
              ${value}
            </Button>
          ))}
        </div>

        <div className="mb-6">
          <h4 className="font-medium mb-3">Payment Method</h4>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className={`flex items-center p-3 border rounded-lg mb-3 ${paymentMethod === "card" ? "border-primary bg-primary/5" : "border-neutral-200 hover:border-primary hover:bg-primary/5"}`}>
              <RadioGroupItem value="card" id="card" className="mr-3" />
              <Label htmlFor="card" className="flex items-center cursor-pointer">
                <Icon icon="ri-bank-card-line text-xl mr-2" />
                <span>Credit/Debit Card</span>
              </Label>
            </div>
            
            <div className={`flex items-center p-3 border rounded-lg mb-3 ${paymentMethod === "paypal" ? "border-primary bg-primary/5" : "border-neutral-200 hover:border-primary hover:bg-primary/5"}`}>
              <RadioGroupItem value="paypal" id="paypal" className="mr-3" />
              <Label htmlFor="paypal" className="flex items-center cursor-pointer">
                <Icon icon="ri-paypal-line text-xl mr-2" />
                <span>PayPal</span>
              </Label>
            </div>
            
            <div className={`flex items-center p-3 border rounded-lg ${paymentMethod === "bankTransfer" ? "border-primary bg-primary/5" : "border-neutral-200 hover:border-primary hover:bg-primary/5"}`}>
              <RadioGroupItem value="bankTransfer" id="bankTransfer" className="mr-3" />
              <Label htmlFor="bankTransfer" className="flex items-center cursor-pointer">
                <Icon icon="ri-bank-line text-xl mr-2" />
                <span>Bank Transfer</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="mb-6">
          <div className="p-3 bg-neutral-100 rounded-lg text-neutral-700 text-sm">
            <p>
              Funds added to your account can be used for purchases or held in escrow for trades. 
              Unused funds can be withdrawn at any time.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!amount || depositMutation.isPending}
          >
            {depositMutation.isPending ? (
              <>
                <Icon icon="ri-loader-4-line animate-spin mr-2" />
                Processing...
              </>
            ) : (
              "Add Funds"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
