import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Conversation, Message, User, Product } from "@/types";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icon } from "@/components/ui/theme";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import TradeOfferMessage from "@/components/messages/trade-offer-message";
import { TradeMessageWrapper } from "@/components/trade/trade-message-wrapper";

interface ChatInterfaceProps {
  conversationId?: number;
}

export default function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [temporaryRecipient, setTemporaryRecipient] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set selected conversation from props if provided
  useEffect(() => {
    if (conversationId) {
      setSelectedConversation(conversationId);
    }
  }, [conversationId]);

  // Fetch conversations
  const { 
    data: conversations = [], 
    isLoading: isLoadingConversations,
    refetch: refetchConversations
  } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: !!user,
  });

  // Fetch messages for selected conversation
  const { 
    data: conversationData, 
    isLoading: isLoadingMessages,
    refetch: refetchMessages
  } = useQuery<{
    conversation: Conversation;
    messages: Message[];
    otherUser: User;
  }>({
    queryKey: ["/api/conversations", selectedConversation],
    enabled: !!selectedConversation && !!user,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 3,
    staleTime: 1000, // Keep data fresh for at least 1 second
    refetchInterval: 3000, // Poll every 3 seconds when the component is visible
  });
  
  // Fetch product data for trade messages
  const { data: productsData = {} } = useQuery<Record<number, Product>>({
    queryKey: ["/api/products/trade-messages"],
    enabled: !!conversationData?.messages?.some(m => {
      // Force TypeScript to recognize these properties exist
      const msg = m as { isTrade?: boolean; productId?: number | null };
      return msg.isTrade === true && typeof msg.productId === 'number' && msg.productId !== null;
    }),
  });

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (user && selectedConversation) {
        refetchMessages();
        refetchConversations();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [user, selectedConversation, refetchMessages, refetchConversations]);

  // Scroll to bottom when new messages are loaded
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationData?.messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; receiverId: number; isTrade?: boolean; productId?: number; images?: string[] }) => {
      console.log('Sending message with data:', JSON.stringify(data));
      
      const res = await apiRequest('POST', '/api/messages', data);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
      
      return await res.json();
    },
    onSuccess: (response) => {
      setMessage('');
      
      // If we created a new conversation with a temporary recipient,
      // we need to set the selected conversation to the newly created conversation
      if (temporaryRecipient !== null) {
        if (response.conversation) {
          // Set the selected conversation to the new conversation
          setSelectedConversation(response.conversation.id);
          // Clear the temporary recipient
          setTemporaryRecipient(null);
          
          toast({
            title: 'Conversation started',
            description: 'Your message has been sent',
          });
        }
      }
      
      // Immediately refetch data
      refetchMessages();
      refetchConversations();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error sending message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Send message handler
  const handleSendMessage = () => {
    if (!user || !message.trim()) return;
    
    // Case 1: Using temporary recipient (new conversation)
    if (temporaryRecipient !== null) {
      console.log('Starting new conversation with user:', temporaryRecipient);
      sendMessageMutation.mutate({
        content: message,
        receiverId: temporaryRecipient,
      });
      return;
    }
    
    // Case 2: Existing conversation but no data yet
    if (!conversationData) {
      console.error('Conversation data is not available');
      toast({
        title: 'Error sending message',
        description: 'Conversation data is loading. Please try again in a moment.',
        variant: 'destructive',
      });
      return;
    }
    
    // Case 3: Existing conversation but missing otherUser
    if (!conversationData.otherUser || typeof conversationData.otherUser.id === 'undefined') {
      console.error('Other user data is missing in conversation:', JSON.stringify(conversationData));
      
      // Get the receiver from conversation object as a fallback
      let receiverId: number | null = null;
      
      if (conversationData.conversation) {
        const userId = user.id;
        // Determine the other user in the conversation
        if (conversationData.conversation.user1Id === userId) {
          receiverId = conversationData.conversation.user2Id;
        } else if (conversationData.conversation.user2Id === userId) {
          receiverId = conversationData.conversation.user1Id;
        }
      }
      
      if (receiverId) {
        console.log('Using fallback receiver ID:', receiverId);
        sendMessageMutation.mutate({
          content: message,
          receiverId: receiverId,
        });
      } else {
        toast({
          title: 'Error sending message',
          description: 'Recipient information is missing. Please try again or reload the page.',
          variant: 'destructive',
        });
      }
      return;
    }
    
    // Case 4: Normal case - we have the other user information
    sendMessageMutation.mutate({
      content: message,
      receiverId: conversationData.otherUser.id,
    });
  };

  // Handle enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get user initials for avatar
  const getUserInitials = (user?: User) => {
    if (!user) return '';
    
    const firstInitial = user.firstName?.[0] || user.username[0];
    const lastInitial = user.lastName?.[0] || '';
    
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  const getOtherUsername = (conversation: any) => {
    return conversation?.otherUser?.username || "Unknown User";
  };

  // Handle starting a direct message with user by ID
  const startDirectMessage = (userId: number) => {
    if (!user) return;
    
    // Find existing conversation with this user
    const foundConversation = conversations.find((conv: any) => 
      (conv.user1Id === user.id && conv.user2Id === userId) ||
      (conv.user1Id === userId && conv.user2Id === user.id)
    );
    
    if (foundConversation) {
      // Use existing conversation
      setSelectedConversation(foundConversation.id);
    } else {
      // Track temporary recipient for a new conversation
      setTemporaryRecipient(userId);
      setSelectedConversation(null);
      toast({
        title: "New conversation",
        description: "Send a message to start the conversation",
      });
    }
  };

  // Format timestamp for display
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    
    // If same day, show time
    if (
      messageDate.getDate() === now.getDate() &&
      messageDate.getMonth() === now.getMonth() &&
      messageDate.getFullYear() === now.getFullYear()
    ) {
      return format(messageDate, 'h:mm a');
    }
    
    // If within a week, show day name
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    if (messageDate > oneWeekAgo) {
      return format(messageDate, 'EEE');
    }
    
    // Otherwise show date
    return format(messageDate, 'MMM d');
  };

  return (
    <div className="flex rounded-lg border border-neutral-200 overflow-hidden h-[70vh]">
      {/* Sidebar with conversations */}
      <div className="w-1/3 border-r border-neutral-200 bg-white">
        <div className="p-4 border-b border-neutral-200">
          <h3 className="font-medium text-lg">Messages</h3>
          <p className="text-sm text-neutral-500">Chat with buyers and sellers</p>
        </div>
        
        <ScrollArea className="h-[calc(70vh-88px)] p-3">
          {isLoadingConversations ? (
            // Loading skeletons
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 mb-2 border-b border-neutral-100">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))
          ) : conversations.length > 0 ? (
            conversations.map((conversation: any) => {
              const otherUser = conversation.otherUser;
              const lastMessage = conversation.lastMessage;
              
              return (
                <div 
                  key={conversation.id}
                  className={`flex items-center gap-3 p-3 mb-2 border-b border-neutral-100 cursor-pointer transition
                    ${selectedConversation === conversation.id 
                      ? 'bg-neutral-100' 
                      : 'hover:bg-neutral-50'}`}
                  onClick={() => setSelectedConversation(conversation.id)}
                >
                  <Avatar>
                    <AvatarImage src={otherUser?.avatar} />
                    <AvatarFallback>{getUserInitials(otherUser)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center">
                      <span className={`font-medium ${conversation.unreadCount > 0 ? 'text-primary' : ''}`}>
                        {getOtherUsername(conversation)}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {lastMessage ? formatTimestamp(new Date(lastMessage.createdAt)) : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-sm truncate ${conversation.unreadCount > 0 ? 'font-medium' : 'text-neutral-600'}`}>
                        {lastMessage?.content || 'No messages yet'}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-primary text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-neutral-500">
              <div className="mb-3">
                <Icon icon="ri-chat-3-line text-3xl text-neutral-400" />
              </div>
              <p className="font-medium">No conversations yet</p>
              <p className="text-sm mt-1">Messages from other users will appear here</p>
            </div>
          )}
        </ScrollArea>
      </div>
      
      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-neutral-50">
        {/* Chat Area */}
        {selectedConversation && conversationData ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-neutral-200 flex items-center bg-white">
              <div className="flex items-center">
                <Avatar className="mr-3 h-10 w-10">
                  <AvatarImage src={conversationData.otherUser?.avatar} />
                  <AvatarFallback>{getUserInitials(conversationData.otherUser)}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{conversationData.otherUser?.username}</h4>
                  <div className="flex items-center text-xs text-status-success">
                    <span className="w-2 h-2 bg-status-success rounded-full mr-1"></span>
                    <span>Online</span>
                  </div>
                </div>
              </div>
            </div>
            
            <ScrollArea className="flex-1 px-4 py-6">
              {/* Conversation */}
              <div className="space-y-4 max-w-3xl mx-auto">
                {isLoadingMessages ? (
                  // Loading skeletons
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className={`flex items-end ${i % 2 === 0 ? '' : 'justify-end'}`}>
                      {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full mr-2" />}
                      <Skeleton className={`h-20 w-64 rounded-2xl ${i % 2 === 0 ? 'rounded-bl-none' : 'rounded-br-none'}`} />
                    </div>
                  ))
                ) : (
                  // Messages display - check if we have messages
                  conversationData && conversationData.messages && conversationData.messages.length > 0 ? (
                    // Render each message
                    conversationData.messages.map((msg: any) => {
                      const isFromCurrentUser = user ? msg.senderId === user.id : false;
                      
                      // Display trade message
                      if (msg.isTrade === true && user) {
                        // Check if message has tradeOfferId (new system)
                        if (msg.tradeOfferId) {
                          return (
                            <div key={msg.id} className="w-full">
                              <TradeMessageWrapper message={msg} />
                            </div>
                          );
                        } else {
                          // Fall back to old system if no tradeOfferId
                          return (
                            <div key={msg.id} className="w-full">
                              <TradeOfferMessage
                                message={msg}
                                currentUser={user}
                                otherUser={conversationData.otherUser}
                              />
                            </div>
                          );
                        }
                      }
                      
                      // Regular message
                      return (
                        <div 
                          key={msg.id} 
                          className={`flex items-end ${isFromCurrentUser ? 'justify-end' : ''}`}
                        >
                          {!isFromCurrentUser && (
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarImage src={conversationData.otherUser?.avatar || ""} />
                              <AvatarFallback>{conversationData.otherUser ? getUserInitials(conversationData.otherUser) : "??"}</AvatarFallback>
                            </Avatar>
                          )}
                          
                          <div 
                            className={`max-w-[70%] py-2 px-3 rounded-t-xl shadow-sm
                              ${isFromCurrentUser 
                                ? 'bg-primary text-white rounded-bl-xl rounded-br-none' 
                                : 'bg-white text-neutral-900 rounded-br-xl rounded-bl-none'}`}
                          >
                            <p className="whitespace-pre-line">{msg.content}</p>
                            {/* Show message images if available */}
                            {msg.images && Array.isArray(msg.images) && msg.images.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {msg.images.map((imageUrl: string, index: number) => (
                                  <img 
                                    key={index} 
                                    src={imageUrl} 
                                    alt="Message attachment" 
                                    className="max-w-full rounded-md" 
                                  />
                                ))}
                              </div>
                            )}
                            {/* Show message timestamp */}
                            <div className={`text-xs mt-1 ${isFromCurrentUser ? 'text-primary-foreground/70' : 'text-neutral-500'}`}>
                              {format(new Date(msg.createdAt), 'h:mm a')}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // No messages
                    <div className="flex items-center justify-center h-48">
                      <div className="text-center text-neutral-500">
                        <p className="font-medium">No messages yet</p>
                        <p className="text-sm mt-1">Start the conversation by sending a message</p>
                      </div>
                    </div>
                  )
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t border-neutral-200 bg-white">
              <div className="flex items-end max-w-3xl mx-auto">
                <div className="flex-1">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type a message..."
                    className="w-full py-2 px-4 border border-neutral-200 rounded-full"
                  />
                </div>
                <Button 
                  className="ml-2 px-4 py-2 text-white bg-primary rounded-full flex items-center gap-2"
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  onClick={handleSendMessage}
                >
                  {sendMessageMutation.isPending ? (
                    <>
                      <Icon icon="ri-loader-4-line animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Icon icon="ri-send-plane-fill" />
                      <span>Send</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : temporaryRecipient !== null ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-neutral-200 bg-white">
              <h3 className="font-medium">New Conversation</h3>
              <p className="text-sm text-neutral-500">Send a message to start chatting</p>
            </div>
            
            <div className="flex-1 flex flex-col justify-end">
              <div className="p-4 border-t border-neutral-200 bg-white">
                <div className="flex items-end max-w-3xl mx-auto">
                  <div className="flex-1">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type a message to start the conversation..."
                      className="w-full py-2 px-4 border border-neutral-200 rounded-full"
                      autoFocus
                    />
                  </div>
                  <Button 
                    className="ml-2 px-4 py-2 text-white bg-primary rounded-full flex items-center gap-2"
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    onClick={handleSendMessage}
                  >
                    {sendMessageMutation.isPending ? (
                      <>
                        <Icon icon="ri-loader-4-line animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Icon icon="ri-send-plane-fill" />
                        <span>Send</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-neutral-500">
            <div className="p-6 rounded-full bg-neutral-100 mb-4">
              <Icon icon="ri-chat-smile-2-line text-5xl text-neutral-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">Your messages</h3>
            <p className="text-center text-sm max-w-md">
              Select a conversation from the list to view messages or start a new conversation by messaging a seller from a product page
            </p>
          </div>
        )}
      </div>
    </div>
  );
}