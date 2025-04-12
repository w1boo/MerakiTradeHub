import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      offerItemName: "",
      offerItemDescription: "",
      offerValue: 10000,
      offerItemImage: "",
    },
  });
  
  // File input reference
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle drag events
  const [isDragging, setIsDragging] = useState(false);
  
  // Handle drag and drop events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };
  
  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };
  
  // Compress image before processing
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas
          const canvas = document.createElement('canvas');
          
          // Calculate new dimensions (max width/height 1200px)
          let width = img.width;
          let height = img.height;
          const maxDimension = 1200;
          
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          
          // Resize image
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to data URL with reduced quality
          const quality = 0.7; // 70% quality
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          
          resolve(dataUrl);
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        
        if (event.target && event.target.result) {
          img.src = event.target.result as string;
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  };
  
  // Process the files
  const handleFiles = (files: FileList) => {
    setIsUploading(true);
    
    Array.from(files).forEach(file => {
      // Only process image files
      if (!file.type.match('image.*')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image file.`,
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
      
      // Compress and process the image
      compressImage(file)
        .then(dataUrl => {
          if (!selectedImages.includes(dataUrl)) {
            // Only keep one image for trade offers
            const newImages = [dataUrl];
            setSelectedImages(newImages);
            
            // Set the image URL in the form
            form.setValue('offerItemImage', dataUrl);
          }
          setIsUploading(false);
        })
        .catch(error => {
          toast({
            title: "Image processing failed",
            description: error.message,
            variant: "destructive",
          });
          setIsUploading(false);
        });
    });
  };
  
  const removeImage = () => {
    setSelectedImages([]);
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
              setSelectedImages([]);
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
                      {selectedImages.length === 0 ? (
                        <div
                          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-md p-8 transition-colors ${
                            isDragging
                              ? "border-primary bg-primary/5"
                              : "border-muted-foreground/25 hover:border-primary/50"
                          }`}
                          onDragEnter={handleDragEnter}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                        >
                          <input
                            type="file"
                            id="image-upload"
                            ref={fileInputRef}
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileInputChange}
                            disabled={isUploading}
                          />
                          <label
                            htmlFor="image-upload"
                            className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
                          >
                            {isUploading ? (
                              <div className="flex flex-col items-center justify-center py-4">
                                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                                <p className="text-sm text-muted-foreground">Processing image...</p>
                              </div>
                            ) : (
                              <>
                                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                                <p className="text-sm text-center font-medium">
                                  Drag & drop or click to upload
                                </p>
                                <p className="text-xs text-center text-muted-foreground mt-1">
                                  JPG, PNG or WEBP (max. 5MB)
                                </p>
                              </>
                            )}
                          </label>
                        </div>
                      ) : (
                        <div className="relative aspect-video w-full border rounded-md overflow-hidden">
                          <img 
                            src={selectedImages[0]} 
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