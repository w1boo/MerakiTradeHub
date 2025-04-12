import { useParams } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TradeAcceptButtonPage() {
  const { messageId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Processing trade...');
  
  const handleAcceptTrade = async () => {
    try {
      setStatus('loading');
      setMessage('Processing trade acceptance...');
      
      // Super simple direct fetch call
      const response = await fetch(`/api/trade-offers/${messageId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept trade');
      }
      
      setStatus('success');
      setMessage(data.message || 'Trade accepted successfully');
      
      toast({
        title: 'Trade Accepted',
        description: data.message || 'Trade was accepted successfully',
      });
      
    } catch (error) {
      console.error('Error accepting trade:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'An unknown error occurred');
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to accept trade',
        variant: 'destructive',
      });
    }
  };
  
  // Pre-populated debug message for the API request
  const apiUrl = `/api/trade-offers/${messageId}/accept`;
  
  return (
    <div className="container max-w-2xl mx-auto py-8">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Trade Acceptance</h1>
        
        <div className="p-4 border rounded-lg bg-card">
          <h2 className="text-lg font-medium mb-2">Message ID: {messageId}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Click the button below to accept this trade offer
          </p>
          
          {status === 'loading' && (
            <Alert className="mb-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <AlertTitle>Processing</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          
          {status === 'success' && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              <AlertTitle className="text-green-700">Success</AlertTitle>
              <AlertDescription className="text-green-600">{message}</AlertDescription>
            </Alert>
          )}
          
          {status === 'error' && (
            <Alert className="mb-4" variant="destructive">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-4">
            <Button 
              onClick={handleAcceptTrade}
              disabled={status === 'loading' || status === 'success'}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Accept Trade Offer'
              )}
            </Button>
            
            <Button variant="outline" asChild>
              <a href="/messages">Back to Messages</a>
            </Button>
          </div>
        </div>
        
        <div className="border rounded-lg p-4 bg-muted/30">
          <h3 className="text-sm font-medium mb-2">Debug Information</h3>
          <p className="text-xs text-muted-foreground mb-2">API Endpoint: <code>{apiUrl}</code></p>
          <p className="text-xs text-muted-foreground">User ID: {user?.id || 'Not logged in'}</p>
        </div>
      </div>
    </div>
  );
}