import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/theme";
import { useState } from "react";
import { AddFundsModal } from "@/components/transactions/add-funds-modal";

export default function AccountSummary() {
  const { user } = useAuth();
  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <Card className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div 
              className="bg-neutral-100 rounded-lg p-4 flex items-center cursor-pointer"
              onClick={() => setIsAddFundsModalOpen(true)}
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                <Icon icon="ri-wallet-3-line text-xl text-primary" />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Account Balance</p>
                <p className="text-lg font-semibold">{user.balance.toLocaleString('vi-VN')} ₫</p>
              </div>
            </div>
            
            <div className="bg-neutral-100 rounded-lg p-4 flex items-center">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mr-3">
                <Icon icon="ri-exchange-dollar-line text-xl text-secondary" />
              </div>
              <div>
                <p className="text-sm text-neutral-600">Active Escrow</p>
                <p className="text-lg font-semibold">{user.escrowBalance.toLocaleString('vi-VN')} ₫</p>
              </div>
            </div>
            
            <Link href="/profile?tab=listings">
              <div className="bg-neutral-100 rounded-lg p-4 flex items-center cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mr-3">
                  <Icon icon="ri-shopping-bag-line text-xl text-accent" />
                </div>
                <div>
                  <p className="text-sm text-neutral-600">Active Listings</p>
                  <p className="text-lg font-semibold">
                    {/* This would normally be fetched from an API */}
                    {0}
                  </p>
                </div>
              </div>
            </Link>
            
            <Link href="/transactions">
              <div className="bg-neutral-100 rounded-lg p-4 flex items-center cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                  <Icon icon="ri-history-line text-xl text-primary" />
                </div>
                <div>
                  <p className="text-sm text-neutral-600">Transactions</p>
                  <p className="text-lg font-semibold">
                    {/* This would normally be fetched from an API */}
                    {0}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
      
      <AddFundsModal 
        isOpen={isAddFundsModalOpen} 
        onClose={() => setIsAddFundsModalOpen(false)} 
      />
    </>
  );
}
