import { Transaction } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icon, statusColors } from "@/components/ui/theme";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface TransactionDetailProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionDetail({ 
  transaction, 
  isOpen, 
  onClose 
}: TransactionDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Format date to readable string
  const formatDate = (date: Date | string) => {
    return format(new Date(date), 'MMM dd, yyyy, h:mm a');
  };

  // Mutation to update transaction status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await apiRequest("PUT", `/api/transactions/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Transaction updated",
        description: "The transaction status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "Could not update transaction status.",
        variant: "destructive",
      });
    }
  });

  // Determine the status icon
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Icon icon="ri-check-line text-3xl" className="text-status-success" />;
      case 'pending':
      case 'in escrow':
        return <Icon icon="ri-time-line text-3xl" className="text-status-warning" />;
      case 'disputed':
      case 'cancelled':
        return <Icon icon="ri-close-line text-3xl" className="text-status-error" />;
      default:
        return <Icon icon="ri-question-line text-3xl" />;
    }
  };

  // Get status color class
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return statusColors.completed;
      case 'in escrow':
      case 'pending':
        return statusColors.pending;
      case 'disputed':
      case 'cancelled':
        return statusColors.disputed;
      default:
        return "bg-neutral-100 text-neutral-600";
    }
  };

  // Check if user is buyer
  const isBuyer = user?.id === transaction.buyerId;
  
  // Check if transaction is pending and user is buyer to show complete button
  const showCompleteButton = transaction.status === 'pending' && isBuyer;
  
  // Handle completing transaction
  const handleComplete = () => {
    updateStatusMutation.mutate({ id: transaction.id, status: 'completed' });
  };
  
  // Handle cancelling transaction
  const handleCancel = () => {
    updateStatusMutation.mutate({ id: transaction.id, status: 'cancelled' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Transaction Details</DialogTitle>
        </DialogHeader>

        <div className="mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className={`p-4 rounded-full ${getStatusClass(transaction.status)}`}>
              {getStatusIcon(transaction.status)}
            </div>
          </div>
          <h3 className="text-center text-xl font-semibold mb-1 capitalize">
            Transaction {transaction.status}
          </h3>
          <p className="text-center text-neutral-600">
            Transaction ID: #{transaction.transactionId}
          </p>
        </div>

        <div className="bg-neutral-100 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-4">
            <img 
              src={transaction.product?.images[0]} 
              alt={transaction.product?.title}
              className="w-15 h-15 rounded-md object-cover mr-4" 
            />
            <div>
              <h4 className="font-medium text-lg">{transaction.product?.title}</h4>
              <p className="text-neutral-600">
                {isBuyer 
                  ? `Purchased from ${transaction.seller?.username}` 
                  : `Sold to ${transaction.buyer?.username}`}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-b border-neutral-200 py-4 mb-6">
          <h4 className="font-medium mb-3">Transaction Summary</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-neutral-600">Item Price</span>
              <span className="font-medium">{transaction.amount.toLocaleString('vi-VN')} ₫</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">
                Platform Fee ({Math.round((transaction.platformFee / transaction.amount) * 100)}%)
              </span>
              <span className="font-medium">{transaction.platformFee.toLocaleString('vi-VN')} ₫</span>
            </div>
            {transaction.shipping && (
              <div className="flex justify-between">
                <span className="text-neutral-600">Shipping</span>
                <span className="font-medium">{transaction.shipping.toLocaleString('vi-VN')} ₫</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-medium pt-2 border-t border-neutral-200">
              <span>Total</span>
              <span>
                {(transaction.amount + (transaction.shipping || 0)).toLocaleString('vi-VN')} ₫
              </span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="font-medium mb-3">Transaction Timeline</h4>
          <div className="relative pl-6 pb-2">
            <div className="absolute top-0 left-0 h-full border-l-2 border-status-success"></div>
            
            {transaction.timeline.map((event, index) => (
              <div className="relative mb-4" key={index}>
                <div className="absolute top-1 left-[-0.5rem] w-3 h-3 bg-status-success rounded-full"></div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium capitalize">{event.status}</span>
                  <span className="text-sm text-neutral-600">
                    {formatDate(event.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-neutral-600">{event.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-neutral-100 rounded-lg p-4 mb-6">
          <h4 className="font-medium mb-2">Escrow Protection</h4>
          <p className="text-sm text-neutral-600">
            This transaction is protected by Meraki's escrow system. The payment is held securely until you confirm receipt of the item.
          </p>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" className="border-neutral-200">
            <Icon icon="ri-download-line mr-1" />
            Download Receipt
          </Button>
          
          <div className="space-x-2">
            {showCompleteButton && (
              <Button onClick={handleComplete}>
                <Icon icon="ri-check-line mr-1" />
                Complete
              </Button>
            )}
            
            {transaction.status === 'pending' && (
              <Button
                variant="outline"
                className="border-primary text-primary"
                onClick={handleCancel}
              >
                <Icon icon="ri-close-line mr-1" />
                Cancel
              </Button>
            )}
            
            <Button
              variant="outline"
              className="border-primary text-primary"
            >
              <Icon icon="ri-customer-service-2-line mr-1" />
              Need Help?
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
