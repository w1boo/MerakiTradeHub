import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Product, User } from "@/types";
import { TradeOfferForm } from "@/components/trade/trade-offer-form";

interface DirectTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  user: User;
}

export default function DirectTradeModal({ isOpen, onClose, product, user }: DirectTradeModalProps) {
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Reset success state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setTimeout(() => {
        setIsSuccess(false);
      }, 300); // Delay slightly to avoid UI flicker
    }
  }, [isOpen]);
  
  // Handle success from the trade offer form
  const handleSuccess = () => {
    setIsSuccess(true);
    toast({
      title: "Trade Offer Sent",
      description: "Your trade offer has been sent to the seller.",
    });
    
    // Close modal after a short delay to show success UI
    setTimeout(() => {
      onClose();
    }, 1500);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create Direct Trade Offer</DialogTitle>
          <DialogDescription>
            Offer an item to trade for "{product.title}" 
            {product.tradeValue ? ` (valued at ${product.tradeValue.toLocaleString('vi-VN')} ₫)` : ''}
          </DialogDescription>
        </DialogHeader>
        
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-center">Trade Offer Submitted!</h3>
            <p className="text-center text-muted-foreground mt-2">
              The seller has been notified of your trade offer. You'll be notified when they respond.
            </p>
          </div>
        ) : (
          <TradeOfferForm 
            productId={product.id} 
            sellerId={product.sellerId}
            productTitle={product.title}
            onSuccess={handleSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}