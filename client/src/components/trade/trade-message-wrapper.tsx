import { useAuth } from "@/hooks/use-auth";
import { Message } from "@/types";
import { TradeOfferMessage } from "./trade-offer-message";

interface TradeMessageWrapperProps {
  message: Message;
}

export function TradeMessageWrapper({ message }: TradeMessageWrapperProps) {
  const { user } = useAuth();
  
  if (!user) {
    return null;
  }
  
  // Determine if current user is buyer or seller
  const isBuyer = message.senderId === user.id;
  const isSeller = message.receiverId === user.id;
  
  if (!message.tradeOfferId) {
    return (
      <div className="w-full p-3 bg-muted/30 rounded-md my-2">
        <p className="text-sm text-muted-foreground">
          This trade message is using an older format and may not display correctly.
        </p>
      </div>
    );
  }
  
  return (
    <TradeOfferMessage
      messageId={message.id}
      tradeOfferId={message.tradeOfferId}
      senderId={message.senderId}
      receiverId={message.receiverId}
      productId={message.productId}
    />
  );
}