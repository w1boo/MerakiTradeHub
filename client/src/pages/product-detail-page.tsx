import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Product, User, ProductCategory } from "@/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import { Icon, productTypeBadges } from "@/components/ui/theme";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AddFundsModal } from "@/components/transactions/add-funds-modal";
import TradeOfferModal from "@/components/transactions/trade-offer-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isBuyModalOpen, setBuyModalOpen] = useState(false);
  const [isTradeModalOpen, setTradeModalOpen] = useState(false);
  const [isAddFundsModalOpen, setAddFundsModalOpen] = useState(false);
  
  // Extract query param for action (trade)
  const searchParams = new URLSearchParams(window.location.search);
  const action = searchParams.get('action');
  
  // Fetch product details
  const {
    data: product,
    isLoading,
    error,
  } = useQuery<Product>({
    queryKey: [`/api/products/${params.id}`],
    enabled: !!params.id,
  });
  
  // Fetch seller data
  const { data: seller } = useQuery<User>({
    queryKey: [`/api/users/${product?.sellerId}`],
    enabled: !!product?.sellerId,
  });
  
  // Fetch categories for display
  const { data: categories } = useQuery<ProductCategory[]>({
    queryKey: ["/api/categories"],
    enabled: !!product,
  });
  
  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: {
      productId: number;
      amount: number;
      type: 'purchase' | 'trade';
      tradeDetails?: any;
    }) => {
      const res = await apiRequest("POST", "/api/transactions", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Transaction initiated",
        description: "Your transaction has been started and is now in escrow.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      
      // Close modals and redirect to transaction detail
      setBuyModalOpen(false);
      setTradeModalOpen(false);
      navigate(`/transactions`);
    },
    onError: (error) => {
      toast({
        title: "Transaction failed",
        description: error.message || "Could not complete the transaction. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Initialize messages with a seller
  const [isMessagingLoading, setIsMessagingLoading] = useState(false);
  
  const startConversation = async () => {
    if (!user || !product) return;
    
    // Set loading state
    setIsMessagingLoading(true);
    
    try {
      const res = await apiRequest("POST", "/api/messages", {
        receiverId: product.sellerId,
        content: `Hi, I'm interested in your item: ${product.title}`
      });
      
      // Check if response is ok
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to send message");
      }
      
      const data = await res.json();
      toast({
        title: "Message sent",
        description: "You can now continue the conversation in your messages.",
      });
      
      // Redirect to messaging page
      navigate("/messages");
    } catch (error: any) {
      toast({
        title: "Could not send message",
        description: error.message || "Failed to start conversation. Please try again.",
        variant: "destructive",
      });
      console.error("Message error:", error);
    } finally {
      // Reset loading state
      setIsMessagingLoading(false);
    }
  };
  
  // Handle buy now
  const handleBuyNow = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (!product) return;
    
    // Check if this is user's own product
    if (user.id === product.sellerId) {
      toast({
        title: "Cannot buy your own product",
        description: "You cannot purchase your own listing.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if user has enough balance
    if (!product.price || user.balance < product.price) {
      toast({
        title: "Insufficient balance",
        description: "Please add funds to your account first.",
        variant: "destructive",
      });
      setAddFundsModalOpen(true);
      return;
    }
    
    setBuyModalOpen(true);
  };
  
  // Handle trade offer - opens the trade offer modal
  const handleTradeOffer = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (!product) return;
    
    // Check if this is user's own product
    if (user.id === product.sellerId) {
      toast({
        title: "Cannot trade with yourself",
        description: "You cannot trade with your own listing.",
        variant: "destructive",
      });
      return;
    }
    
    // Open the trade offer modal
    setTradeModalOpen(true);
  };
  
  // Confirm purchase
  const confirmPurchase = () => {
    if (!product || !product.price) return;
    
    createTransactionMutation.mutate({
      productId: product.id,
      amount: product.price,
      type: 'purchase'
    });
  };
  
  // Confirm trade
  const confirmTrade = (tradeValue: number) => {
    if (!product) return;
    
    // Check if user has enough balance for escrow
    if (user && user.balance < tradeValue) {
      toast({
        title: "Insufficient balance for escrow",
        description: "Please add funds to cover the trade escrow amount.",
        variant: "destructive",
      });
      setTradeModalOpen(false);
      setAddFundsModalOpen(true);
      return;
    }
    
    createTransactionMutation.mutate({
      productId: product.id,
      amount: tradeValue,
      type: 'trade',
      tradeDetails: {
        offeredItems: [],
        tradeValue
      }
    });
  };
  
  // Handle trade form submission
  const handleTradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const tradeValue = parseFloat(form.tradeValue.value);
    
    if (isNaN(tradeValue) || tradeValue <= 0) {
      toast({
        title: "Invalid trade value",
        description: "Please enter a valid amount greater than zero.",
        variant: "destructive",
      });
      return;
    }
    
    confirmTrade(tradeValue);
  };
  
  // Determine product type badge
  const getProductTypeBadge = () => {
    if (!product) return null;
    
    let badgeText = "";
    let badgeClass = "";
    
    if (product.allowBuy && product.allowTrade) {
      badgeText = "Trade or Buy";
      badgeClass = productTypeBadges.tradeOrBuy;
    } else if (product.allowTrade) {
      badgeText = "Trade Only";
      badgeClass = productTypeBadges.tradeOnly;
    } else {
      badgeText = "Buy Only";
      badgeClass = productTypeBadges.buyOnly;
    }
    
    return (
      <div className={`${badgeClass} inline-block`}>
        {badgeText}
      </div>
    );
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };
  
  // Automatically open trade modal if action=trade is in URL
  useState(() => {
    if (action === 'trade' && product && user && user.id !== product.sellerId) {
      setTradeModalOpen(true);
    }
  });
  
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow pb-24 md:pb-0">
          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Skeleton className="aspect-square rounded-lg" />
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-24 w-full" />
                <div className="flex space-x-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }
  
  if (error || !product) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow pb-24 md:pb-0">
          <div className="container mx-auto px-4 py-6">
            <div className="bg-red-50 text-red-500 p-8 rounded-lg text-center">
              <h2 className="text-2xl font-semibold mb-2">Product Not Found</h2>
              <p className="mb-4">The product you're looking for doesn't exist or has been removed.</p>
              <Button asChild>
                <Link href="/">Return to Home</Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow pb-24 md:pb-0">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Product Images */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <Carousel className="w-full">
                <CarouselContent>
                  {product.images.map((image, index) => (
                    <CarouselItem key={index}>
                      <div className="aspect-square relative rounded-lg overflow-hidden">
                        <img 
                          src={image} 
                          alt={`${product.title} - Image ${index + 1}`} 
                          className="object-cover w-full h-full"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel>
              
              {/* Thumbnail Navigation */}
              {product.images.length > 1 && (
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {product.images.map((image, index) => (
                    <div 
                      key={index}
                      className="aspect-square rounded-md overflow-hidden cursor-pointer border-2 border-transparent hover:border-primary"
                    >
                      <img 
                        src={image} 
                        alt={`Thumbnail ${index + 1}`} 
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Product Details */}
            <div>
              <div className="bg-white p-6 rounded-lg shadow-sm mb-4">
                <div className="mb-4">
                  {getProductTypeBadge()}
                </div>
                
                <h1 className="text-2xl md:text-3xl font-semibold mb-2">{product.title}</h1>
                
                <div className="flex items-center mb-4">
                  {product.price && (
                    <span className="text-2xl font-bold text-secondary mr-2">
                      {product.price.toLocaleString('vi-VN')} ₫
                    </span>
                  )}
                  {product.tradeValue && product.allowTrade && (
                    <span className="text-accent font-medium">
                      {product.price ? "or trade" : `Trade Value: ${product.tradeValue.toLocaleString('vi-VN')} ₫`}
                    </span>
                  )}
                </div>
                
                {product.location && (
                  <div className="flex items-center text-neutral-600 mb-4">
                    <Icon icon="ri-map-pin-line mr-1" />
                    <span>{product.location}</span>
                  </div>
                )}
                
                <Separator className="my-4" />
                
                <div className="mb-4">
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-neutral-600 whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
                
                <Separator className="my-4" />
                
                {/* Seller Information */}
                <div className="flex items-center mb-4">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={seller?.avatar} />
                    <AvatarFallback>{seller?.username?.substring(0, 2).toUpperCase() || "S"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{seller?.username || "Seller"}</p>
                    <p className="text-sm text-neutral-500">
                      Listed on {formatDate(product.createdAt)}
                    </p>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  {product.allowBuy && (
                    <Button 
                      className="flex-1" 
                      onClick={handleBuyNow}
                      disabled={user?.id === product.sellerId}
                    >
                      <Icon icon="ri-shopping-cart-line mr-2" />
                      Buy Now
                    </Button>
                  )}
                  
                  {product.allowTrade && (
                    <Button 
                      variant="outline" 
                      className="flex-1 border-primary text-primary" 
                      onClick={handleTradeOffer}
                      disabled={user?.id === product.sellerId}
                    >
                      <Icon icon="ri-exchange-line mr-2" />
                      Offer Trade
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={startConversation}
                    disabled={user?.id === product.sellerId || isMessagingLoading}
                  >
                    {isMessagingLoading ? (
                      <>
                        <Icon icon="ri-loader-4-line animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Icon icon="ri-message-3-line mr-2" />
                        Message Seller
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Additional Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="details">
                    <TabsList className="grid grid-cols-3 mb-4">
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="shipping">Shipping</TabsTrigger>
                      <TabsTrigger value="policies">Policies</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="details">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Category</span>
                          <span className="font-medium">
                            {product.categoryId ? (
                              <Link href={`/categories/${product.categoryId}`}>
                                {categories?.find(cat => cat.id === product.categoryId)?.name || "Category"}
                              </Link>
                            ) : (
                              "Uncategorized"
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Condition</span>
                          <span className="font-medium">Excellent</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Listed</span>
                          <span className="font-medium">{formatDate(product.createdAt)}</span>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="shipping">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Shipping Cost</span>
                          <span className="font-medium">50,000 ₫</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Shipping From</span>
                          <span className="font-medium">{product.location || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Delivery</span>
                          <span className="font-medium">3-5 business days</span>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="policies">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-1">Returns</h4>
                          <p className="text-sm text-neutral-600">This seller does not accept returns. All sales are final.</p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">Payment Protection</h4>
                          <p className="text-sm text-neutral-600">
                            Your payment is protected by our escrow system. Money is only released to the seller when you confirm receipt.
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
      <MobileNav />
      
      {/* Buy Now Modal */}
      <Dialog open={isBuyModalOpen} onOpenChange={setBuyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              You are about to purchase this item. The payment will be held in escrow until you confirm receipt.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <img 
                src={product.images[0]} 
                alt={product.title} 
                className="w-16 h-16 rounded-md object-cover"
              />
              <div>
                <h3 className="font-medium">{product.title}</h3>
                <p className="text-sm text-neutral-600">Seller: {seller?.username || "Seller"}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-600">Item Price</span>
                <span className="font-medium">{product.price?.toLocaleString('vi-VN')} ₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Platform Fee (15%)</span>
                <span className="font-medium">{(product.price ? product.price * 0.15 : 0).toLocaleString('vi-VN')} ₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Shipping</span>
                <span className="font-medium">50,000 ₫</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{(product.price ? product.price + 50000 : 0).toLocaleString('vi-VN')} ₫</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmPurchase}
              disabled={createTransactionMutation.isPending}
            >
              {createTransactionMutation.isPending ? (
                <>
                  <Icon icon="ri-loader-4-line animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                "Confirm Purchase"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Trade Offer Modal */}
      <Dialog open={isTradeModalOpen} onOpenChange={setTradeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make Trade Offer</DialogTitle>
            <DialogDescription>
              Offer a trade for this item. Your offer will be held in escrow until the trade is completed.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleTradeSubmit}>
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-4">
                <img 
                  src={product.images[0]} 
                  alt={product.title} 
                  className="w-16 h-16 rounded-md object-cover"
                />
                <div>
                  <h3 className="font-medium">{product.title}</h3>
                  <p className="text-sm text-neutral-600">
                    {product.tradeValue 
                      ? `Suggested Trade Value: ${product.tradeValue.toLocaleString('vi-VN')} ₫` 
                      : "No suggested trade value"}
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tradeValue">Your Trade Offer Value</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2">₫</span>
                    <Input 
                      id="tradeValue" 
                      name="tradeValue" 
                      type="number" 
                      min="1000" 
                      step="1000" 
                      className="pl-8" 
                      defaultValue={product.tradeValue?.toString() || ""}
                      required
                    />
                  </div>
                  <p className="text-sm text-neutral-500 mt-1">
                    This amount will be held in escrow as security for the trade.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="tradeMessage">Message to Seller</Label>
                  <textarea 
                    id="tradeMessage" 
                    name="tradeMessage" 
                    className="mt-1 w-full rounded-md border border-input p-2 text-sm"
                    rows={3}
                    placeholder="Describe what you'd like to trade for this item..."
                  ></textarea>
                </div>
              </div>
              
              <div className="p-3 bg-amber-50 rounded-lg text-amber-700 text-sm">
                <p className="flex items-start">
                  <Icon icon="ri-information-line text-lg mr-2" className="flex-shrink-0 mt-0.5" />
                  <span>
                    Your trade offer is backed by an escrow deposit. If the trade is completed successfully, 
                    90% of your deposit will be returned to your account. The remaining 10% is a platform fee.
                  </span>
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setTradeModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createTransactionMutation.isPending}
              >
                {createTransactionMutation.isPending ? (
                  <>
                    <Icon icon="ri-loader-4-line animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  "Submit Trade Offer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Add Funds Modal */}
      <AddFundsModal 
        isOpen={isAddFundsModalOpen} 
        onClose={() => setAddFundsModalOpen(false)} 
      />
    </div>
  );
}
