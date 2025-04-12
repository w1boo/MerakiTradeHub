import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";

export default function DirectTradeAcceptPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  
  const [productId, setProductId] = useState<string>("");
  const [productDetails, setProductDetails] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>("");
  
  // Parse URL parameters for product ID
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const idFromUrl = searchParams.get('productId');
    
    if (idFromUrl && !isNaN(Number(idFromUrl))) {
      setProductId(idFromUrl);
      
      // Fetch product details to display
      fetch(`/api/products/${idFromUrl}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setProductDetails(data);
          }
        })
        .catch(err => console.error("Error fetching product details:", err));
    }
  }, [location]);
  
  const handleDirectAccept = async () => {
    if (!productId || isNaN(Number(productId))) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid product ID",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setStatus('loading');
      setStatusMessage('Processing trade acceptance...');
      
      // Completely rewritten trade acceptance logic without message dependencies
      // This version manually creates a transaction directly
      
      // First, fetch the product to ensure it exists
      const productResponse = await fetch(`/api/products/${productId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!productResponse.ok) {
        const productData = await productResponse.json();
        throw new Error(productData.error || 'Product not found');
      }
      
      const product = await productResponse.json();
      
      // Create transaction directly
      const response = await fetch(`/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: Number(productId),
          amount: product.tradeValue || 0,
          type: 'trade',
          status: 'completed',
          shipping: 0,
          timeline: [
            {
              status: 'completed',
              timestamp: new Date(),
              description: 'Trade completed directly'
            }
          ]
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept trade');
      }
      
      // Mark product as sold
      await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'sold'
        })
      });
      
      setStatus('success');
      setStatusMessage('Trade accepted successfully for product: ' + product.title);
      
      toast({
        title: 'Trade Accepted',
        description: 'Trade was accepted successfully for: ' + product.title,
      });
      
    } catch (error) {
      console.error('Error accepting trade:', error);
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'An unknown error occurred');
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to accept trade',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow pb-24 md:pb-0">
        <div className="container max-w-lg mx-auto py-8">
          <Card className="shadow-lg">
            <CardHeader className="bg-background border-b">
              <CardTitle className="text-2xl font-bold">Direct Trade Acceptance</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="productId">Enter Product ID</Label>
                <Input
                  id="productId"
                  placeholder="Enter the product ID (e.g., 1)"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full"
                />
              </div>
              
              {/* Product details card */}
              {productDetails && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    {productDetails.images?.[0] && (
                      <div className="w-full sm:w-1/3">
                        <img 
                          src={productDetails.images[0]} 
                          alt={productDetails.title} 
                          className="w-full h-40 sm:h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4 flex-1 bg-muted/10">
                      <h3 className="text-lg font-medium mb-1">{productDetails.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200 font-mono text-xs">
                          ID: {productDetails.id}
                        </span>
                        {productDetails.tradeValue && (
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 font-mono text-xs">
                            Trade Value: {productDetails.tradeValue.toLocaleString('vi-VN')} ₫
                          </span>
                        )}
                      </div>
                      <p className="text-sm line-clamp-2">{productDetails.description}</p>
                      <p className="text-sm mt-2 text-muted-foreground">
                        {productDetails.allowTrade ? 
                          "This product is available for trade" : 
                          "This product is not available for trade"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
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

              <div className="space-y-4 bg-muted/30 p-4 rounded-lg text-sm">
                <p className="font-medium">How to use this page:</p>
                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                  <li>Enter the ID of the product you want to trade</li>
                  <li>Click "Accept Trade" to process the trade directly</li>
                  <li>This bypasses the normal message-based trade acceptance flow</li>
                </ol>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
              <Button 
                className="w-full"
                onClick={handleDirectAccept}
                disabled={status === 'loading'}
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Accept Trade'
                )}
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <a href="/messages">Back to Messages</a>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}