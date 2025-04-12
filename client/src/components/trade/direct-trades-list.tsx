import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface DirectTradeOffer {
  id: number;
  buyerId: number;
  sellerId: number;
  productId: number;
  status: string;
  offerItemName: string;
  offerItemDescription: string;
  offerValue: number;
  createdAt: string;
}

interface DirectTradesListProps {
  type: "sent" | "received";
  userId: number;
}

export function DirectTradesList({ type, userId }: DirectTradesListProps) {
  const { toast } = useToast();

  // Fetch direct trade offers
  const { data: offers, isLoading, error } = useQuery({
    queryKey: ["/api/direct-trades"],
    queryFn: async () => {
      const response = await fetch("/api/direct-trades");
      if (!response.ok) {
        throw new Error("Failed to fetch trade offers");
      }
      return response.json() as Promise<DirectTradeOffer[]>;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !offers) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error loading trade offers</p>
      </div>
    );
  }

  // Filter offers based on the type (sent or received)
  const filteredOffers = type === "sent" 
    ? offers.filter(offer => offer.buyerId === userId)
    : offers.filter(offer => offer.sellerId === userId);

  if (filteredOffers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No {type} trade offers found</p>
      </div>
    );
  }

  const handleAccept = async (id: number) => {
    try {
      const res = await apiRequest("POST", `/api/direct-trades/${id}/accept`, {});
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to accept trade offer");
      }
      
      toast({
        title: "Trade Offer Accepted",
        description: "You've accepted the trade offer.",
      });
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/direct-trades"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "There was a problem accepting the trade offer",
        variant: "destructive",
      });
    }
  };

  const handleConfirm = async (id: number) => {
    try {
      const res = await apiRequest("POST", `/api/direct-trades/${id}/confirm`, {});
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to confirm trade");
      }
      
      toast({
        title: "Trade Confirmed",
        description: "The trade has been confirmed and completed.",
      });
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/direct-trades"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "There was a problem confirming the trade",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: number) => {
    try {
      const res = await apiRequest("POST", `/api/direct-trades/${id}/reject`, {});
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to reject trade offer");
      }
      
      toast({
        title: "Trade Offer Rejected",
        description: "You've rejected the trade offer.",
      });
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/direct-trades"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "There was a problem rejecting the trade offer",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "accepted":
        return <Badge variant="secondary">Accepted</Badge>;
      case "completed":
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {filteredOffers.map((offer) => (
        <Card key={offer.id}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Trade Offer #{offer.id}</CardTitle>
              {getStatusBadge(offer.status)}
            </div>
            <CardDescription>
              Offered on {new Date(offer.createdAt).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-1">Offered Item</h3>
                <div className="bg-muted p-3 rounded-md">
                  <p className="font-medium">{offer.offerItemName}</p>
                  <p className="text-sm text-muted-foreground">{offer.offerItemDescription}</p>
                  <p className="text-sm font-medium mt-2">{offer.offerValue.toLocaleString('vi-VN')} ₫</p>
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-1">Product ID</h3>
                <div className="bg-muted p-3 rounded-md">
                  <p>#{offer.productId}</p>
                </div>
              </div>
            </div>
            
            {/* Action buttons based on status and user type */}
            {type === "received" && offer.status === "pending" && (
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => handleReject(offer.id)}
                  className="flex items-center gap-1"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
                <Button 
                  onClick={() => handleAccept(offer.id)}
                  className="flex items-center gap-1"
                >
                  <CheckCircle className="h-4 w-4" />
                  Accept
                </Button>
              </div>
            )}
            
            {/* For accepted offers, buyer needs to confirm */}
            {offer.status === "accepted" && (
              <div className="flex gap-2 mt-4">
                {type === "sent" && (
                  <Button 
                    onClick={() => handleConfirm(offer.id)}
                    className="flex items-center gap-1"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Confirm Trade
                  </Button>
                )}
                {type === "received" && (
                  <div className="text-sm text-muted-foreground mt-2">
                    Waiting for buyer to confirm the trade
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}