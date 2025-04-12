import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Product, ProductCategory } from "@/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import { Icon } from "@/components/ui/theme";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload } from "lucide-react";

// Form schema definition with zod
const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.coerce.number().optional(),
  tradeValue: z.coerce.number().optional(),
  images: z.array(z.string()).min(1, "At least one image is required"),
  categoryId: z.coerce.number().optional(),
  location: z.string().optional(),
  allowBuy: z.boolean().default(true),
  allowTrade: z.boolean().default(true),
  status: z.string().default("active")
}).refine(data => data.allowBuy || data.allowTrade, {
  message: "Product must be available for either buying or trading",
  path: ["allowBuy"]
}).refine(data => !data.allowBuy || (data.price !== undefined && data.price > 0), {
  message: "Price is required when product is available for buying",
  path: ["price"]
}).refine(data => !data.allowTrade || (data.tradeValue !== undefined && data.tradeValue > 0), {
  message: "Trade value is required when product is available for trading",
  path: ["tradeValue"]
});

type FormValues = z.infer<typeof formSchema>;

export default function ListingFormPage() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const isEditing = !!params.id;
  
  // Fetch categories
  const { data: categories } = useQuery<ProductCategory[]>({
    queryKey: ["/api/categories"],
    enabled: !!user,
  });
  
  // Fetch product details if editing
  const { data: productData, isLoading: isLoadingProduct } = useQuery<Product>({
    queryKey: [`/api/products/${params.id}`],
    enabled: isEditing,
  });
  
  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      price: undefined,
      tradeValue: undefined,
      images: [],
      categoryId: undefined,
      location: "",
      allowBuy: true,
      allowTrade: true,
      status: "active"
    }
  });
  
  // Update form with product data when editing
  useEffect(() => {
    if (isEditing && productData && !form.formState.isDirty) {
      const formValues = {
        title: productData.title,
        description: productData.description,
        price: productData.price,
        tradeValue: productData.tradeValue,
        images: productData.images || [],
        categoryId: productData.categoryId,
        location: productData.location,
        allowBuy: productData.allowBuy,
        allowTrade: productData.allowTrade,
        status: productData.status
      };
      
      form.reset(formValues);
      setSelectedImages(productData.images || []);
    }
  }, [productData, isEditing, form]);
  
  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/products", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Product created",
        description: "Your listing has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      navigate("/profile?tab=listings");
    },
    onError: (error) => {
      toast({
        title: "Creation failed",
        description: error.message || "Failed to create your listing. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (data: FormValues & { id: number }) => {
      const { id, ...productData } = data;
      const res = await apiRequest("PUT", `/api/products/${id}`, productData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Product updated",
        description: "Your listing has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      navigate("/profile?tab=listings");
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update your listing. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const onSubmit = (data: FormValues) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please login to create a listing.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    
    // Add images to form data
    data.images = selectedImages;
    
    if (isEditing && productData) {
      updateProductMutation.mutate({ ...data, id: productData.id });
    } else {
      createProductMutation.mutate(data);
    }
  };
  

  
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
    Array.from(files).forEach(file => {
      // Only process image files
      if (!file.type.match('image.*')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image file.`,
          variant: "destructive",
        });
        return;
      }
      
      // Compress and process the image
      compressImage(file)
        .then(dataUrl => {
          if (!selectedImages.includes(dataUrl)) {
            // Update both the local state and the form state
            const newImages = [...selectedImages, dataUrl];
            setSelectedImages(newImages);
            
            // Set the images value in the form
            form.setValue('images', newImages);
          }
        })
        .catch(error => {
          toast({
            title: "Image processing failed",
            description: error.message,
            variant: "destructive",
          });
        });
    });
  };
  
  // Remove an image
  const handleRemoveImage = (imageUrl: string) => {
    const newImages = selectedImages.filter(img => img !== imageUrl);
    setSelectedImages(newImages);
    // Update the form state
    form.setValue('images', newImages);
  };
  
  if (!user) {
    navigate("/auth");
    return null;
  }
  
  if (isEditing && isLoadingProduct) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow pb-24 md:pb-0">
          <div className="container mx-auto px-4 py-6">
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading product details...</span>
            </div>
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }
  
  // If editing, check if the product belongs to the current user
  if (isEditing && productData && productData.sellerId !== user.id && !user.isAdmin) {
    navigate("/profile?tab=listings");
    return null;
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow pb-24 md:pb-0">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">
              {isEditing ? "Edit Listing" : "Create New Listing"}
            </h1>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>
                      Provide details about what you're listing
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Vintage Camera in Great Condition" {...field} />
                          </FormControl>
                          <FormDescription>
                            A clear, descriptive title helps buyers find your item
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your item in detail. Include condition, features, etc."
                              className="min-h-32"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Be detailed about condition, dimensions, history, and any flaws
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value, 10))}
                            defaultValue={field.value?.toString()}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories?.map((category) => (
                                <SelectItem 
                                  key={category.id} 
                                  value={category.id.toString()}
                                >
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Categorizing your item helps buyers find it
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. New York, NY" {...field} />
                          </FormControl>
                          <FormDescription>
                            City or region where the item is located
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Listing Options</CardTitle>
                    <CardDescription>
                      Set pricing and trade options
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <FormField
                        control={form.control}
                        name="allowBuy"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between space-x-3 space-y-0 rounded-md border p-4 w-full">
                            <div className="space-y-1">
                              <FormLabel className="text-base">Available for Purchase</FormLabel>
                              <FormDescription>
                                Allow buyers to purchase this item directly
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="allowTrade"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between space-x-3 space-y-0 rounded-md border p-4 w-full">
                            <div className="space-y-1">
                              <FormLabel className="text-base">Available for Trade</FormLabel>
                              <FormDescription>
                                Allow users to offer trades for this item
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-6">
                      {form.watch("allowBuy") && (
                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem className="w-full">
                              <FormLabel>Price ($)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  step="0.01" 
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.value ? parseFloat(e.target.value) : undefined;
                                    field.onChange(value);
                                  }}
                                />
                              </FormControl>
                              <FormDescription>
                                Set the purchase price in USD
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {form.watch("allowTrade") && (
                        <FormField
                          control={form.control}
                          name="tradeValue"
                          render={({ field }) => (
                            <FormItem className="w-full">
                              <FormLabel>Trade Value ($)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  step="0.01" 
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.value ? parseFloat(e.target.value) : undefined;
                                    field.onChange(value);
                                  }}
                                />
                              </FormControl>
                              <FormDescription>
                                Estimated value for trade purposes
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Product Images</CardTitle>
                    <CardDescription>
                      Add photos of your item (at least one required)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="images"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel>Selected Images ({selectedImages.length})</FormLabel>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                              {selectedImages.map((img, idx) => (
                                <div key={idx} className="relative group">
                                  <img 
                                    src={img} 
                                    alt={`Selected ${idx + 1}`} 
                                    className="w-full h-32 object-cover rounded-md border"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(img)}
                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Icon icon="ri-delete-bin-line" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </div>
                          
                          <div 
                            className={`border-2 border-dashed rounded-lg p-6 transition-all ${
                              isDragging 
                                ? 'border-primary bg-primary/5' 
                                : 'border-gray-300 hover:border-primary/50'
                            }`}
                            onDragEnter={handleDragEnter}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <div className="flex flex-col items-center justify-center gap-2 text-center cursor-pointer">
                              <Upload className="h-10 w-10 text-gray-400" />
                              <p className="text-lg font-medium">
                                Drag & drop images here or click to browse
                              </p>
                              <p className="text-sm text-gray-500">
                                Supports JPG, PNG and GIF files
                              </p>
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleFileInputChange}
                              />
                            </div>
                          </div>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
                
                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate("/profile?tab=listings")}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  >
                    {(createProductMutation.isPending || updateProductMutation.isPending) ? (
                      <>
                        <Icon icon="ri-loader-4-line animate-spin mr-2" />
                        {isEditing ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      isEditing ? "Update Listing" : "Create Listing"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}
