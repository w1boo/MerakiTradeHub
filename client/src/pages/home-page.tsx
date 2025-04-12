import { useEffect } from "react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import AccountSummary from "@/components/profile/account-summary";
import ProductCard from "@/components/marketplace/product-card";
import CategoryCard from "@/components/marketplace/category-card";
import TransactionTable from "@/components/marketplace/transaction-table";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Product, ProductCategory } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  // Fetch featured products
  const { 
    data: products, 
    isLoading: isLoadingProducts,
    error: productsError
  } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Fetch categories
  const { 
    data: categories,
    isLoading: isLoadingCategories,
    error: categoriesError 
  } = useQuery<ProductCategory[]>({
    queryKey: ["/api/categories"],
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow pb-24 md:pb-0">
        <div className="container mx-auto px-4 py-6">
          {/* Account Summary */}
          <AccountSummary />
          
          {/* Featured Items Section */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl md:text-2xl font-semibold">Featured Items</h2>
              <Link href="/products" className="text-primary font-medium hover:underline flex items-center">
                <span>View All</span>
                <i className="ri-arrow-right-s-line ml-1"></i>
              </Link>
            </div>
            
            {isLoadingProducts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <Skeleton className="w-full h-48" />
                    <div className="p-4">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-3" />
                      <div className="flex space-x-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : productsError ? (
              <div className="bg-red-50 text-red-500 p-4 rounded-lg">
                Error loading products. Please try again.
              </div>
            ) : products && products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <i className="ri-store-3-line text-4xl text-neutral-400 mb-2"></i>
                <h3 className="text-lg font-medium mb-1">No products yet</h3>
                <p className="text-neutral-500 mb-4">Be the first to list an item for sale or trade!</p>
                <Link href="/listing/new">
                  <button className="bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded-lg">
                    List an Item
                  </button>
                </Link>
              </div>
            )}
          </div>
          
          {/* Recent Transactions Section */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl md:text-2xl font-semibold">Recent Transactions</h2>
              <Link href="/transactions" className="text-primary font-medium hover:underline flex items-center">
                <span>View All</span>
                <i className="ri-arrow-right-s-line ml-1"></i>
              </Link>
            </div>
            
            <TransactionTable limit={3} />
          </div>
          
          {/* Categories Section */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl md:text-2xl font-semibold">Browse Categories</h2>
            </div>
            
            {isLoadingCategories ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm p-4 flex flex-col items-center">
                    <Skeleton className="w-12 h-12 rounded-full mb-3" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : categoriesError ? (
              <div className="bg-red-50 text-red-500 p-4 rounded-lg">
                Error loading categories. Please try again.
              </div>
            ) : categories && categories.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {categories.map((category) => (
                  <CategoryCard key={category.id} category={category} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-neutral-500">No categories available</p>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}
