import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface TradeButtonProps {
  tradeOfferId: number;
  isBuyer: boolean;
  isAccepted: boolean;
  isCompleted: boolean;
  isRejected: boolean;
  isSeller: boolean;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  onSuccess?: () => void;
}

export function TradeButton({
  tradeOfferId,
  isBuyer,
  isSeller,
  isAccepted,
  isCompleted,
  isRejected,
  buyerConfirmed,
  sellerConfirmed,
  onSuccess,
}: TradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const acceptTradeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/trade-offers/${tradeOfferId}/accept`,
        {}
      );
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trade-offers"] });
      toast({
        title: "Trade accepted",
        description: "You have accepted this trade offer.",
      });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      console.error("Error accepting trade:", error);
      toast({
        title: "Error accepting trade",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const confirmTradeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/trade-offers/${tradeOfferId}/confirm`,
        {}
      );
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trade-offers"] });
      toast({
        title: "Trade confirmed",
        description: "You have confirmed this trade. The transaction is now complete.",
      });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      console.error("Error confirming trade:", error);
      toast({
        title: "Error confirming trade",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectTradeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/trade-offers/${tradeOfferId}/reject`,
        {}
      );
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trade-offers"] });
      toast({
        title: "Trade rejected",
        description: "You have rejected this trade offer.",
      });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      console.error("Error rejecting trade:", error);
      toast({
        title: "Error rejecting trade",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAcceptTrade = async () => {
    setLoading(true);
    try {
      await acceptTradeMutation.mutateAsync();
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTrade = async () => {
    setLoading(true);
    try {
      await confirmTradeMutation.mutateAsync();
    } finally {
      setLoading(false);
    }
  };

  const handleRejectTrade = async () => {
    setLoading(true);
    try {
      await rejectTradeMutation.mutateAsync();
    } finally {
      setLoading(false);
    }
  };

  // Pending state - both buyer and seller can see status
  if (!isAccepted && !isCompleted && !isRejected) {
    // Seller can accept the trade offer
    if (isSeller && !sellerConfirmed) {
      return (
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={handleAcceptTrade}
            disabled={loading || acceptTradeMutation.isPending}
            className="bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800"
          >
            {(loading || acceptTradeMutation.isPending) ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Accept Trade Offer
          </Button>
          <Button
            variant="outline"
            onClick={handleRejectTrade}
            disabled={loading || rejectTradeMutation.isPending}
          >
            {(loading || rejectTradeMutation.isPending) ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Reject
          </Button>
        </div>
      );
    }
    
    // Buyer is waiting for seller response
    if (isBuyer) {
      return (
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled>
            Awaiting Seller Response
          </Button>
          <Button
            variant="outline"
            onClick={handleRejectTrade}
            disabled={loading || rejectTradeMutation.isPending}
          >
            {(loading || rejectTradeMutation.isPending) ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Cancel Offer
          </Button>
        </div>
      );
    }
  }

  // Accepted state - buyer needs to confirm
  if (isAccepted && !isCompleted && !isRejected) {
    if (isBuyer && !buyerConfirmed) {
      return (
        <Button
          variant="default"
          onClick={handleConfirmTrade}
          disabled={loading || confirmTradeMutation.isPending}
          className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800"
        >
          {(loading || confirmTradeMutation.isPending) ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Confirm & Complete Trade
        </Button>
      );
    }
    
    if (isSeller) {
      return (
        <Button variant="outline" disabled>
          Waiting for Buyer to Confirm
        </Button>
      );
    }
  }

  // Completed trade
  if (isCompleted) {
    return (
      <Button variant="outline" disabled className="text-green-600 border-green-600">
        Trade Completed ✓
      </Button>
    );
  }

  // Rejected trade
  if (isRejected) {
    return (
      <Button variant="outline" disabled className="text-red-600 border-red-600">
        Trade Rejected ✗
      </Button>
    );
  }

  // Default state
  return null;
}