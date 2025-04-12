import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import ChatInterface from "@/components/messages/chat-interface";
import { useParams } from "wouter";

export default function MessagingPage() {
  // Get conversation ID from URL if present
  const params = useParams<{ id?: string }>();
  const conversationId = params.id ? parseInt(params.id) : undefined;
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow pb-24 md:pb-0">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Messages</h1>
            <p className="text-neutral-600">
              Chat with buyers and sellers about items
            </p>
          </div>
          
          <ChatInterface conversationId={conversationId} />
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}
