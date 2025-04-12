import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { DirectTradeButton } from "./direct-trade-button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Loader2 } from "lucide-react";

// The form schema
const formSchema = z.object({
  offerItemName: z.string().min(1, "Item name is required"),
  offerItemDescription: z.string().min(1, "Item description is required"),
  offerValue: z.number().min(1000, "Value must be at least 1,000 VND"),
  offerItemImage: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TradeOfferFormProps {
  productId: number;
  sellerId: number;
  productTitle: string;
  onSuccess?: () => void;
}

export function TradeOfferForm({ productId, sellerId, productTitle, onSuccess }: TradeOfferFormProps) {
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [formData, setFormData] = useState<FormValues | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      offerItemName: "",
      offerItemDescription: "",
      offerValue: 10000,
      offerItemImage: "",
    },
    mode: "onBlur", // validate on blur for better UX
  });
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append("image", file);
      
      // Send the image to the server
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload image");
      }
      
      const data = await response.json();
      const imageUrl = data.url;
      
      // Set the uploaded image URL
      setUploadedImage(imageUrl);
      form.setValue("offerItemImage", imageUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsUploading(false);
    }
  };
  
  const removeImage = () => {
    setUploadedImage(null);
    form.setValue("offerItemImage", "");
  };
  
  const onSubmit = (data: FormValues) => {
    setFormData(data);
    setStep("confirm");
  };
  
  if (step === "confirm" && formData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Confirm Trade Offer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Your Item</h3>
              <div className="bg-muted p-3 rounded-md">
                {formData.offerItemImage && (
                  <div className="mb-2">
                    <img 
                      src={formData.offerItemImage} 
                      alt={formData.offerItemName}
                      className="w-full h-24 object-cover rounded-md mb-2"
                    />
                  </div>
                )}
                <p className="font-medium">{formData.offerItemName}</p>
                <p className="text-sm text-muted-foreground">{formData.offerItemDescription}</p>
                <p className="text-sm font-medium text-primary mt-1">
                  {(formData.offerValue / 1000).toFixed(3)} ₫
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Product You Want</h3>
              <div className="bg-muted p-3 rounded-md">
                <p className="font-medium">{productTitle}</p>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>📝 Note: A 10% platform fee will be applied to the trade.</p>
            <p>💰 You and the seller must both confirm the trade to complete it.</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setStep("form")}>Go Back</Button>
          <DirectTradeButton
            productId={productId}
            sellerId={sellerId}
            offerValue={formData.offerValue}
            offerItemName={formData.offerItemName}
            offerItemDescription={formData.offerItemDescription}
            offerItemImage={formData.offerItemImage}
            onSuccess={() => {
              form.reset();
              setStep("form");
              setFormData(null);
              setUploadedImage(null);
              if (onSuccess) onSuccess();
            }}
          />
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Make Trade Offer</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="offerItemName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="TV, Phone, Laptop, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="offerItemDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your item's condition, features, etc."
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="offerValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Value (VND)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={1000}
                      step={1000}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="offerItemImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Image</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {!uploadedImage ? (
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-md p-4 hover:border-primary/50 cursor-pointer transition-colors">
                          <input 
                            type="file" 
                            id="image-upload" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageUpload}
                            disabled={isUploading}
                          />
                          <label 
                            htmlFor="image-upload" 
                            className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
                          >
                            {isUploading ? (
                              <div className="flex flex-col items-center justify-center py-4">
                                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                                <p className="text-sm text-muted-foreground">Uploading image...</p>
                              </div>
                            ) : (
                              <>
                                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Click to upload an image of your item</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">PNG, JPG or WEBP up to 5MB</p>
                              </>
                            )}
                          </label>
                        </div>
                      ) : (
                        <div className="relative aspect-video w-full border rounded-md overflow-hidden">
                          <img 
                            src={uploadedImage} 
                            alt="Item preview" 
                            className="object-cover w-full h-full"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute top-2 right-2 bg-black/60 p-1 rounded-full text-white hover:bg-black/80 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Adding an image helps the seller better understand your item.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full">
              Review Offer
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}