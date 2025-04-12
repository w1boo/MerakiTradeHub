import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, Product, Transaction, Deposit } from "@shared/schema";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/theme";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [updateBalanceAmount, setUpdateBalanceAmount] = useState<string>("");
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<(Deposit & { username?: string }) | null>(null);
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);

  // If not admin, redirect to home
  const [, navigate] = useLocation();
  if (!user?.isAdmin) {
    navigate("/");
    return null;
  }

  // Format date to a readable format
  const formatDate = (date: Date) => {
    return format(new Date(date), "MMM d, yyyy h:mm a");
  };

  // Fetch all users
  const {
    data: users,
    isLoading: isLoadingUsers,
    error: usersError,
  } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch all transactions
  const {
    data: transactions,
    isLoading: isLoadingTransactions,
    error: transactionsError,
  } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch all deposits
  const {
    data: deposits,
    isLoading: isLoadingDeposits,
    error: depositsError,
    refetch: refetchDeposits,
  } = useQuery<(Deposit & { username?: string })[]>({
    queryKey: ["/api/admin/deposits"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch products (for simplicity, using the recent products endpoint)
  const { 
    data: products, 
    isLoading: isLoadingProducts,
    error: productsError,
  } = useQuery<Product[]>({
    queryKey: ["/api/products/recent"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Toggle admin status mutation
  const toggleAdminMutation = useMutation({
    mutationFn: async (userId: number) => {
      const user = users?.find(u => u.id === userId);
      if (!user) throw new Error("User not found");
      
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}`, {
        isAdmin: !user.isAdmin
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User updated",
        description: "Admin status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update user balance mutation
  const updateBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: number; amount: number }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/balance`, {
        amount
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsBalanceDialogOpen(false);
      setUpdateBalanceAmount("");
      setSelectedUser(null);
      toast({
        title: "Balance updated",
        description: "User balance has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Approve deposit mutation
  const approveDepositMutation = useMutation({
    mutationFn: async (depositId: number) => {
      const res = await apiRequest("POST", `/api/admin/deposits/${depositId}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deposits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsDepositDialogOpen(false);
      setSelectedDeposit(null);
      toast({
        title: "Deposit approved",
        description: "The deposit has been approved and funds added to user's balance.",
      });
    },
    onError: (error) => {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Reject deposit mutation
  const rejectDepositMutation = useMutation({
    mutationFn: async (depositId: number) => {
      const res = await apiRequest("POST", `/api/admin/deposits/${depositId}/reject`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deposits"] });
      setIsDepositDialogOpen(false);
      setSelectedDeposit(null);
      toast({
        title: "Deposit rejected",
        description: "The deposit has been rejected.",
      });
    },
    onError: (error) => {
      toast({
        title: "Rejection failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update product status mutation
  const updateProductStatusMutation = useMutation({
    mutationFn: async ({ productId, status }: { productId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/products/${productId}`, {
        status
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/recent"] });
      setIsProductDialogOpen(false);
      setSelectedProduct(null);
      toast({
        title: "Product updated",
        description: "Product status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/products/${productId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/recent"] });
      setIsProductDialogOpen(false);
      setSelectedProduct(null);
      toast({
        title: "Product deleted",
        description: "The product has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update transaction status mutation
  const updateTransactionStatusMutation = useMutation({
    mutationFn: async ({ transactionId, status }: { transactionId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/transactions/${transactionId}`, {
        status
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      setIsTransactionDialogOpen(false);
      setSelectedTransaction(null);
      toast({
        title: "Transaction updated",
        description: "Transaction status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handler for toggling admin status
  const handleToggleAdmin = (user: User) => {
    toggleAdminMutation.mutate(user.id);
  };

  // Handler for updating user balance
  const handleUpdateBalance = () => {
    if (!selectedUser) return;
    
    const amount = parseFloat(updateBalanceAmount);
    if (isNaN(amount)) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid number.",
        variant: "destructive",
      });
      return;
    }
    
    updateBalanceMutation.mutate({ 
      userId: selectedUser.id, 
      amount 
    });
  };

  // Handler for approving a deposit
  const handleApproveDeposit = () => {
    if (!selectedDeposit) return;
    approveDepositMutation.mutate(selectedDeposit.id);
  };

  // Handler for rejecting a deposit
  const handleRejectDeposit = () => {
    if (!selectedDeposit) return;
    rejectDepositMutation.mutate(selectedDeposit.id);
  };

  // Handler for updating product status
  const handleProductStatusChange = (product: Product, status: string) => {
    updateProductStatusMutation.mutate({
      productId: product.id,
      status
    });
  };

  // Handler for deleting product
  const handleDeleteProduct = (product: Product) => {
    deleteProductMutation.mutate(product.id);
  };

  // Handler for updating transaction status
  const handleTransactionStatusChange = (transaction: Transaction, status: string) => {
    updateTransactionStatusMutation.mutate({
      transactionId: transaction.id,
      status
    });
  };

  // Get user initials for avatar
  const getUserInitials = (user: User) => {
    if (!user.firstName && !user.lastName) {
      return user.username.substring(0, 2).toUpperCase();
    }
    
    const firstInitial = user.firstName ? user.firstName.charAt(0) : '';
    const lastInitial = user.lastName ? user.lastName.charAt(0) : '';
    return (firstInitial + lastInitial).toUpperCase();
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 py-8 container">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-neutral-600">
            Manage users, products, transactions and deposits
          </p>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  View and manage all users on the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex space-x-4 items-center">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[200px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users?.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="min-w-[200px]">
                              <div className="flex items-center space-x-3">
                                <Avatar>
                                  <AvatarFallback>
                                    {getUserInitials(user)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{user.username}</div>
                                  <div className="text-xs text-neutral-500">
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-mono font-medium">
                                {user.balance.toLocaleString('vi-VN')} ₫
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(user.createdAt)}</TableCell>
                            <TableCell>
                              <Badge variant={user.isAdmin ? "outline" : "secondary"}>
                                {user.isAdmin ? "Admin" : "User"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsBalanceDialogOpen(true);
                                  }}
                                >
                                  <Icon icon="ri-money-dollar-circle-line mr-1" />
                                  Balance
                                </Button>
                                <Button
                                  size="sm"
                                  variant={user.isAdmin ? "destructive" : "secondary"}
                                  onClick={() => handleToggleAdmin(user)}
                                  disabled={user.id === 1} // Prevent demoting the first admin
                                >
                                  {user.isAdmin ? (
                                    <>
                                      <Icon icon="ri-user-unfollow-line mr-1" />
                                      Remove Admin
                                    </>
                                  ) : (
                                    <>
                                      <Icon icon="ri-user-star-line mr-1" />
                                      Make Admin
                                    </>
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deposits">
            <Card>
              <CardHeader>
                <CardTitle>Deposit Management</CardTitle>
                <CardDescription>
                  Approve or reject deposit requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDeposits ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deposits?.map((deposit) => (
                          <TableRow key={deposit.id}>
                            <TableCell>{deposit.username || `User #${deposit.userId}`}</TableCell>
                            <TableCell>
                              <div className="font-mono font-medium">
                                {deposit.amount.toLocaleString('vi-VN')} ₫
                              </div>
                            </TableCell>
                            <TableCell className="capitalize">{deposit.method}</TableCell>
                            <TableCell>{formatDate(deposit.createdAt)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  deposit.status === "completed"
                                    ? "outline"
                                    : deposit.status === "pending"
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {deposit.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {deposit.status === "pending" && (
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedDeposit(deposit);
                                      setIsDepositDialogOpen(true);
                                    }}
                                  >
                                    <Icon icon="ri-settings-3-line mr-1" />
                                    Manage
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Product Management</CardTitle>
                <CardDescription>
                  View and manage all products on the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingProducts ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex space-x-4 items-center">
                        <Skeleton className="h-16 w-16 rounded-md" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[200px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Listed</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products?.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="min-w-[300px]">
                              <div className="flex space-x-3 items-center">
                                <div className="h-16 w-16 bg-neutral-100 rounded-md overflow-hidden">
                                  {product.images && product.images.length > 0 ? (
                                    <img
                                      src={product.images[0]}
                                      alt={product.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center">
                                      <Icon icon="ri-image-line text-neutral-400 text-2xl" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium line-clamp-1">{product.title}</div>
                                  <div className="text-xs text-neutral-500 line-clamp-1">
                                    {product.description}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-mono font-medium">
                                {product.price ? `${product.price.toLocaleString('vi-VN')} ₫` : 'Trade only'}
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(product.createdAt)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  product.status === "active"
                                    ? "outline"
                                    : product.status === "pending"
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {product.status || "active"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setIsProductDialogOpen(true);
                                  }}
                                >
                                  <Icon icon="ri-settings-3-line mr-1" />
                                  Manage
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteProduct(product)}
                                >
                                  <Icon icon="ri-delete-bin-line mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Management</CardTitle>
                <CardDescription>
                  View and manage all transactions on the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTransactions ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Transaction ID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions?.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="font-mono">
                              {transaction.transactionId.slice(0, 8)}...
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {transaction.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="font-mono font-medium">
                                {transaction.amount.toLocaleString('vi-VN')} ₫
                              </div>
                              <div className="text-xs text-neutral-500">
                                Fee: {transaction.platformFee.toLocaleString('vi-VN')} ₫
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  transaction.status === "completed"
                                    ? "success"
                                    : transaction.status === "pending"
                                    ? "warning"
                                    : transaction.status === "processing"
                                    ? "outline"
                                    : "destructive"
                                }
                              >
                                {transaction.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedTransaction(transaction);
                                  setIsTransactionDialogOpen(true);
                                }}
                              >
                                <Icon icon="ri-settings-3-line mr-1" />
                                Manage
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />

      {/* User Balance Dialog */}
      <Dialog open={isBalanceDialogOpen} onOpenChange={setIsBalanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update User Balance</DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback>
                    {getUserInitials(selectedUser)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{selectedUser.username}</div>
                  <div className="text-sm text-neutral-500">
                    Current balance: {selectedUser.balance.toLocaleString('vi-VN')} ₫
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Amount to add/subtract:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2">₫</span>
                  <Input
                    type="number"
                    placeholder="0"
                    className="pl-8"
                    value={updateBalanceAmount}
                    onChange={(e) => setUpdateBalanceAmount(e.target.value)}
                  />
                </div>
                <p className="text-xs text-neutral-500">
                  Use a positive number to add funds, negative to subtract.
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBalanceDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateBalance}
                  disabled={!updateBalanceAmount || updateBalanceMutation.isPending}
                >
                  {updateBalanceMutation.isPending ? (
                    <>
                      <Icon icon="ri-loader-4-line animate-spin mr-1" />
                      Updating...
                    </>
                  ) : (
                    "Update Balance"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Deposit Management Dialog */}
      <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Deposit</DialogTitle>
          </DialogHeader>
          
          {selectedDeposit && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-neutral-500">User</div>
                  <div className="font-medium">
                    {selectedDeposit.username || `User #${selectedDeposit.userId}`}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-neutral-500">Amount</div>
                  <div className="font-mono font-medium">
                    {selectedDeposit.amount.toLocaleString('vi-VN')} ₫
                  </div>
                </div>
                <div>
                  <div className="text-sm text-neutral-500">Method</div>
                  <div className="capitalize">{selectedDeposit.method}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-500">Date</div>
                  <div>{formatDate(selectedDeposit.createdAt)}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-500">Status</div>
                  <Badge
                    variant={
                      selectedDeposit.status === "completed"
                        ? "success"
                        : selectedDeposit.status === "pending"
                        ? "warning"
                        : "destructive"
                    }
                    className="mt-1"
                  >
                    {selectedDeposit.status}
                  </Badge>
                </div>
              </div>

              <div className="p-3 bg-neutral-100 rounded-lg text-neutral-700 text-sm">
                <p>
                  Approving this deposit will add the funds to the user's account.
                  Rejecting it will mark it as rejected without adding funds.
                </p>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDepositDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRejectDeposit}
                  disabled={rejectDepositMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {rejectDepositMutation.isPending ? (
                    <>
                      <Icon icon="ri-loader-4-line animate-spin mr-1" />
                      Rejecting...
                    </>
                  ) : (
                    "Reject Deposit"
                  )}
                </Button>
                <Button
                  onClick={handleApproveDeposit}
                  disabled={approveDepositMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {approveDepositMutation.isPending ? (
                    <>
                      <Icon icon="ri-loader-4-line animate-spin mr-1" />
                      Approving...
                    </>
                  ) : (
                    "Approve Deposit"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Management Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Product</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-6">
              <div className="flex space-x-4 items-start">
                <div className="h-20 w-20 bg-neutral-100 rounded-md overflow-hidden flex-shrink-0">
                  {selectedProduct.images && selectedProduct.images.length > 0 ? (
                    <img
                      src={selectedProduct.images[0]}
                      alt={selectedProduct.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Icon icon="ri-image-line text-neutral-400 text-2xl" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium">{selectedProduct.title}</h3>
                  <p className="text-sm text-neutral-500 line-clamp-2">
                    {selectedProduct.description}
                  </p>
                  <div className="text-sm mt-1">
                    <span className="font-medium">Price:</span>{" "}
                    {selectedProduct.price ? `${selectedProduct.price.toLocaleString('vi-VN')} ₫` : 'Trade only'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Update product status:
                </label>
                <Select 
                  defaultValue={selectedProduct.status || "active"}
                  onValueChange={(value) => handleProductStatusChange(selectedProduct, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>
                  Close
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => handleDeleteProduct(selectedProduct)}
                  disabled={deleteProductMutation.isPending}
                >
                  {deleteProductMutation.isPending ? (
                    <>
                      <Icon icon="ri-loader-4-line animate-spin mr-1" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Product"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transaction Management Dialog */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Transaction</DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-6">
              <div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-neutral-500">Transaction ID</div>
                    <div className="font-mono text-sm">{selectedTransaction.transactionId}</div>
                  </div>
                  <div>
                    <div className="text-sm text-neutral-500">Type</div>
                    <div className="font-medium">{selectedTransaction.type}</div>
                  </div>
                  <div>
                    <div className="text-sm text-neutral-500">Amount</div>
                    <div className="font-mono font-medium">
                      {selectedTransaction.amount.toLocaleString('vi-VN')} ₫
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-neutral-500">Platform Fee</div>
                    <div className="font-mono font-medium">
                      {selectedTransaction.platformFee.toLocaleString('vi-VN')} ₫
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-neutral-500">Date</div>
                    <div>{formatDate(selectedTransaction.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-neutral-500">Current Status</div>
                    <Badge
                      variant={
                        selectedTransaction.status === "completed"
                          ? "success"
                          : selectedTransaction.status === "pending"
                          ? "warning"
                          : selectedTransaction.status === "processing"
                          ? "outline"
                          : "destructive"
                      }
                      className="mt-1"
                    >
                      {selectedTransaction.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Update transaction status:
                </label>
                <Select 
                  defaultValue={selectedTransaction.status}
                  onValueChange={(value) => handleTransactionStatusChange(selectedTransaction, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTransactionDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}