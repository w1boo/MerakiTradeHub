import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Conversation, Message, User } from "@/types";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icon } from "@/components/ui/theme";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast"; // Assuming a toast component exists

interface ChatInterfaceProps {
  conversationId?: number;
}

export default function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<number | null>(conversationId || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations, isLoading: isLoadingConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: !!user,
  });

  // Fetch messages for selected conversation
  const { data: conversationData, isLoading: isLoadingMessages } = useQuery<{
    conversation: Conversation;
    messages: Message[];
    otherUser: User;
  }>({
    queryKey: ["/api/conversations", selectedConversation],
    enabled: !!selectedConversation,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { receiverId: number, content: string }) => {
      if (!data.content.trim()) return;
      const res = await apiRequest("POST", "/api/messages", data);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      // Clear message input
      setMessage("");

      // Invalidate queries to refresh data
      if (selectedConversation) {
        queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = () => {
    if (!message.trim() || !conversationData?.otherUser) return;

    sendMessageMutation.mutate({
      receiverId: conversationData.otherUser.id,
      content: message
    });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationData?.messages]);

  const handleSendMessage = () => {
    if (!message.trim() || !conversationData?.otherUser) return;

    sendMessageMutation.mutate({
      receiverId: conversationData.otherUser.id,
      content: message.trim()
    }, {
      onSuccess: () => {
        setMessage("");
        // Refresh the conversation data
        queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation] });
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      },
      onError: (error) => {
        toast({
          title: "Failed to send message",
          description: error.message,
          variant: "destructive"
        });
      }
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getUserInitials = (user?: User) => {
    if (!user) return "U";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    } else if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const formatMessageTime = (date: Date) => {
    return format(new Date(date), "h:mm a");
  };

  return (
    <div className="bg-white rounded-xl shadow-xl w-full h-[80vh] flex flex-col">
      <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Messages</h2>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Contacts List */}
        <div className="w-1/3 border-r border-neutral-200 overflow-y-auto">
          <div className="p-3 border-b border-neutral-200">
            <div className="relative">
              <Input 
                type="text" 
                placeholder="Search messages..." 
                className="w-full py-2 pl-8 pr-4 border border-neutral-200 rounded-lg"
              />
              <Icon icon="ri-search-line" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-600" />
            </div>
          </div>

          {isLoadingConversations ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="p-3 border-b border-neutral-200">
                <div className="flex items-center">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="ml-3 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40 mt-1" />
                  </div>
                </div>
              </div>
            ))
          ) : conversations && conversations.length > 0 ? (
            conversations.map((conversation) => (
              <div 
                key={conversation.id}
                className={`p-3 border-b border-neutral-200 hover:bg-neutral-100 cursor-pointer ${selectedConversation === conversation.id ? 'bg-primary/5' : ''}`}
                onClick={() => setSelectedConversation(conversation.id)}
              >
                <div className="flex items-center">
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={conversation.otherUser?.avatar} />
                      <AvatarFallback>{getUserInitials(conversation.otherUser)}</AvatarFallback>
                    </Avatar>
                    <span className={`absolute bottom-0 right-0 w-3 h-3 ${conversation.otherUser?.isAdmin ? 'bg-status-success' : 'bg-neutral-300'} rounded-full border-2 border-white`}></span>
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{conversation.otherUser?.username}</h4>
                      <span className="text-xs text-neutral-500">
                        {conversation.updatedAt ? format(new Date(conversation.updatedAt), "h:mm a") : ""}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600 truncate">
                      {conversation.lastMessage?.content || "Start a conversation..."}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-neutral-500">
              No conversations yet
            </div>
          )}
        </div>

        {/* Chat Area */}
        {selectedConversation && conversationData ? (
          <div className="flex-1 flex flex-col">
            <div className="p-3 border-b border-neutral-200 flex items-center">
              <div className="flex items-center">
                <Avatar className="mr-3">
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
              <div className="ml-auto flex items-center space-x-2">
                <Button variant="ghost" size="icon" title="Audio Call">
                  <Icon icon="ri-phone-line text-neutral-600" />
                </Button>
                <Button variant="ghost" size="icon" title="Video Call">
                  <Icon icon="ri-vidicon-line text-neutral-600" />
                </Button>
                <Button variant="ghost" size="icon" title="More Options">
                  <Icon icon="ri-more-2-fill text-neutral-600" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              {/* Conversation */}
              <div className="space-y-4">
                {isLoadingMessages ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className={`flex items-end ${i % 2 === 0 ? '' : 'justify-end'}`}>
                      {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full mr-2" />}
                      <Skeleton className={`h-20 w-64 rounded-2xl ${i % 2 === 0 ? 'rounded-bl-none' : 'rounded-br-none'}`} />
                    </div>
                  ))
                ) : conversationData.messages && conversationData.messages.length > 0 ? (
                  conversationData.messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex items-end ${message.senderId === user?.id ? 'justify-end' : ''}`}
                    >
                      {message.senderId !== user?.id && (
                        <Avatar className="w-8 h-8 mr-2">
                          <AvatarImage src={conversationData.otherUser?.avatar} />
                          <AvatarFallback>{getUserInitials(conversationData.otherUser)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div 
                        className={`${
                          message.senderId === user?.id 
                            ? 'bg-primary text-white rounded-2xl rounded-br-none' 
                            : 'bg-neutral-100 rounded-2xl rounded-bl-none'
                        } py-2 px-4 max-w-[70%]`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <span className={`text-xs ${message.senderId === user?.id ? 'text-white/70' : 'text-neutral-500'} mt-1 block`}>
                          {formatMessageTime(message.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-neutral-500 py-8">
                    <Icon icon="ri-chat-3-line text-4xl mb-2" />
                    <p>No messages yet. Start a conversation!</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-neutral-200">
              <div className="flex items-end">
                <Button variant="ghost" size="icon" className="text-neutral-600 hover:text-primary">
                  <Icon icon="ri-image-line text-xl" />
                </Button>
                <Button variant="ghost" size="icon" className="text-neutral-600 hover:text-primary">
                  <Icon icon="ri-attachment-2 text-xl" />
                </Button>
                <div className="flex-1 mx-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type a message..."
                    className="w-full py-2 px-4 border border-neutral-200 rounded-full"
                  />
                </div>
                <Button 
                  className="px-4 py-2 text-white bg-primary rounded-full flex items-center gap-2"
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
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-neutral-500">
            <Icon icon="ri-chat-smile-2-line text-6xl mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
            <p className="text-center">Choose a conversation from the list or start a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}