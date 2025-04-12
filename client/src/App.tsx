import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ProductDetailPage from "@/pages/product-detail-page";
import MessagingPage from "@/pages/messaging-page";
import ProfilePage from "@/pages/profile-page";
import ListingFormPage from "@/pages/listing-form-page";
import TransactionsPage from "@/pages/transactions-page";
import TradeOffersPage from "@/pages/trade-offers-page";
import AdminPage from "@/pages/admin-page";
import CategoryPage from "@/pages/category-page";
import AcceptTradeHandler from "@/pages/accept-trade-handler";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute, AdminRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/products/:id" component={ProductDetailPage} />
      <ProtectedRoute path="/categories/:id" component={CategoryPage} />
      <ProtectedRoute path="/messages" component={MessagingPage} />
      <ProtectedRoute path="/messages/:id" component={MessagingPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/listing/new" component={ListingFormPage} />
      <ProtectedRoute path="/listing/edit/:id" component={ListingFormPage} />
      <ProtectedRoute path="/transactions" component={TransactionsPage} />
      <ProtectedRoute path="/trade-offers" component={TradeOffersPage} />
      <ProtectedRoute path="/accept-trade-handler" component={AcceptTradeHandler} />
      <AdminRoute path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
