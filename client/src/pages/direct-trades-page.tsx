import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import { DirectTradesList } from "@/components/trade/direct-trades-list";
import { Loader2 } from "lucide-react";

export default function DirectTradesPage() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("sent-offers");

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container max-w-5xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Please Login</h1>
            <p className="text-muted-foreground">
              You must be logged in to view your trade offers.
            </p>
          </div>
        </main>
        <MobileNav />
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Direct Trade Offers</h1>
          <p className="text-muted-foreground mt-2">
            Manage your direct trade offers - both sent and received
          </p>
        </div>

        <Tabs 
          defaultValue="sent-offers" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-2 mb-8">
            <TabsTrigger value="sent-offers">Sent Offers</TabsTrigger>
            <TabsTrigger value="received-offers">Received Offers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sent-offers">
            <h2 className="text-xl font-semibold mb-4">Offers You've Sent</h2>
            <DirectTradesList type="sent" userId={user.id} />
          </TabsContent>
          
          <TabsContent value="received-offers">
            <h2 className="text-xl font-semibold mb-4">Offers You've Received</h2>
            <DirectTradesList type="received" userId={user.id} />
          </TabsContent>
        </Tabs>
      </main>
      <MobileNav />
      <Footer />
    </div>
  );
}