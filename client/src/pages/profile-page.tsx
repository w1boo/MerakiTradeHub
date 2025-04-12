import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import AccountSummary from "@/components/profile/account-summary";
import ProductCard from "@/components/marketplace/product-card";
import { Product, Deposit, Withdrawal } from "@/types";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Icon } from "@/components/ui/theme";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddFundsModal } from "@/components/transactions/add-funds-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Form schema for withdrawal
const withdrawalSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.string().min(1, "Please select a withdrawal method"),
});

type WithdrawalFormValues = z.infer<typeof withdrawalSchema>;

// Form schema for profile update
const profileUpdateSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  location: z.string().optional(),
});

type ProfileUpdateFormValues = z.infer<typeof profileUpdateSchema>;

export default function ProfilePage() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [isAddFundsModalOpen, setAddFundsModalOpen] = useState(false);
  const [isWithdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [isEditProfileModalOpen, setEditProfileModalOpen] = useState(false);

  // Parse URL query for initial tab selection
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [location]);

  // Fetch user's products
  const { 
    data: userProducts, 
    isLoading: isLoadingProducts,
    error: productsError
  } = useQuery({
    queryKey: ["/api/products/user", user?.id], // Updated query key
    enabled: !!user,
  });

  // Fetch user's financial history
  const { 
    data: deposits,
    isLoading: isLoadingDeposits
  } = useQuery<Deposit[]>({
    queryKey: ["/api/deposits"],
    enabled: !!user && activeTab === "finances",
  });

  const { 
    data: withdrawals,
    isLoading: isLoadingWithdrawals
  } = useQuery<Withdrawal[]>({
    queryKey: ["/api/withdrawals"],
    enabled: !!user && activeTab === "finances",
  });

  // Setup withdrawal form
  const withdrawalForm = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: 0,
      method: "bankTransfer",
    },
  });

  // Setup profile update form
  const profileUpdateForm = useForm<ProfileUpdateFormValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      location: user?.location || "",
    },
    values: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      location: user?.location || "",
    },
  });

  // Withdrawal mutation
  const withdrawalMutation = useMutation({
    mutationFn: async (data: WithdrawalFormValues) => {
      const res = await apiRequest("POST", "/api/withdrawals", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Withdrawal requested",
        description: "Your withdrawal has been submitted for processing.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
      setWithdrawModalOpen(false);
      withdrawalForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Withdrawal failed",
        description: error.message || "Could not process your withdrawal. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Profile update mutation
  const profileUpdateMutation = useMutation({
    mutationFn: async (data: ProfileUpdateFormValues) => {
      const res = await apiRequest("PUT", "/api/user", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setEditProfileModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "Could not update your profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle withdrawal submission
  const onWithdrawalSubmit = (data: WithdrawalFormValues) => {
    if (!user) return;

    // Check if amount is <= user balance
    if (data.amount > user.balance) {
      toast({
        title: "Insufficient balance",
        description: "Withdrawal amount exceeds your available balance.",
        variant: "destructive",
      });
      return;
    }

    withdrawalMutation.mutate(data);
  };

  // Handle profile update submission
  const onProfileUpdateSubmit = (data: ProfileUpdateFormValues) => {
    profileUpdateMutation.mutate(data);
  };

  // Format date helper
  const formatDate = (date: Date) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return "";

    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    } else if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return "";
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-grow pb-24 md:pb-0">
        <div className="container mx-auto px-4 py-6">
          {/* Account Summary */}
          <AccountSummary />

          {/* Profile Information and Tabs */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            <div className="p-6 flex flex-col md:flex-row items-center md:items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-xl">{getUserInitials()}</AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user?.username}
                </h1>
                {user?.username && (user?.firstName || user?.lastName) && (
                  <p className="text-neutral-600 mb-1">@{user.username}</p>
                )}
                {user?.email && (
                  <p className="text-neutral-600 mb-1">
                    <Icon icon="ri-mail-line mr-1" />
                    {user.email}
                  </p>
                )}
                {user?.location && (
                  <p className="text-neutral-600 mb-3">
                    <Icon icon="ri-map-pin-line mr-1" />
                    {user.location}
                  </p>
                )}
                <Button variant="outline" size="sm" onClick={() => setEditProfileModalOpen(true)}>
                  <Icon icon="ri-edit-line mr-1" />
                  Edit Profile
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex border-b border-neutral-200 px-6">
                <TabsTrigger value="profile" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                  Profile
                </TabsTrigger>
                <TabsTrigger value="finances" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                  Financial History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="p-6">
                <div className="max-w-2xl">
                  <h2 className="text-xl font-semibold mb-4">About Me</h2>
                  <p className="text-neutral-600 mb-6">
                    {user?.firstName && user?.lastName 
                      ? `Hi, I'm ${user.firstName} ${user.lastName}.` 
                      : `Hi, I'm ${user?.username}.`} Welcome to my Meraki profile!
                  </p>

                  <h2 className="text-xl font-semibold mb-4">Activity</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center">
                          <Icon icon="ri-shopping-bag-line text-xl text-primary mr-2" />
                          Products Listed
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">{Array.isArray(userProducts) ? userProducts.length : 0}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center">
                          <Icon icon="ri-exchange-dollar-line text-xl text-secondary mr-2" />
                          Transactions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">0</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center">
                          <Icon icon="ri-star-line text-xl text-accent mr-2" />
                          Rating
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">--</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>


              <TabsContent value="finances" className="p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Account Balance</h2>
                    <div className="space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setWithdrawModalOpen(true)}
                        disabled={!user || user.balance <= 0}
                      >
                        <Icon icon="ri-bank-card-line mr-1" />
                        Withdraw
                      </Button>
                      <Button onClick={() => setAddFundsModalOpen(true)}>
                        <Icon icon="ri-add-line mr-1" />
                        Add Funds
                      </Button>
                    </div>
                  </div>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between">
                        <div className="mb-4 md:mb-0">
                          <p className="text-neutral-600">Available Balance</p>
                          <p className="text-3xl font-bold">{user?.balance.toLocaleString('vi-VN')} ₫</p>
                        </div>
                        <div className="mb-4 md:mb-0">
                          <p className="text-neutral-600">In Escrow</p>
                          <p className="text-3xl font-bold">{user?.escrowBalance.toLocaleString('vi-VN')} ₫</p>
                        </div>
                        <div>
                          <p className="text-neutral-600">Total</p>
                          <p className="text-3xl font-bold">
                            {(user ? user.balance + user.escrowBalance : 0).toLocaleString('vi-VN')} ₫
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="deposits" className="mt-8">
                  <TabsList>
                    <TabsTrigger value="deposits">Deposits</TabsTrigger>
                    <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                  </TabsList>

                  <TabsContent value="deposits" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Deposit History</CardTitle>
                        <CardDescription>
                          Record of all funds added to your account
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoadingDeposits ? (
                          <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                              <Skeleton key={i} className="h-12 w-full" />
                            ))}
                          </div>
                        ) : deposits && deposits.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {deposits.map((deposit) => (
                                <TableRow key={deposit.id}>
                                  <TableCell>{formatDate(deposit.createdAt)}</TableCell>
                                  <TableCell className="capitalize">{deposit.method}</TableCell>
                                  <TableCell>{deposit.amount.toLocaleString('vi-VN')} ₫</TableCell>
                                  <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      deposit.status === 'completed' 
                                        ? 'bg-green-100 text-green-700' 
                                        : deposit.status === 'pending'
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-red-100 text-red-700'
                                    }`}>
                                      {deposit.status}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center p-6 text-neutral-500">
                            <Icon icon="ri-money-dollar-circle-line text-4xl mb-2" />
                            <p>No deposit history found</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="withdrawals" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Withdrawal History</CardTitle>
                        <CardDescription>
                          Record of all funds withdrawn from your account
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoadingWithdrawals ? (
                          <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                              <Skeleton key={i} className="h-12 w-full" />
                            ))}
                          </div>
                        ) : withdrawals && withdrawals.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {withdrawals.map((withdrawal) => (
                                <TableRow key={withdrawal.id}>
                                  <TableCell>{formatDate(withdrawal.createdAt)}</TableCell>
                                  <TableCell className="capitalize">{withdrawal.method}</TableCell>
                                  <TableCell>{withdrawal.amount.toLocaleString('vi-VN')} ₫</TableCell>
                                  <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      withdrawal.status === 'completed' 
                                        ? 'bg-green-100 text-green-700' 
                                        : withdrawal.status === 'pending'
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-red-100 text-red-700'
                                    }`}>
                                      {withdrawal.status}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center p-6 text-neutral-500">
                            <Icon icon="ri-bank-line text-4xl mb-2" />
                            <p>No withdrawal history found</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="settings" className="p-6">
                <div className="max-w-2xl">
                  <h2 className="text-xl font-semibold mb-4">Account Settings</h2>

                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Notification Preferences</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email-notifications">Email notifications</Label>
                          <input 
                            type="checkbox" 
                            id="email-notifications" 
                            className="toggle toggle-primary" 
                            defaultChecked
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="message-notifications">Message notifications</Label>
                          <input 
                            type="checkbox" 
                            id="message-notifications" 
                            className="toggle toggle-primary" 
                            defaultChecked
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="transaction-notifications">Transaction updates</Label>
                          <input 
                            type="checkbox" 
                            id="transaction-notifications" 
                            className="toggle toggle-primary" 
                            defaultChecked
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="marketing-notifications">Marketing emails</Label>
                          <input 
                            type="checkbox" 
                            id="marketing-notifications" 
                            className="toggle toggle-primary" 
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Privacy Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="profile-visibility">Profile visibility</Label>
                          <select id="profile-visibility" className="border rounded p-2">
                            <option value="public">Public</option>
                            <option value="registered">Registered users only</option>
                            <option value="private">Private</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="show-location">Show location on profile</Label>
                          <input 
                            type="checkbox" 
                            id="show-location" 
                            className="toggle toggle-primary" 
                            defaultChecked
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-600">Danger Zone</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-neutral-600 mb-4">
                        These actions are irreversible. Please proceed with caution.
                      </p>
                      <div className="space-y-4">
                        <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                          Delete Account
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
      <MobileNav />

      {/* Add Funds Modal */}
      <AddFundsModal 
        isOpen={isAddFundsModalOpen} 
        onClose={() => setAddFundsModalOpen(false)} 
      />

      {/* Withdraw Funds Modal */}
      <Dialog open={isWithdrawModalOpen} onOpenChange={setWithdrawModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Withdraw funds from your Meraki account to your bank account or other payment method.
            </DialogDescription>
          </DialogHeader>

          <Form {...withdrawalForm}>
            <form onSubmit={withdrawalForm.handleSubmit(onWithdrawalSubmit)} className="space-y-4">
              <FormField
                control={withdrawalForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 font-medium">₫</span>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={user?.balance || 0}
                          className="pl-8"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <p className="text-sm text-neutral-500">
                      Available balance: {user?.balance.toLocaleString('vi-VN') || "0"} ₫
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={withdrawalForm.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Withdrawal Method</FormLabel>
                    <select
                      className="w-full p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      {...field}
                    >
                      <option value="bankTransfer">Bank Transfer</option>
                      <option value="paypal">PayPal</option>
                      <option value="creditCard">Credit Card Refund</option>
                    </select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="p-3 bg-neutral-100 rounded-lg text-neutral-700 text-sm">
                <p>
                  Withdrawals typically take 2-3 business days to process. 
                  There is no fee for standard withdrawals.
                </p>
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setWithdrawModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={withdrawalMutation.isPending}
                >
                  {withdrawalMutation.isPending ? (
                    <>
                      <Icon icon="ri-loader-4-line animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    "Withdraw Funds"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Modal */}
      <Dialog open={isEditProfileModalOpen} onOpenChange={setEditProfileModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information
            </DialogDescription>
          </DialogHeader>

          <Form {...profileUpdateForm}>
            <form onSubmit={profileUpdateForm.handleSubmit(onProfileUpdateSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={profileUpdateForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileUpdateForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={profileUpdateForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileUpdateForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditProfileModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={profileUpdateMutation.isPending}
                >
                  {profileUpdateMutation.isPending ? (
                    <>
                      <Icon icon="ri-loader-4-line animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}