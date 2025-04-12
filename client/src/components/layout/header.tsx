import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Icon, iconColors } from "@/components/ui/theme";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ProductCategory } from "@/types";
import { useQuery } from "@tanstack/react-query";

export default function Header() {
  const { user, logoutMutation } = useAuth();
  const [mobileSearchVisible, setMobileSearchVisible] = useState(false);
  const [location, navigate] = useLocation();

  const { data: categories } = useQuery<ProductCategory[]>({
    queryKey: ["/api/categories"],
  });

  const handleLogout = () => {
    logoutMutation.mutate();
    navigate("/auth");
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    } else if (user?.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return "MK";
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-primary flex items-center">
            <Icon icon={iconColors.primary} />
            <span>Meraki</span>
          </Link>

          {/* Search - Hidden on mobile */}
          <div className="hidden md:block flex-grow max-w-xl mx-8">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search for items to trade or buy..."
                className="w-full py-2 pl-10 pr-4 rounded-full border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <Icon icon="ri-search-line" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-600" />
            </div>
          </div>

          {/* Navigation Links & User Menu */}
          <div className="flex items-center space-x-1 md:space-x-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden" 
              onClick={() => setMobileSearchVisible(!mobileSearchVisible)}
            >
              <Icon icon="ri-search-line text-lg" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              asChild
              className="relative"
            >
              <Link href="/messages">
                <Icon icon="ri-message-3-line text-lg" />
                <span className="absolute top-0 right-0 w-4 h-4 bg-primary rounded-full text-white text-xs flex items-center justify-center">
                  5
                </span>
              </Link>
            </Button>

            {user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-1 p-2 rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{getUserInitials()}</AvatarFallback>
                      </Avatar>
                      <span className="hidden md:block text-sm font-medium">
                        {user.firstName || user.username}
                      </span>
                      <Icon icon="ri-arrow-down-s-line text-neutral-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/profile">My Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile?tab=listings">My Listings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/transactions">Transactions</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {user.isAdmin && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/admin">Admin Dashboard</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button asChild className="hidden md:flex items-center">
                  <Link href="/listing/new">
                    <Icon icon="ri-add-line mr-1" />
                    <span>List Item</span>
                  </Link>
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link href="/auth">Login</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search (Expandable) */}
      {mobileSearchVisible && (
        <div className="md:hidden px-4 pb-3">
          <Input
            type="text"
            placeholder="Search for items to trade or buy..."
            className="w-full py-2 px-4 rounded-full border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      )}

      {/* Categories Navigation */}
      <div className="border-t border-neutral-200 overflow-x-auto scrollbar-hide">
        <div className="container mx-auto px-4">
          <div className="flex space-x-6 py-2 text-sm font-medium text-neutral-600 whitespace-nowrap">
            <Link href="/" className={`py-2 border-b-2 ${location === '/' ? 'border-primary text-primary' : 'border-transparent hover:text-primary hover:border-primary'}`}>
              All Categories
            </Link>
            
            {categories?.map((category) => (
              <Link 
                key={category.id}
                href={`/categories/${category.id}`} 
                className={`py-2 border-b-2 ${location === `/categories/${category.id}` ? 'border-primary text-primary' : 'border-transparent hover:text-primary hover:border-primary'}`}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
