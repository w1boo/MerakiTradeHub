import { ProductCategory } from "@/types";
import { Link } from "wouter";
import { Icon } from "@/components/ui/theme";

interface CategoryCardProps {
  category: ProductCategory;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  // Generate color class based on category color
  const getColorClass = () => {
    switch (category.color) {
      case "primary":
        return "bg-primary/10";
      case "secondary":
        return "bg-secondary/10";
      case "accent":
        return "bg-accent/10";
      default:
        return "bg-primary/10";
    }
  };

  // Generate icon color class
  const getIconColorClass = () => {
    switch (category.color) {
      case "primary":
        return "text-primary";
      case "secondary":
        return "text-secondary";
      case "accent":
        return "text-accent";
      default:
        return "text-primary";
    }
  };

  return (
    <Link href={`/categories/${category.id}`}>
      <div className="bg-white rounded-lg shadow-sm p-4 flex flex-col items-center transition-all hover:shadow-md hover:-translate-y-1 cursor-pointer">
        <div className={`w-12 h-12 rounded-full ${getColorClass()} flex items-center justify-center mb-3`}>
          <Icon icon={`${category.icon} text-xl ${getIconColorClass()}`} />
        </div>
        <span className="text-center font-medium">{category.name}</span>
      </div>
    </Link>
  );
}
