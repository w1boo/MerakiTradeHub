import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Icon } from "@/components/ui/theme";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

// Register form schema
const registerSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Confirm password is required" }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email({ message: "Invalid email address" }).optional(),
  location: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("login");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      email: "",
      location: "",
    },
  });

  // Handle login submission
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  // Handle register submission
  const onRegisterSubmit = (data: RegisterFormValues) => {
    // Omit confirmPassword from submission
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Auth Forms */}
          <div className="flex flex-col justify-center">
            <div className="mb-8 text-center">
              <div className="text-2xl font-bold text-primary flex items-center justify-center mb-2">
                <Icon icon="ri-exchange-box-fill mr-2 text-accent" />
                <span>Meraki</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Welcome to Meraki Marketplace</h2>
              <p className="text-neutral-600 mt-2">
                Buy, sell, or trade items with secure transactions
              </p>
            </div>

            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab} 
              className="w-full max-w-md mx-auto"
            >
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Create Account</TabsTrigger>
              </TabsList>

              <Card>
                <TabsContent value="login">
                  <CardHeader>
                    <CardTitle>Login to your account</CardTitle>
                    <CardDescription>
                      Enter your credentials to access your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                        <FormField
                          control={loginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="Your username" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel>Password</FormLabel>
                                <a 
                                  href="#" 
                                  className="text-sm text-primary hover:underline"
                                >
                                  Forgot password?
                                </a>
                              </div>
                              <FormControl>
                                <Input type="password" placeholder="Your password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full" 
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? (
                            <>
                              <Icon icon="ri-loader-4-line animate-spin mr-2" />
                              Logging in...
                            </>
                          ) : (
                            "Login"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4">
                    <div className="relative flex items-center w-full">
                      <div className="flex-grow border-t border-neutral-200"></div>
                      <span className="flex-shrink mx-4 text-neutral-600">or continue with</span>
                      <div className="flex-grow border-t border-neutral-200"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full">
                      <Button variant="outline" className="w-full">
                        <Icon icon="ri-google-fill text-xl mr-2" />
                        Google
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Icon icon="ri-facebook-fill text-xl mr-2" />
                        Facebook
                      </Button>
                    </div>
                  </CardFooter>
                </TabsContent>

                <TabsContent value="register">
                  <CardHeader>
                    <CardTitle>Create an account</CardTitle>
                    <CardDescription>
                      Join Meraki to buy, sell, and trade with others
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={registerForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="First name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Last name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="Create a username" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="Your email address" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location</FormLabel>
                              <FormControl>
                                <Input placeholder="Your city" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Create a password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Confirm your password" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? (
                            <>
                              <Icon icon="ri-loader-4-line animate-spin mr-2" />
                              Creating account...
                            </>
                          ) : (
                            "Create Account"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4">
                    <div className="relative flex items-center w-full">
                      <div className="flex-grow border-t border-neutral-200"></div>
                      <span className="flex-shrink mx-4 text-neutral-600">or continue with</span>
                      <div className="flex-grow border-t border-neutral-200"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full">
                      <Button variant="outline" className="w-full">
                        <Icon icon="ri-google-fill text-xl mr-2" />
                        Google
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Icon icon="ri-facebook-fill text-xl mr-2" />
                        Facebook
                      </Button>
                    </div>
                  </CardFooter>
                </TabsContent>
              </Card>
            </Tabs>
          </div>

          {/* Hero Section */}
          <div className="hidden md:flex flex-col justify-center">
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <h1 className="text-4xl font-bold mb-6">Trade or Buy with Confidence</h1>
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2 flex items-center">
                  <Icon icon="ri-shield-check-line text-2xl text-primary mr-2" />
                  Secure Escrow System
                </h3>
                <p className="text-neutral-600 ml-9">
                  Our escrow system ensures safe transactions between users. Money is only released when both parties are satisfied.
                </p>
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2 flex items-center">
                  <Icon icon="ri-message-3-line text-2xl text-accent mr-2" />
                  Seamless Communication
                </h3>
                <p className="text-neutral-600 ml-9">
                  Chat directly with sellers or buyers to negotiate trades and ask questions about items.
                </p>
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2 flex items-center">
                  <Icon icon="ri-exchange-line text-2xl text-secondary mr-2" />
                  Trade or Buy Options
                </h3>
                <p className="text-neutral-600 ml-9">
                  Choose to buy items directly or offer trades with other items. Flexible options for every transaction.
                </p>
              </div>
              <Separator className="my-6" />
              <div className="flex space-x-4 items-center">
                <div className="flex -space-x-4">
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=40&ixid=MnwxfDB8MXxyYW5kb218MHx8cGVyc29ufHx8fHx8MTY5NzI5MzQ4MA&ixlib=rb-4.0.3&q=80&w=40"
                    alt="User"
                    className="w-10 h-10 rounded-full border-2 border-white"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=40&ixid=MnwxfDB8MXxyYW5kb218MHx8cGVyc29ufHx8fHx8MTY5NzI5MzUwMA&ixlib=rb-4.0.3&q=80&w=40"
                    alt="User"
                    className="w-10 h-10 rounded-full border-2 border-white"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=40&ixid=MnwxfDB8MXxyYW5kb218MHx8cGVyc29ufHx8fHx8MTY5NzI5MzUyMw&ixlib=rb-4.0.3&q=80&w=40"
                    alt="User"
                    className="w-10 h-10 rounded-full border-2 border-white"
                  />
                </div>
                <p className="text-sm text-neutral-600">
                  Join thousands of users already trading on our platform
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
