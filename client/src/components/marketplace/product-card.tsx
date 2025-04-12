import { Product } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/theme";
import { Link } from "wouter";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  // Determine the badge type based on product properties
  const getBadgeType = () => {
    if (product.allowBuy && product.allowTrade) return "tradeOrBuy";
    if (product.allowTrade) return "tradeOnly";
    return "buyOnly";
  };

  const badgeText = () => {
    if (product.allowBuy && product.allowTrade) return "Trade or Buy";
    if (product.allowTrade) return "Trade Only";
    return "Buy Only";
  };

  const badgeClass = () => {
    const type = getBadgeType();
    if (type === "tradeOrBuy") return "bg-primary text-white";
    if (type === "tradeOnly") return "bg-accent text-white";
    return "bg-secondary text-white";
  };

  return (
    <Card className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative">
        <Link href={`/products/${product.id}`}>
          <img 
            src={product.images[0]} 
            alt={product.title}
            className="w-full h-48 object-cover cursor-pointer"
          />
        </Link>
        <div className={`absolute top-2 right-2 ${badgeClass()} text-xs font-bold uppercase rounded-full py-1 px-2`}>
          {badgeText()}
        </div>
      </div>
      
      <CardContent className="p-4">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-medium text-lg mb-1 truncate cursor-pointer hover:text-primary transition-colors">
            {product.title}
          </h3>
        </Link>
        
        <div className="flex justify-between items-center mb-3">
          <div>
            {product.price && (
              <>
                <span className="text-black font-semibold">${product.price.toFixed(2)}</span>
                {product.allowTrade && <span className="text-xs text-neutral-600 ml-1">or trade</span>}
              </>
            )}
            {!product.price && product.tradeValue && (
              <span className="text-accent font-semibold">Trade Value: ${product.tradeValue.toFixed(2)}</span>
            )}
          </div>
          
          {product.location && (
            <div className="flex items-center text-neutral-600 text-sm">
              <Icon icon="ri-map-pin-line mr-1" />
              <span>{product.location}</span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <div className="flex space-x-2 w-full">
          {product.allowBuy && (
            <Button className="flex-1 bg-primary hover:bg-primary/90 text-white" asChild>
              <Link href={`/products/${product.id}`}>Buy Now</Link>
            </Button>
          )}
          
          {product.allowTrade && (
            <Button className="flex-1 border border-primary text-primary hover:bg-primary/5" asChild>
              <Link href={`/products/${product.id}?action=trade`}>
                {product.allowBuy ? "Offer Trade" : "Trade"}
              </Link>
            </Button>
          )}
          
          {!product.allowBuy && !product.allowTrade && (
            <Button className="flex-1 border border-primary text-primary hover:bg-primary/5" asChild>
              <Link href={`/messages?product=${product.id}`}>Message</Link>
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
