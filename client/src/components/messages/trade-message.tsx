import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/theme";
import { Product, Message, User } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TradeMessageProps {
  message: Message;
  product: Product;
  currentUser: User;
  otherUser: User;
}

export default function TradeMessage({ message, product, currentUser, otherUser }: TradeMessageProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const isFromCurrentUser = message.senderId === currentUser.id;
  const isBuyer = isFromCurrentUser || message.receiverId === currentUser.id;
  const isSeller = product.sellerId === currentUser.id;
  
  const hasConfirmedBuyer = message.tradeConfirmedBuyer;
  const hasConfirmedSeller = message.tradeConfirmedSeller;
  const isConfirmed = hasConfirmedBuyer && hasConfirmedSeller;
  
  const confirmTradeMutation = useMutation({
    mutationFn: async (data: { messageId: number; role: 'buyer' | 'seller' }) => {
      setIsSubmitting(true);
      try {
        const res = await apiRequest("POST", "/api/trade/confirm", data);
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "Failed to confirm trade");
        }
        return await res.json();
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Trade Confirmed",
        description: "You have confirmed this trade offer."
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (message.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/conversations", message.id] });
      }
      
      // If both parties confirmed, create transaction automatically
      if (data.isFullyConfirmed) {
        toast({
          title: "Trade Completed!",
          description: "The trade has been completed. A transaction has been created."
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleConfirmTrade = () => {
    const role = isBuyer ? 'buyer' : 'seller';
    confirmTradeMutation.mutate({ messageId: message.id, role });
  };
  
  const renderConfirmationStatus = () => {
    if (isConfirmed) {
      return (
        <div className="flex items-center text-status-success">
          <Icon icon="ri-checkbox-circle-fill mr-1" />
          <span>Trade confirmed by both parties</span>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center">
          <Icon icon={hasConfirmedBuyer ? "ri-checkbox-circle-fill text-status-success mr-1" : "ri-checkbox-blank-circle-line text-neutral-400 mr-1"} />
          <span>Buyer: {hasConfirmedBuyer ? "Confirmed" : "Not confirmed"}</span>
        </div>
        <div className="flex items-center">
          <Icon icon={hasConfirmedSeller ? "ri-checkbox-circle-fill text-status-success mr-1" : "ri-checkbox-blank-circle-line text-neutral-400 mr-1"} />
          <span>Seller: {hasConfirmedSeller ? "Confirmed" : "Not confirmed"}</span>
        </div>
      </div>
    );
  };
  
  const canConfirm = (isBuyer && !hasConfirmedBuyer) || (isSeller && !hasConfirmedSeller);
  
  return (
    <Card className="mb-2 border-accent/30">
      <CardContent className="p-4">
        <div className="flex flex-col">
          <div className="flex items-center mb-2">
            <Icon icon="ri-exchange-fill text-accent mr-1" />
            <span className="font-medium text-accent">Trade Offer</span>
          </div>
          
          <div className="flex items-center mb-3">
            <img 
              src={product.images[0]} 
              alt={product.title} 
              className="w-12 h-12 object-cover rounded-md mr-3" 
            />
            <div>
              <h4 className="font-medium">{product.title}</h4>
              <p className="text-sm text-neutral-600">
                Trade Value: {product.tradeValue?.toLocaleString('vi-VN')} ₫
              </p>
            </div>
          </div>
          
          <div className="mb-3">
            <p className="text-sm whitespace-pre-line">{message.content}</p>
          </div>
          
          <div className="border-t border-neutral-200 pt-3 mt-2">
            {renderConfirmationStatus()}
          </div>
          
          {!isConfirmed && canConfirm && (
            <Button 
              variant="default" 
              className="mt-3" 
              onClick={handleConfirmTrade}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Icon icon="ri-loader-4-line animate-spin mr-1" />
                  Processing...
                </>
              ) : (
                <>
                  <Icon icon="ri-check-line mr-1" />
                  Confirm Trade
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}