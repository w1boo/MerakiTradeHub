import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Product, ProductCategory } from "@/types";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNav from "@/components/layout/mobile-nav";
import ProductCard from "@/components/marketplace/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/theme";

export default function CategoryPage() {
  const params = useParams<{ id: string }>();
  const categoryId = parseInt(params.id);
  
  // Fetch category details
  const {
    data: category,
    isLoading: isLoadingCategory,
    error: categoryError,
  } = useQuery<ProductCategory>({
    queryKey: [`/api/categories/${categoryId}`],
    enabled: !!params.id,
  });
  
  // Fetch products by category
  const {
    data: products,
    isLoading: isLoadingProducts,
    error: productsError,
  } = useQuery<Product[]>({
    queryKey: [`/api/products/category/${categoryId}`],
    enabled: !!params.id,
  });
  
  // Fetch all categories for the header
  const { data: categories } = useQuery<ProductCategory[]>({
    queryKey: ["/api/categories"],
  });
  
  // Loading state
  const isLoading = isLoadingCategory || isLoadingProducts;
  // Error state
  const hasError = categoryError || productsError;
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow pb-24 md:pb-0">
        <div className="container mx-auto px-4 py-6">
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-10 w-1/4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <Skeleton className="h-48 w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-8 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : hasError ? (
            <div className="bg-red-50 text-red-500 p-8 rounded-lg text-center">
              <h2 className="text-2xl font-semibold mb-2">Error Loading Category</h2>
              <p>We couldn't load this category. Please try again later.</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-6">
                {category?.name || 'All Products'}
              </h1>
              
              {products && products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                    <Icon icon="ri-shopping-bag-line text-3xl text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">No products found</h2>
                  <p className="text-neutral-600 max-w-md mb-6">There are no products in this category yet.</p>
                  <Button asChild>
                    <Link href="/">View all products</Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      
      <Footer />
      <MobileNav />
    </div>
  );
}