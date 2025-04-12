import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Message, Conversation, User, Product } from "@/types";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import { Icon } from "@/components/ui/theme";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { useLocation } from "wouter";

export default function TradeOffersPage() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");

  // Fetch the user's conversations
  const { data: conversationsData, isLoading } = useQuery<any[]>({
    queryKey: ["/api/conversations"],
    enabled: !!user,
  });

  // Extract trade messages from conversations
  const tradeMessages = conversationsData?.flatMap((conversation) => {
    // Check if conversation has messages property
    if (!conversation.messages || !Array.isArray(conversation.messages)) {
      console.log('No messages array found in conversation:', conversation.id);
      return [];
    }

    // Filter for trade messages
    return conversation.messages.filter(
      (msg: Message) => msg.isTrade === true
    );
  }) || [];
  
  console.log('Trade messages found:', tradeMessages.length);

  // Filter messages by sent vs received
  const receivedTradeOffers = tradeMessages.filter(
    (msg: Message) => msg.receiverId === user?.id
  );
  
  const sentTradeOffers = tradeMessages.filter(
    (msg: Message) => msg.senderId === user?.id
  );

  const getTradeDetailsList = (tab: "received" | "sent") => {
    const messages = tab === "received" ? receivedTradeOffers : sentTradeOffers;

    return messages.map((message: Message) => {
      // Parse trade details
      let tradeDetails;
      try {
        tradeDetails = message.tradeDetails ? JSON.parse(message.tradeDetails) : null;
      } catch (e) {
        console.error("Failed to parse trade details:", e);
        tradeDetails = null;
      }

      const isSentByUser = message.senderId === user?.id;
      const otherUserId = isSentByUser ? message.receiverId : message.senderId;
      
      // Find the conversation containing this message
      const conversation = conversationsData?.find(
        (conv) => 
          (conv.user1Id === user?.id && conv.user2Id === otherUserId) ||
          (conv.user1Id === otherUserId && conv.user2Id === user?.id)
      );
      
      const otherUser = conversation?.otherUser;

      return (
        <Card key={message.id} className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={otherUser?.avatar} />
                  <AvatarFallback>
                    {otherUser?.username?.substring(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-base">
                    {isSentByUser ? `To: ${otherUser?.username || "User"}` : `From: ${otherUser?.username || "User"}`}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {format(new Date(message.createdAt), "MMM d, yyyy - h:mm a")}
                  </p>
                </div>
              </div>
              <Badge variant={message.tradeConfirmedBuyer && message.tradeConfirmedSeller ? "secondary" : "default"}>
                {message.tradeConfirmedBuyer && message.tradeConfirmedSeller 
                  ? "Accepted" 
                  : "Pending"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {tradeDetails ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-neutral-50 p-3 rounded-md">
                    <h4 className="font-medium text-sm mb-2">Offered Item</h4>
                    <div className="flex gap-3">
                      {tradeDetails.offerItemImages && tradeDetails.offerItemImages.length > 0 ? (
                        <img 
                          src={tradeDetails.offerItemImages[0]} 
                          alt={tradeDetails.offerItemName}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-neutral-200 rounded-md flex items-center justify-center">
                          <Icon icon="ri-image-line text-neutral-400 text-xl" />
                        </div>
                      )}
                      <div>
                        <h5 className="font-medium text-sm">{tradeDetails.offerItemName}</h5>
                        <p className="text-sm text-neutral-600 line-clamp-1">{tradeDetails.offerItemDescription}</p>
                        <p className="text-sm font-medium text-accent mt-1">
                          {Number(tradeDetails.offerItemValue).toLocaleString('vi-VN')} ₫
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-neutral-50 p-3 rounded-md">
                    <h4 className="font-medium text-sm mb-2">Requested Item</h4>
                    <div className="flex gap-3">
                      {tradeDetails.productImage ? (
                        <img 
                          src={tradeDetails.productImage} 
                          alt={tradeDetails.productTitle}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-neutral-200 rounded-md flex items-center justify-center">
                          <Icon icon="ri-image-line text-neutral-400 text-xl" />
                        </div>
                      )}
                      <div>
                        <h5 className="font-medium text-sm">{tradeDetails.productTitle}</h5>
                        <p className="text-sm text-accent mt-1">
                          ID: {tradeDetails.productId}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium text-sm mb-2">Message</h4>
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="mr-2"
                    onClick={() => {
                      if (conversation) {
                        navigate(`/messages/${conversation.id}`);
                      } else {
                        toast({
                          title: "Error",
                          description: "Could not find conversation",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Icon icon="ri-message-3-line mr-1" />
                    View Conversation
                  </Button>
                  
                  {isSentByUser ? (
                    <Button variant="default" size="sm">
                      <Icon icon="ri-eye-line mr-1" />
                      View Status
                    </Button>
                  ) : (
                    <Button 
                      variant="default" 
                      size="sm"
                      disabled={message.tradeConfirmedBuyer && message.tradeConfirmedSeller}
                    >
                      <Icon icon="ri-check-line mr-1" />
                      Accept Trade
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-neutral-500">
                <p>Trade details unavailable</p>
              </div>
            )}
          </CardContent>
        </Card>
      );
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow p-4 md:p-6 pb-24 md:pb-6">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Trade Offers</h1>
          </div>
          
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "received" | "sent")}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="received">
                <Icon icon="ri-arrow-down-line mr-2" />
                Received
                {receivedTradeOffers.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{receivedTradeOffers.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent">
                <Icon icon="ri-arrow-up-line mr-2" />
                Sent
                {sentTradeOffers.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{sentTradeOffers.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="received" className="mt-0">
              <ScrollArea className="h-[calc(100vh-240px)]">
                {receivedTradeOffers.length > 0 ? (
                  getTradeDetailsList("received")
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 mb-4">
                      <Icon icon="ri-inbox-line text-2xl text-neutral-500" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No Trade Offers Received</h3>
                    <p className="text-neutral-500 max-w-md mx-auto">
                      You don't have any incoming trade offers yet. When someone offers to trade with you, it will appear here.
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="sent" className="mt-0">
              <ScrollArea className="h-[calc(100vh-240px)]">
                {sentTradeOffers.length > 0 ? (
                  getTradeDetailsList("sent")
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 mb-4">
                      <Icon icon="ri-send-plane-line text-2xl text-neutral-500" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No Trade Offers Sent</h3>
                    <p className="text-neutral-500 max-w-md mx-auto">
                      You haven't sent any trade offers yet. Browse products and use the "Offer Trade" button to propose an exchange.
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}