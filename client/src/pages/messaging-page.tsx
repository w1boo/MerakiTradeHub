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
          
          {/* Direct Trade Notice Banner */}
          <div className="mb-6 p-4 border border-green-200 bg-green-50 rounded-lg shadow-sm">
            <div className="flex gap-3">
              <div className="hidden sm:block">
                <div className="p-2 bg-green-100 text-green-700 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-green-800">New Direct Trade Feature!</h3>
                <p className="text-green-700">Skip the messaging system and trade directly by product ID.</p>
                <div className="mt-3">
                  <a 
                    href="/direct-trade-accept" 
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-600 text-white hover:bg-green-700 h-9 px-4 py-2"
                  >
                    Try Direct Trade
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <ChatInterface conversationId={conversationId} />
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}
