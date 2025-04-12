import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TradeOffer } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface DirectTradeButtonProps {
  productId: number;
  sellerId: number;
  offerValue: number;
  offerItemName: string;
  offerItemDescription: string;
  offerItemImages?: string[];
  onSuccess?: () => void;
}

export function DirectTradeButton({
  productId,
  sellerId,
  offerValue,
  offerItemName,
  offerItemDescription,
  offerItemImages = [],
  onSuccess,
}: DirectTradeButtonProps) {
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const directTradeMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await apiRequest("POST", "/api/direct-trade", {
          productId,
          sellerId,
          offerValue,
          offerItemName,
          offerItemDescription,
          offerItemImages,
          isDirect: true,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to submit trade offer");
        }
        
        return await response.json() as TradeOffer;
      } catch (error: any) {
        console.error("Trade offer error:", error);
        throw new Error(error.message || "Failed to submit trade offer");
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Trade Offer Sent",
        description: "Your trade offer has been successfully sent to the seller.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/direct-trade"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      setIsSubmitted(true);
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Trade Offer Failed",
        description: error.message || "Failed to submit trade offer. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isSubmitted) {
    return (
      <Button variant="outline" disabled className="w-full">
        Offer Submitted
      </Button>
    );
  }

  if (directTradeMutation.isPending) {
    return (
      <Button disabled className="w-full">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Submitting...
      </Button>
    );
  }

  return (
    <Button 
      onClick={() => directTradeMutation.mutate()}
      className="w-full"
    >
      Submit Trade Offer
    </Button>
  );
}