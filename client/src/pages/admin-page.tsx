import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { User, Transaction, Product } from "@/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Icon, statusColors } from "@/components/ui/theme";
import { format } from "date-fns";
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
  CardFooter,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionDetail } from "@/components/transactions/transaction-detail";

export default function AdminPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  
  // Fetch all users
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });
  
  // Fetch all products
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });
  
  // Fetch all transactions
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions"],
  });
  
  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: { id: number, updates: Partial<User> }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${data.id}`, data.updates);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "User information has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsEditUserModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "Could not update user. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (data: { id: number, updates: Partial<Product> }) => {
      const res = await apiRequest("PUT", `/api/products/${data.id}`, data.updates);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Product updated",
        description: "Product information has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsEditProductModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "Could not update product. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Filter data based on search term
  const filteredUsers = users?.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const filteredProducts = products?.filter(product => 
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.location && product.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const filteredTransactions = transactions?.filter(transaction => 
    transaction.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.status.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Format date
  const formatDate = (date: Date) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };
  
  // Handle make admin
  const handleToggleAdmin = (user: User) => {
    if (!user) return;
    
    updateUserMutation.mutate({
      id: user.id,
      updates: { isAdmin: !user.isAdmin }
    });
  };
  
  // Handle product status change
  const handleProductStatusChange = (product: Product, status: string) => {
    if (!product) return;
    
    updateProductMutation.mutate({
      id: product.id,
      updates: { status }
    });
  };
  
  // Handle edit user
  const handleEditUser = () => {
    if (!selectedUser) return;
    
    // In a real application, you would collect updated user data
    // For this demo, we'll just toggle the admin status
    updateUserMutation.mutate({
      id: selectedUser.id,
      updates: { isAdmin: !selectedUser.isAdmin }
    });
  };
  
  // Calculate platform stats
  const getTotalTransactionValue = () => {
    if (!transactions) return 0;
    return transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  };
  
  const getTotalFees = () => {
    if (!transactions) return 0;
    return transactions.reduce((sum, transaction) => sum + transaction.platformFee, 0);
  };
  
  const getPendingTransactionsCount = () => {
    if (!transactions) return 0;
    return transactions.filter(t => t.status.toLowerCase() === 'pending').length;
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
  
  // Get user initials for avatar
  const getUserInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    } else if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return "U";
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow pb-6">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <div className="w-1/3">
              <Input
                type="text"
                placeholder="Search users, products, transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{users?.length || 0}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{products?.length || 0}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${getTotalTransactionValue().toFixed(2)}</div>
                <div className="text-sm text-neutral-500">{transactions?.length || 0} total</div>
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Platform Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${getTotalFees().toFixed(2)}</div>
                <div className="text-sm text-neutral-500">From transaction fees</div>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>
            
            {/* Users Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    View and manage all registered users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingUsers ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : filteredUsers && filteredUsers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Balance</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="flex items-center">
                                  <Avatar className="h-8 w-8 mr-2">
                                    <AvatarImage src={user.avatar} />
                                    <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium">
                                      {user.firstName && user.lastName 
                                        ? `${user.firstName} ${user.lastName}`
                                        : user.username}
                                    </div>
                                    <div className="text-sm text-neutral-500">@{user.username}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{user.email || "—"}</TableCell>
                              <TableCell>{user.location || "—"}</TableCell>
                              <TableCell>${user.balance.toFixed(2)}</TableCell>
                              <TableCell>{formatDate(user.createdAt)}</TableCell>
                              <TableCell>
                                {user.isAdmin ? (
                                  <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                                    Admin
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">User</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setIsEditUserModalOpen(true);
                                    }}
                                  >
                                    <Icon icon="ri-edit-line mr-1" />
                                    Edit
                                  </Button>
                                  <Button 
                                    variant={user.isAdmin ? "destructive" : "default"}
                                    size="sm"
                                    onClick={() => handleToggleAdmin(user)}
                                  >
                                    {user.isAdmin ? (
                                      <>
                                        <Icon icon="ri-user-line mr-1" />
                                        Remove Admin
                                      </>
                                    ) : (
                                      <>
                                        <Icon icon="ri-admin-line mr-1" />
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
                  ) : (
                    <div className="text-center p-6 text-neutral-500">
                      <Icon icon="ri-user-search-line text-3xl mb-2" />
                      <p>No users found matching your search</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Products Tab */}
            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle>Product Management</CardTitle>
                  <CardDescription>
                    Review and moderate all listed products
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingProducts ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : filteredProducts && filteredProducts.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Seller</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Listed On</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProducts.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell>
                                <div className="flex items-center">
                                  <img 
                                    src={product.images[0]} 
                                    alt={product.title}
                                    className="h-10 w-10 rounded-md object-cover mr-3"
                                  />
                                  <div className="font-medium">{product.title}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {product.seller?.username || `User #${product.sellerId}`}
                              </TableCell>
                              <TableCell>
                                {product.price ? `$${product.price.toFixed(2)}` : "Trade Only"}
                              </TableCell>
                              <TableCell>
                                {product.allowBuy && product.allowTrade ? "Buy or Trade" : 
                                  product.allowBuy ? "Buy Only" : "Trade Only"}
                              </TableCell>
                              <TableCell>{formatDate(product.createdAt)}</TableCell>
                              <TableCell>
                                <Badge 
                                  className={`capitalize ${
                                    product.status === 'active' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-neutral-100 text-neutral-800'
                                  }`}
                                >
                                  {product.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedProduct(product);
                                      setIsEditProductModalOpen(true);
                                    }}
                                  >
                                    <Icon icon="ri-edit-line mr-1" />
                                    Edit
                                  </Button>
                                  
                                  {product.status === 'active' ? (
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => handleProductStatusChange(product, 'inactive')}
                                    >
                                      <Icon icon="ri-delete-bin-line mr-1" />
                                      Disable
                                    </Button>
                                  ) : (
                                    <Button 
                                      variant="default" 
                                      size="sm"
                                      onClick={() => handleProductStatusChange(product, 'active')}
                                    >
                                      <Icon icon="ri-check-line mr-1" />
                                      Activate
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center p-6 text-neutral-500">
                      <Icon icon="ri-archive-line text-3xl mb-2" />
                      <p>No products found matching your search</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Transactions Tab */}
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Management</CardTitle>
                  <CardDescription>
                    Review and manage all platform transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-neutral-50">
                      <CardContent className="pt-6">
                        <div className="text-lg font-medium mb-2">Pending Transactions</div>
                        <div className="text-2xl font-bold">{getPendingTransactionsCount()}</div>
                        <div className="text-sm text-neutral-500">Need action</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-neutral-50">
                      <CardContent className="pt-6">
                        <div className="text-lg font-medium mb-2">Platform Fees (Total)</div>
                        <div className="text-2xl font-bold">${getTotalFees().toFixed(2)}</div>
                        <div className="text-sm text-neutral-500">Revenue</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-neutral-50">
                      <CardContent className="pt-6">
                        <div className="text-lg font-medium mb-2">Average Fee</div>
                        <div className="text-2xl font-bold">
                          {transactions && transactions.length > 0
                            ? `${((getTotalFees() / getTotalTransactionValue()) * 100).toFixed(1)}%`
                            : "0%"}
                        </div>
                        <div className="text-sm text-neutral-500">Of transaction value</div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {isLoadingTransactions ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : filteredTransactions && filteredTransactions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Transaction ID</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Buyer</TableHead>
                            <TableHead>Seller</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Fee</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTransactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell className="font-medium">
                                #{transaction.transactionId}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  {transaction.product?.images && (
                                    <img 
                                      src={transaction.product.images[0]} 
                                      alt={transaction.product?.title}
                                      className="h-8 w-8 rounded-md object-cover mr-2"
                                    />
                                  )}
                                  <span className="truncate max-w-[150px]">
                                    {transaction.product?.title || `Product #${transaction.productId}`}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {transaction.buyer?.username || `User #${transaction.buyerId}`}
                              </TableCell>
                              <TableCell>
                                {transaction.seller?.username || `User #${transaction.sellerId}`}
                              </TableCell>
                              <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                              <TableCell>${transaction.platformFee.toFixed(2)}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(transaction.status)}`}>
                                  {transaction.status}
                                </span>
                              </TableCell>
                              <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                              <TableCell>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedTransaction(transaction)}
                                >
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center p-6 text-neutral-500">
                      <Icon icon="ri-exchange-dollar-line text-3xl mb-2" />
                      <p>No transactions found matching your search</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
      
      {/* Edit User Modal */}
      <Dialog open={isEditUserModalOpen} onOpenChange={setIsEditUserModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatar} />
                  <AvatarFallback>{getUserInitials(selectedUser)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedUser.firstName && selectedUser.lastName 
                      ? `${selectedUser.firstName} ${selectedUser.lastName}`
                      : selectedUser.username}
                  </h3>
                  <p className="text-sm text-neutral-500">@{selectedUser.username}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    defaultValue={selectedUser.firstName || ""} 
                    placeholder="First Name" 
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    defaultValue={selectedUser.lastName || ""} 
                    placeholder="Last Name" 
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  defaultValue={selectedUser.email || ""} 
                  placeholder="Email" 
                />
              </div>
              
              <div>
                <Label htmlFor="location">Location</Label>
                <Input 
                  id="location" 
                  defaultValue={selectedUser.location || ""} 
                  placeholder="Location" 
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="isAdmin" 
                  checked={selectedUser.isAdmin} 
                  onChange={() => {}} 
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="isAdmin">Admin Privileges</Label>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Product Modal */}
      <Dialog open={isEditProductModalOpen} onOpenChange={setIsEditProductModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product information
            </DialogDescription>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="title">Title</Label>
                  <Input 
                    id="title" 
                    defaultValue={selectedProduct.title} 
                    placeholder="Product Title" 
                  />
                </div>
                
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    defaultValue={selectedProduct.price?.toString() || ""} 
                    placeholder="Price" 
                  />
                </div>
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select defaultValue={selectedProduct.status}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea 
                  id="description" 
                  rows={4}
                  defaultValue={selectedProduct.description} 
                  placeholder="Product Description" 
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors"
                />
              </div>
              
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="allowBuy" 
                    checked={selectedProduct.allowBuy} 
                    onChange={() => {}} 
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="allowBuy">Allow Purchase</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="allowTrade" 
                    checked={selectedProduct.allowTrade} 
                    onChange={() => {}} 
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="allowTrade">Allow Trade</Label>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditProductModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (!selectedProduct) return;
              
              updateProductMutation.mutate({
                id: selectedProduct.id,
                updates: { status: selectedProduct.status === 'active' ? 'inactive' : 'active' }
              });
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
}
