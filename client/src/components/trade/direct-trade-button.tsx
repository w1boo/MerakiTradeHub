import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  onSuccess
}: DirectTradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createTradeMutation = useMutation({
    mutationFn: async () => {
      // Create trade offer directly without message
      const res = await apiRequest("POST", "/api/direct-trade", {
        productId,
        sellerId,
        offerValue,
        offerItemName,
        offerItemDescription,
        offerItemImages
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create trade offer");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Trade offer sent",
        description: "Your trade offer has been sent to the seller.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trade-offers"] });
      
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      console.error("Error creating trade offer:", error);
      toast({
        title: "Error creating trade offer",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateTrade = async () => {
    setLoading(true);
    try {
      await createTradeMutation.mutateAsync();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="default"
      onClick={handleCreateTrade}
      disabled={loading || createTradeMutation.isPending}
      className="w-full bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800"
    >
      {(loading || createTradeMutation.isPending) ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : null}
      Send Trade Offer
    </Button>
  );
}