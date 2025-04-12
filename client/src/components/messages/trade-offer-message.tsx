import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Message, User } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/theme";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface TradeOfferMessageProps {
  message: Message;
  currentUser: User | null;
  otherUser: User | null;
  onAcceptTrade?: () => void;
}

export default function TradeOfferMessage({ 
  message, 
  currentUser, 
  otherUser,
  onAcceptTrade
}: TradeOfferMessageProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Parse the trade details from the JSON string
  let tradeDetails = null;
  try {
    tradeDetails = message.tradeDetails ? JSON.parse(message.tradeDetails) : null;
  } catch (error) {
    console.error("Failed to parse trade details:", error);
  }
  
  // Check if the current user is the sender
  const isSentByCurrentUser = message.senderId === currentUser?.id;
  
  const handleAcceptTrade = () => {
    // Redirect to the accept-trade-handler page with messageId as a parameter
    window.location.href = `/accept-trade-handler?messageId=${message.id}`;
  };
  
  if (!tradeDetails) {
    return (
      <Card className="bg-secondary/10 mb-4 overflow-hidden">
        <CardContent className="p-4">
          <div className="text-center py-2">
            <p className="text-sm text-neutral-500">
              <Icon icon="ri-error-warning-line mr-1" />
              Trade details unavailable
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-secondary/10 mb-4 overflow-hidden">
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={isSentByCurrentUser ? currentUser?.avatar : otherUser?.avatar} />
              <AvatarFallback>
                {isSentByCurrentUser 
                  ? (currentUser?.username?.substring(0, 2).toUpperCase() || "U") 
                  : (otherUser?.username?.substring(0, 2).toUpperCase() || "U")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">
                Trade Offer from {isSentByCurrentUser ? "You" : otherUser?.username || "User"}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(message.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <Badge variant={message.tradeConfirmedBuyer && message.tradeConfirmedSeller ? "secondary" : "outline"}>
            {message.tradeConfirmedBuyer && message.tradeConfirmedSeller 
              ? "Accepted" 
              : "Pending"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-2">
        <div className={`space-y-3 ${isExpanded ? '' : 'max-h-[150px] overflow-hidden relative'}`}>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background p-3 rounded-md">
              <h4 className="font-medium text-sm mb-2">Offered Item</h4>
              <div className="flex gap-3">
                {tradeDetails.offerItemImages && tradeDetails.offerItemImages.length > 0 ? (
                  <img 
                    src={tradeDetails.offerItemImages[0]} 
                    alt={tradeDetails.offerItemName || "Trade item"}
                    className="w-16 h-16 object-cover rounded-md"
                  />
                ) : (
                  <div className="w-16 h-16 bg-neutral-200 rounded-md flex items-center justify-center">
                    <Icon icon="ri-image-line text-neutral-400 text-xl" />
                  </div>
                )}
                <div>
                  <h5 className="font-medium text-sm">{tradeDetails.offerItemName || "Unnamed item"}</h5>
                  <p className="text-sm text-neutral-600 line-clamp-1">
                    {tradeDetails.offerItemDescription || "No description"}
                  </p>
                  <p className="text-sm font-medium text-accent mt-1">
                    {Number(tradeDetails.offerItemValue || 0).toLocaleString('vi-VN')} ₫
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-background p-3 rounded-md">
              <h4 className="font-medium text-sm mb-2">Requested Item</h4>
              <div className="flex gap-3">
                {tradeDetails.productImage ? (
                  <img 
                    src={tradeDetails.productImage} 
                    alt={tradeDetails.productTitle || "Product"}
                    className="w-16 h-16 object-cover rounded-md"
                  />
                ) : (
                  <div className="w-16 h-16 bg-neutral-200 rounded-md flex items-center justify-center">
                    <Icon icon="ri-image-line text-neutral-400 text-xl" />
                  </div>
                )}
                <div>
                  <h5 className="font-medium text-sm">{tradeDetails.productTitle || "Product"}</h5>
                  <p className="text-sm text-accent mt-1">
                    ID: {tradeDetails.productId || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {isExpanded && (
            <>
              <Separator />
              
              <div>
                <h4 className="font-medium text-sm mb-2">Message</h4>
                <p className="text-sm whitespace-pre-line">{message.content}</p>
              </div>
            </>
          )}
          
          {!isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-secondary/10 to-transparent" />
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-3 pt-0 flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <Icon icon="ri-arrow-up-s-line mr-1" />
              Show Less
            </>
          ) : (
            <>
              <Icon icon="ri-arrow-down-s-line mr-1" />
              Show More
            </>
          )}
        </Button>
        
        <div className="flex gap-2">
          {!isSentByCurrentUser && !message.tradeConfirmedBuyer && !message.tradeConfirmedSeller && (
            <a href={`/trade-accept/${message.id}`} className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
              <Icon icon="ri-check-line mr-1" />
              Accept Trade
            </a>
          )}
          
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a href={`/trade-offers`}>
              <Icon icon="ri-exchange-line mr-1" />
              View Details
            </a>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}