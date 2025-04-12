import { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";

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

// Placeholder image URLs (we would use a real image upload service in production)
const placeholderImages = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=500&ixid=MnwxfDB8MXxyYW5kb218MHx8c25lYWtlcnN8fHx8fHwxNjk3MjkzMzgz&ixlib=rb-4.0.3&q=80&w=500",
  "https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=500&ixid=MnwxfDB8MXxyYW5kb218MHx8Y2FtZXJhfHx8fHx8MTY5NzI5MzQwNw&ixlib=rb-4.0.3&q=80&w=500",
  "https://images.unsplash.com/photo-1586495777744-4413f21062fa?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=500&ixid=MnwxfDB8MXxyYW5kb218MHx8bGFwdG9wfHx8fHx8MTY5NzI5MzQzMA&ixlib=rb-4.0.3&q=80&w=500",
  "https://images.unsplash.com/photo-1503602642458-232111445657?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=500&ixid=MnwxfDB8MXxyYW5kb218MHx8ZnVybml0dXJlfHx8fHx8MTY5NzI5MzQ1NQ&ixlib=rb-4.0.3&q=80&w=500"
];

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
      form.reset({
        title: productData.title,
        description: productData.description,
        price: productData.price,
        tradeValue: productData.tradeValue,
        images: productData.images,
        categoryId: productData.categoryId,
        location: productData.location,
        allowBuy: productData.allowBuy,
        allowTrade: productData.allowTrade,
        status: productData.status
      });
      setSelectedImages(productData.images);
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
  
  // Handle image selection (would be replaced with actual image upload in production)
  const handleImageSelection = (imageUrl: string) => {
    if (selectedImages.includes(imageUrl)) {
      setSelectedImages(selectedImages.filter(img => img !== imageUrl));
    } else {
      setSelectedImages([...selectedImages, imageUrl]);
    }
  };
  
  // Add a custom URL as an image
  const handleAddCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).elements.namedItem('customUrl') as HTMLInputElement;
    const url = input.value.trim();
    
    if (url && !selectedImages.includes(url)) {
      setSelectedImages([...selectedImages, url]);
      input.value = '';
    } else if (selectedImages.includes(url)) {
      toast({
        title: "Duplicate image",
        description: "This image URL is already added to your listing.",
        variant: "destructive",
      });
    }
  };
  
  // Remove an image
  const handleRemoveImage = (imageUrl: string) => {
    setSelectedImages(selectedImages.filter(img => img !== imageUrl));
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
                            onValueChange={field.onChange}
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
                          
                          <Tabs defaultValue="sample">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="sample">Sample Images</TabsTrigger>
                              <TabsTrigger value="custom">Custom URL</TabsTrigger>
                            </TabsList>
                            <TabsContent value="sample" className="mt-4">
                              <p className="text-sm text-neutral-600 mb-4">
                                Select from sample images (for demo purposes):
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {placeholderImages.map((img, idx) => (
                                  <div 
                                    key={idx} 
                                    className={`relative cursor-pointer border-2 rounded-md overflow-hidden ${
                                      selectedImages.includes(img) ? 'border-primary' : 'border-transparent'
                                    }`}
                                    onClick={() => handleImageSelection(img)}
                                  >
                                    <img 
                                      src={img} 
                                      alt={`Sample ${idx + 1}`} 
                                      className="w-full h-32 object-cover"
                                    />
                                    {selectedImages.includes(img) && (
                                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                        <Icon icon="ri-check-line text-2xl text-primary" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </TabsContent>
                            <TabsContent value="custom" className="mt-4">
                              <form onSubmit={handleAddCustomUrl} className="flex gap-2">
                                <Input 
                                  name="customUrl"
                                  type="url" 
                                  placeholder="Enter image URL" 
                                  className="flex-grow"
                                />
                                <Button type="submit">Add</Button>
                              </form>
                              <p className="text-xs text-neutral-500 mt-2">
                                Enter a valid image URL to add to your listing
                              </p>
                            </TabsContent>
                          </Tabs>
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
