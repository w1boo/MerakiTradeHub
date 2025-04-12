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
  
  // Use type guards and optional chaining to safely access trade confirmation fields
  const hasConfirmedBuyer = typeof message.tradeConfirmedBuyer === 'boolean' ? message.tradeConfirmedBuyer : false;
  const hasConfirmedSeller = typeof message.tradeConfirmedSeller === 'boolean' ? message.tradeConfirmedSeller : false;
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
      
      // Invalidate both conversation lists and current conversation
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/trade-messages"] });
      
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
        <div className="flex items-center text-status-success bg-status-success/10 p-2 rounded-md">
          <Icon icon="ri-checkbox-circle-fill mr-2" />
          <span className="font-medium">Trade confirmed by both parties</span>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col gap-2 text-sm bg-neutral-50 p-3 rounded-md">
        <h4 className="font-medium">Trade Status:</h4>
        <div className="flex items-center">
          <Icon icon={hasConfirmedBuyer ? "ri-checkbox-circle-fill text-status-success mr-2" : "ri-checkbox-blank-circle-line text-neutral-400 mr-2"} />
          <span>Buyer: {hasConfirmedBuyer ? 
            <span className="text-status-success font-medium">Confirmed</span> : 
            <span className="text-neutral-500">Not confirmed</span>}
          </span>
        </div>
        <div className="flex items-center">
          <Icon icon={hasConfirmedSeller ? "ri-checkbox-circle-fill text-status-success mr-2" : "ri-checkbox-blank-circle-line text-neutral-400 mr-2"} />
          <span>Seller: {hasConfirmedSeller ? 
            <span className="text-status-success font-medium">Confirmed</span> : 
            <span className="text-neutral-500">Not confirmed</span>}
          </span>
        </div>
      </div>
    );
  };
  
  const canConfirm = (isBuyer && !hasConfirmedBuyer) || (isSeller && !hasConfirmedSeller);
  
  return (
    <Card className="mb-2 border-accent/30 overflow-hidden shadow-md">
      <div className="bg-accent/10 p-2 border-b border-accent/20">
        <div className="flex items-center">
          <Icon icon="ri-exchange-fill text-accent mr-2" />
          <span className="font-semibold text-accent">Trade Offer</span>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="flex flex-col">
          <div className="flex items-start mb-4">
            <img 
              src={product.images[0]} 
              alt={product.title} 
              className="w-16 h-16 object-cover rounded-md mr-3 shadow-sm" 
            />
            <div>
              <h4 className="font-medium text-base">{product.title}</h4>
              <p className="text-sm text-neutral-600 mt-1">
                <span className="text-neutral-500">Trade Value:</span>{' '}
                <span className="font-medium">{product.tradeValue?.toLocaleString('vi-VN')} ₫</span>
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                From: {product.sellerId === currentUser.id ? 'You' : otherUser.username}
              </p>
            </div>
          </div>
          
          <div className="bg-neutral-50 p-3 rounded-md mb-4">
            <p className="text-sm whitespace-pre-line text-neutral-700">{message.content}</p>
          </div>
          
          <div className="border-t border-neutral-200 pt-3 mt-1">
            {renderConfirmationStatus()}
          </div>
          
          {!isConfirmed && canConfirm && (
            <Button 
              variant="default" 
              className="mt-4 w-full" 
              onClick={handleConfirmTrade}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Icon icon="ri-loader-4-line animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Icon icon="ri-check-line mr-2" />
                  Confirm Trade
                </>
              )}
            </Button>
          )}
          
          {isConfirmed && (
            <div className="mt-3 text-center text-sm text-status-success">
              <p>This trade has been successfully confirmed by both parties.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}