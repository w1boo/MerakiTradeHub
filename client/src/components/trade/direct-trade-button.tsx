import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// Use a simple span for the icon instead of the Icon component
// since we don't have access to it

interface DirectTradeButtonProps {
  productId: number;
  sellerId: number;
  offerValue: number;
  offerItemName: string;
  offerItemDescription: string;
  offerItemImage?: string; // We'll convert this to offerItemImages array in the API
  onSuccess?: () => void;
}

export function DirectTradeButton({
  productId,
  sellerId,
  offerValue,
  offerItemName,
  offerItemDescription,
  offerItemImage,
  onSuccess
}: DirectTradeButtonProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      console.log("Sending trade offer with image:", offerItemImage ? `Image exists (length: ${offerItemImage.length})` : "No image");
      
      // Create the array of images instead of sending single image
      const offerItemImages = offerItemImage ? [offerItemImage] : [];
      
      // Create a direct trade offer using the direct trade API
      const res = await apiRequest("POST", "/api/direct-trades", {
        productId,
        sellerId,
        offerValue,
        offerItemName,
        offerItemDescription,
        offerItemImages, // Send as array directly
        status: "pending",
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create trade offer");
      }
      
      // Get the response data
      const data = await res.json();
      
      // Show success toast
      toast({
        title: "Trade Offer Sent",
        description: "Your trade offer has been sent to the seller.",
      });
      
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/direct-trades"] });
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Error Sending Trade Offer",
        description: error.message || "There was a problem sending your trade offer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Button 
      onClick={handleSubmit}
      disabled={isSubmitting}
    >
      {isSubmitting ? (
        <>
          <span className="animate-spin inline-block mr-2">⟳</span>
          Submitting...
        </>
      ) : (
        "Send Trade Offer"
      )}
    </Button>
  );
}