import { Icon, iconColors } from "@/components/ui/theme";
import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200 pt-10 pb-6 mt-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="text-2xl font-bold text-primary flex items-center mb-4">
              <Icon icon={iconColors.primary} />
              <span>Meraki</span>
            </Link>
            <p className="text-neutral-600 text-sm mb-4">
              A marketplace for trading and buying goods with secure transactions and user-to-user messaging.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-neutral-600 hover:text-primary">
                <Icon icon="ri-facebook-fill text-xl" />
              </a>
              <a href="#" className="text-neutral-600 hover:text-primary">
                <Icon icon="ri-twitter-fill text-xl" />
              </a>
              <a href="#" className="text-neutral-600 hover:text-primary">
                <Icon icon="ri-instagram-line text-xl" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-4">Categories</h3>
            <ul className="space-y-2">
              <li><Link href="/categories/1" className="text-neutral-600 hover:text-primary">Electronics</Link></li>
              <li><Link href="/categories/2" className="text-neutral-600 hover:text-primary">Fashion</Link></li>
              <li><Link href="/categories/3" className="text-neutral-600 hover:text-primary">Home & Garden</Link></li>
              <li><Link href="/categories/4" className="text-neutral-600 hover:text-primary">Sports</Link></li>
              <li><Link href="/categories/5" className="text-neutral-600 hover:text-primary">Collectibles</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-4">Help & Support</h3>
            <ul className="space-y-2">
              <li><Link href="/faq" className="text-neutral-600 hover:text-primary">FAQ</Link></li>
              <li><Link href="/support" className="text-neutral-600 hover:text-primary">Contact Support</Link></li>
              <li><Link href="/how-it-works" className="text-neutral-600 hover:text-primary">How It Works</Link></li>
              <li><Link href="/escrow-protection" className="text-neutral-600 hover:text-primary">Escrow Protection</Link></li>
              <li><Link href="/fees" className="text-neutral-600 hover:text-primary">Fee Structure</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><Link href="/terms" className="text-neutral-600 hover:text-primary">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-neutral-600 hover:text-primary">Privacy Policy</Link></li>
              <li><Link href="/refund-policy" className="text-neutral-600 hover:text-primary">Refund Policy</Link></li>
              <li><Link href="/cookies" className="text-neutral-600 hover:text-primary">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-neutral-200 mt-8 pt-6 text-center text-sm text-neutral-600">
          <p>&copy; {new Date().getFullYear()} Meraki Marketplace. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
