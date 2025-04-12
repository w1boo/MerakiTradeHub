import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { TradeButton } from "./trade-button";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { TradeOffer, Product, User } from "@/types";

interface TradeOfferMessageProps {
  messageId: number;
  tradeOfferId: number | null;
  senderId: number;
  receiverId: number;
  productId: number | null;
}

export function TradeOfferMessage({
  messageId,
  tradeOfferId,
  senderId,
  receiverId,
  productId,
}: TradeOfferMessageProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Fetch trade offer details
  const { data: tradeOffer, isLoading: isLoadingTradeOffer } = useQuery({
    queryKey: [`/api/trade-offers/${tradeOfferId}`],
    queryFn: async () => {
      if (!tradeOfferId) return null;
      const res = await apiRequest("GET", `/api/trade-offers/${tradeOfferId}`);
      return res.json() as Promise<TradeOffer>;
    },
    enabled: !!tradeOfferId,
  });
  
  // Fetch product details
  const { data: product, isLoading: isLoadingProduct } = useQuery({
    queryKey: [`/api/products/${productId}`],
    queryFn: async () => {
      if (!productId) return null;
      const res = await apiRequest("GET", `/api/products/${productId}`);
      return res.json() as Promise<Product>;
    },
    enabled: !!productId,
  });
  
  // Determine if current user is buyer or seller
  const isBuyer = user?.id === senderId; // Sender of trade message is the buyer
  const isSeller = user?.id === receiverId; // Receiver of trade message is the seller
  
  // Check trade status
  const isAccepted = tradeOffer?.status === 'accepted';
  const isCompleted = tradeOffer?.status === 'completed';
  const isRejected = tradeOffer?.status === 'rejected';
  const buyerConfirmed = tradeOffer?.buyerConfirmed || false;
  const sellerConfirmed = tradeOffer?.sellerConfirmed || false;
  
  useEffect(() => {
    if (!isLoadingTradeOffer && !isLoadingProduct) {
      setLoading(false);
    }
  }, [isLoadingTradeOffer, isLoadingProduct]);

  if (loading) {
    return (
      <Card className="p-4 my-2 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </Card>
    );
  }

  if (!tradeOffer || !product) {
    return (
      <Card className="p-4 my-2">
        <p className="text-sm text-muted-foreground">
          This trade offer is no longer available.
        </p>
      </Card>
    );
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return (amount / 1000).toFixed(3) + ' ₫';
  };

  return (
    <Card className="p-4 my-2">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Badge 
              variant={isCompleted ? "default" : isRejected ? "destructive" : "secondary"}
              className="mb-2"
            >
              {isCompleted 
                ? "Completed" 
                : isRejected 
                  ? "Rejected" 
                  : isAccepted 
                    ? "Accepted" 
                    : "Pending"}
            </Badge>
            <h3 className="text-lg font-semibold">{product.title}</h3>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Trade Value</p>
            <p className="font-bold text-green-600">{formatCurrency(tradeOffer.offerValue)}</p>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Product Description</p>
          <p className="text-sm">{product.description}</p>
        </div>

        {/* Trade action buttons */}
        {tradeOfferId && (
          <TradeButton
            tradeOfferId={tradeOfferId}
            isBuyer={isBuyer}
            isSeller={isSeller}
            isAccepted={isAccepted}
            isCompleted={isCompleted}
            isRejected={isRejected}
            buyerConfirmed={buyerConfirmed}
            sellerConfirmed={sellerConfirmed}
            onSuccess={() => {
              // Refresh trade offer data after action
              // This will happen automatically through query invalidation
            }}
          />
        )}
      </div>
    </Card>
  );
}