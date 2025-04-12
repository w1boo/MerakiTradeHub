import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Product, User } from "@/types";
import { useLocation } from "wouter";

// Define form schema for trade offer
const tradeOfferSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  itemDescription: z.string().min(1, "Description is required"),
  itemValue: z.coerce.number().min(1, "Value must be greater than 0"),
  notes: z.string().optional(),
  images: z.array(z.string()).min(1, "At least one image is required"),
});

type TradeOfferFormData = z.infer<typeof tradeOfferSchema>;

interface TradeOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  user: User;
}

export default function TradeOfferModal({ isOpen, onClose, product, user }: TradeOfferModalProps) {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);

  // Initialize form with react-hook-form
  const form = useForm<TradeOfferFormData>({
    resolver: zodResolver(tradeOfferSchema),
    defaultValues: {
      itemName: "",
      itemDescription: "",
      itemValue: 0,
      notes: "",
      images: [],
    },
  });

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);

    // Convert to array for processing
    const fileArray = Array.from(files);
    const newPreviewImages: string[] = [];
    const newImageUrls: string[] = [];

    // Process each file to create preview and mock image upload
    fileArray.forEach((file) => {
      // Create local preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const dataUrl = e.target.result as string;
          newPreviewImages.push(dataUrl);
          
          // For demo, we're using data URLs directly
          // In a real app, you'd upload to server/cloud storage
          newImageUrls.push(dataUrl);
          
          // If all images processed, update form and state
          if (newPreviewImages.length === fileArray.length) {
            // Update form value with the new image URLs
            form.setValue("images", [...form.getValues("images"), ...newImageUrls]);
            setPreviewImages([...previewImages, ...newPreviewImages]);
            setUploadingImages(false);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove an image from the preview and form
  const removeImage = (index: number) => {
    const updatedPreviews = [...previewImages];
    updatedPreviews.splice(index, 1);
    setPreviewImages(updatedPreviews);

    const updatedImages = [...form.getValues("images")];
    updatedImages.splice(index, 1);
    form.setValue("images", updatedImages);
  };

  // Submit the trade offer
  const onSubmit = async (data: TradeOfferFormData) => {
    try {
      setIsSubmitting(true);

      // Format the trade message content
      const tradeMessage = `
**Trade Offer for: ${product.title}**

I'd like to offer my item for trade:
- **Item:** ${data.itemName}
- **Description:** ${data.itemDescription}
- **Trade Value:** ${data.itemValue.toLocaleString('vi-VN')} ₫

${data.notes ? `**Additional Notes:** ${data.notes}` : ''}

Please let me know if you're interested in this trade.
      `;

      // Create trade offer via API
      const res = await apiRequest("POST", "/api/trade-offers", {
        productId: product.id,
        sellerId: product.sellerId,
        offerMessage: tradeMessage,
        offerItemName: data.itemName,
        offerItemDescription: data.itemDescription,
        offerItemValue: data.itemValue,
        offerItemImages: data.images,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to send trade offer");
      }

      // Get the message or conversation data
      const responseData = await res.json();

      toast({
        title: "Trade Offer Sent",
        description: "Your trade offer has been sent to the seller.",
      });

      // Close the modal
      onClose();

      // Redirect to messaging page
      navigate("/messages");
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create Trade Offer</DialogTitle>
          <DialogDescription>
            Offer an item to trade for "{product.title}" (valued at {(product.tradeValue || 0).toLocaleString('vi-VN')} ₫)
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="itemName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your item name" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your item (condition, features, etc.)"
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Value (₫)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500">₫</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        className="pl-7"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Estimate the value of your item in Vietnamese Dong
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="images"
              render={() => (
                <FormItem>
                  <FormLabel>Item Images</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {/* Image Preview Area */}
                      {previewImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          {previewImages.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={image}
                                alt={`Item image ${index + 1}`}
                                className="w-full h-24 object-cover rounded-md border border-neutral-200"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Image Upload Button */}
                      <div className="flex items-center">
                        <Label
                          htmlFor="image-upload"
                          className="cursor-pointer flex items-center justify-center border border-dashed border-neutral-300 rounded-md p-4 w-full hover:bg-neutral-50 transition"
                        >
                          {uploadingImages ? (
                            <span className="text-neutral-500">Uploading...</span>
                          ) : (
                            <span className="text-neutral-500">
                              {previewImages.length > 0
                                ? "Add more images"
                                : "Upload item images"}
                            </span>
                          )}
                        </Label>
                        <Input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploadingImages}
                        />
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Upload clear photos of your item from different angles
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional information or notes for the seller"
                      className="min-h-20"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || uploadingImages}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>Send Trade Offer</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}