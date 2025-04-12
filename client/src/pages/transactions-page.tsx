import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Transaction } from "@/types";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import { Icon, statusColors } from "@/components/ui/theme";
import { Button } from "@/components/ui/button";
import { TransactionDetail } from "@/components/transactions/transaction-detail";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function TransactionsPage() {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Fetch transactions
  const { 
    data: transactions, 
    isLoading, 
    error 
  } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

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

  // Format date
  const formatDate = (date: Date) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  // Filter transactions by type
  const getTransactionsByType = (type: string) => {
    if (!transactions) return [];
    return transactions.filter(t => t.type === type);
  };

  // Filter transactions by status
  const getTransactionsByStatus = (status: string) => {
    if (!transactions) return [];
    return transactions.filter(t => t.status.toLowerCase() === status.toLowerCase());
  };

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow pb-24 md:pb-0">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Transactions</h1>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Icon icon="ri-exchange-dollar-line text-xl text-primary mr-2" />
                    Active Escrow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <p className="text-3xl font-bold">
                      ${getTransactionsByStatus('pending')
                        .reduce((acc, t) => acc + t.amount, 0)
                        .toFixed(2)}
                    </p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Icon icon="ri-check-line text-xl text-secondary mr-2" />
                    Completed Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <p className="text-3xl font-bold">
                      {getTransactionsByStatus('completed').length}
                    </p>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Icon icon="ri-time-line text-xl text-accent mr-2" />
                    Pending Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <p className="text-3xl font-bold">
                      {getTransactionsByStatus('pending').length}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                View and manage all your purchases, sales, and trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="mb-6">
                <TabsList>
                  <TabsTrigger value="all">All Transactions</TabsTrigger>
                  <TabsTrigger value="purchases">Purchases</TabsTrigger>
                  <TabsTrigger value="trades">Trades</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-4">
                  {renderTransactionsTable(transactions)}
                </TabsContent>
                
                <TabsContent value="purchases" className="mt-4">
                  {renderTransactionsTable(getTransactionsByType('purchase'))}
                </TabsContent>
                
                <TabsContent value="trades" className="mt-4">
                  {renderTransactionsTable(getTransactionsByType('trade'))}
                </TabsContent>
                
                <TabsContent value="pending" className="mt-4">
                  {renderTransactionsTable(getTransactionsByStatus('pending'))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
      <MobileNav />
      
      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <TransactionDetail
          transaction={selectedTransaction}
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
  
  function renderTransactionsTable(filteredTransactions: Transaction[] | undefined) {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="text-center p-8 text-red-500">
          <Icon icon="ri-error-warning-line text-3xl mb-2" />
          <p>Error loading transactions. Please try again.</p>
        </div>
      );
    }
    
    if (!filteredTransactions || filteredTransactions.length === 0) {
      return (
        <div className="text-center p-8 text-neutral-500">
          <Icon icon="ri-inbox-line text-3xl mb-2" />
          <p>No transactions found</p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((transaction) => (
              <TableRow 
                key={transaction.id}
                className="cursor-pointer hover:bg-neutral-50"
                onClick={() => handleTransactionClick(transaction)}
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
                      <div className="text-sm font-medium">
                        {transaction.product?.title || "Product"}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="capitalize">
                  {transaction.type}
                </TableCell>
                <TableCell className="font-medium">
                  {transaction.amount.toLocaleString('vi-VN')} ₫
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
                      handleTransactionClick(transaction);
                    }}
                  >
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
}
