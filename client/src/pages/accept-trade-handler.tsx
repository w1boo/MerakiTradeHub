import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function AcceptTradeHandler() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState("Processing trade offer...");
  
  useEffect(() => {
    const processTradeAcceptance = async () => {
      try {
        // Get message ID from URL query param
        const params = new URLSearchParams(window.location.search);
        const messageId = params.get('messageId');
        
        if (!messageId) {
          setStatus('error');
          setMessage("Missing message ID. Cannot process trade.");
          return;
        }
        
        console.log("Processing trade acceptance for message ID:", messageId);
        
        // Call the API to accept the trade
        const response = await fetch('/api/trade/simple-accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messageId: parseInt(messageId) }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to process trade");
        }
        
        // Update state based on response
        setStatus('success');
        setMessage(data.message);
        
        // Show a toast notification
        toast({
          title: "Trade Accepted",
          description: data.message,
        });
        
        // If trade is done (seller accepted), redirect to transactions after a delay
        if (data.tradeDone) {
          setTimeout(() => {
            navigate('/transactions');
          }, 3000);
        } else {
          // Otherwise redirect to messages after a delay
          setTimeout(() => {
            navigate('/messages');
          }, 3000);
        }
        
      } catch (error) {
        console.error("Error accepting trade:", error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : "An unknown error occurred");
        
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to process trade",
          variant: "destructive",
        });
      }
    };
    
    if (user) {
      processTradeAcceptance();
    }
  }, [user, navigate, toast]);
  
  return (
    <div className="container flex items-center justify-center min-h-screen py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Trade Acceptance</CardTitle>
          <CardDescription>
            {status === 'loading' 
              ? 'Processing your trade acceptance...' 
              : status === 'success' 
                ? 'Trade processed successfully' 
                : 'There was a problem with your trade'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 pt-4">
          {status === 'loading' && (
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          )}
          
          {status === 'success' && (
            <CheckCircle className="h-10 w-10 text-green-500" />
          )}
          
          {status === 'error' && (
            <AlertCircle className="h-10 w-10 text-destructive" />
          )}
          
          <p className="text-center text-muted-foreground">{message}</p>
          
          <div className="flex gap-2 mt-4">
            {status !== 'loading' && (
              <Button onClick={() => navigate('/messages')}>
                Go to Messages
              </Button>
            )}
            
            {status === 'success' && (
              <Button variant="outline" onClick={() => navigate('/transactions')}>
                View Transactions
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}