import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Product, User } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

// Define form schema for direct trade offer
const directTradeSchema = z.object({
  offeredItemName: z.string().min(1, "Item name is required"),
  offeredItemDescription: z.string().min(1, "Description is required"),
  offeredItemValue: z.coerce.number().min(1, "Value must be greater than 0"),
  notes: z.string().optional(),
  offeredItemImages: z.array(z.string()).min(1, "At least one image is required"),
});

type DirectTradeFormData = z.infer<typeof directTradeSchema>;

interface DirectTradeDialogProps {
  productId: number;
  productTitle: string;
  productImage?: string;
  productValue?: number | null;
  sellerName?: string;
  onTradeOffered?: () => void;
}

export default function DirectTradeDialog({
  productId,
  productTitle,
  productImage,
  productValue = 0,
  sellerName,
  onTradeOffered
}: DirectTradeDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>("");
  
  // Setup form
  const form = useForm<DirectTradeFormData>({
    resolver: zodResolver(directTradeSchema),
    defaultValues: {
      offeredItemName: "",
      offeredItemDescription: "",
      offeredItemValue: 0,
      notes: "",
      offeredItemImages: ["https://via.placeholder.com/150?text=Item+Image"],
    },
  });
  
  const onSubmit = async (data: DirectTradeFormData) => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "You must be logged in to make a trade offer",
        variant: "destructive",
      });
      return;
    }
    
    setSubmitting(true);
    setStatus('loading');
    setStatusMessage('Processing trade offer...');
    
    try {
      // Create direct trade offer
      const response = await apiRequest("POST", "/api/direct-trade-offers", {
        productId: productId,
        offeredItemName: data.offeredItemName,
        offeredItemDescription: data.offeredItemDescription,
        offeredItemValue: data.offeredItemValue,
        offeredItemImages: data.offeredItemImages,
        notes: data.notes,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create trade offer");
      }
      
      const result = await response.json();
      
      setStatus('success');
      setStatusMessage('Trade offer sent successfully! The seller will be notified.');
      
      toast({
        title: "Trade offer sent",
        description: "Your trade offer has been sent to the seller",
      });
      
      // Notify parent component
      if (onTradeOffered) {
        onTradeOffered();
      }
      
      // Reset form after 3 seconds
      setTimeout(() => {
        form.reset();
        setOpen(false);
        setStatus('idle');
      }, 3000);
      
    } catch (error) {
      console.error("Error creating trade offer:", error);
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : "An unknown error occurred");
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create trade offer",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Direct Trade
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Offer Direct Trade</DialogTitle>
          <DialogDescription>
            Create a trade offer for {productTitle} {sellerName ? `from ${sellerName}` : ""}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4">
          {/* Target product information */}
          <div className="border rounded-md overflow-hidden">
            <div className="flex items-start p-4">
              {productImage && (
                <img 
                  src={productImage} 
                  alt={productTitle} 
                  className="w-16 h-16 object-cover rounded-md mr-3" 
                />
              )}
              <div>
                <h4 className="font-medium">{productTitle}</h4>
                {productValue !== null && productValue > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Trade Value: {productValue.toLocaleString('vi-VN')} ₫
                  </p>
                )}
                <div className="mt-1 text-xs text-green-600 font-medium">
                  Trade target
                </div>
              </div>
            </div>
          </div>
          
          {/* Status alerts */}
          {status === 'loading' && (
            <Alert className="mb-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <AlertTitle>Processing</AlertTitle>
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          )}
          
          {status === 'success' && (
            <Alert className={cn("mb-4", "bg-green-50 border-green-200")}>
              <Check className="h-4 w-4 text-green-500 mr-2" />
              <AlertTitle className="text-green-700">Success</AlertTitle>
              <AlertDescription className="text-green-600">{statusMessage}</AlertDescription>
            </Alert>
          )}
          
          {status === 'error' && (
            <Alert className="mb-4" variant="destructive">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          )}
          
          {/* Trade form */}
          {status === 'idle' || status === 'error' ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="offeredItemName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Item Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter the name of your item" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="offeredItemDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Item Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your item in detail" 
                          className="min-h-[80px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="offeredItemValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Item Value (VND)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          placeholder="Enter the value of your item" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        This is the amount that will be held in escrow for the trade. The maximum of your item value and the target item's value will be used.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add any notes for the seller" 
                          className="min-h-[80px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : 'Send Trade Offer'}
                  </Button>
                </div>
              </form>
            </Form>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}