import { Transaction } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { statusColors, Icon } from "@/components/ui/theme";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { TransactionDetail } from "@/components/transactions/transaction-detail";

export default function TransactionTable({ limit }: { limit?: number }) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  const { data: transactions, isLoading, error } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  // Format date to readable string
  const formatDate = (date: Date) => {
    return format(new Date(date), 'MMM dd, yyyy');
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

  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  const displayedTransactions = limit && transactions 
    ? transactions.slice(0, limit)
    : transactions;

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Icon icon="ri-loader-4-line animate-spin text-2xl text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-destructive">
        Failed to load transactions. Please try again.
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-neutral-100">
              <TableRow>
                <TableHead className="w-[100px]">Transaction</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedTransactions && displayedTransactions.length > 0 ? (
                displayedTransactions.map((transaction) => (
                  <TableRow 
                    key={transaction.id} 
                    className="cursor-pointer hover:bg-neutral-50"
                    onClick={() => handleRowClick(transaction)}
                  >
                    <TableCell className="font-medium">
                      #{transaction.transactionId}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <img 
                            className="h-10 w-10 rounded-md object-cover" 
                            src={transaction.product?.images[0]} 
                            alt={transaction.product?.title} 
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium">{transaction.product?.title}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {transaction.type}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${transaction.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {formatDate(transaction.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="link" 
                        className="text-primary p-0 h-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(transaction);
                        }}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-neutral-500">
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedTransaction && (
        <TransactionDetail 
          transaction={selectedTransaction}
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </>
  );
}
