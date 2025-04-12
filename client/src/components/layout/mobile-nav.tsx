import { useLocation, Link } from "wouter";
import { Icon } from "@/components/ui/theme";

export default function MobileNav() {
  const [location] = useLocation();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 px-4 py-2 flex justify-around z-40">
      <Link href="/" className="flex flex-col items-center p-2">
        <Icon 
          icon={`ri-home-4-line text-xl ${location === '/' ? 'text-primary' : 'text-neutral-600'}`} 
        />
        <span className="text-xs mt-1">Home</span>
      </Link>
      
      <Link href="/trade-offers" className="flex flex-col items-center p-2">
        <Icon 
          icon={`ri-exchange-line text-xl ${location === '/trade-offers' ? 'text-primary' : 'text-neutral-600'}`} 
        />
        <span className="text-xs mt-1">Trades</span>
      </Link>
      
      <Link href="/listing/new" className="flex flex-col items-center p-2">
        <div className="bg-accent rounded-full w-12 h-12 flex items-center justify-center -mt-5">
          <Icon icon="ri-add-line text-xl text-white" />
        </div>
        <span className="text-xs mt-1">Sell</span>
      </Link>
      
      <Link href="/messages" className="flex flex-col items-center p-2">
        <Icon 
          icon={`ri-message-3-line text-xl ${location.startsWith('/messages') ? 'text-primary' : 'text-neutral-600'}`} 
        />
        <span className="text-xs mt-1">Messages</span>
      </Link>
      
      <Link href="/profile" className="flex flex-col items-center p-2">
        <Icon 
          icon={`ri-user-line text-xl ${location.startsWith('/profile') ? 'text-primary' : 'text-neutral-600'}`} 
        />
        <span className="text-xs mt-1">Profile</span>
      </Link>
    </div>
  );
}
