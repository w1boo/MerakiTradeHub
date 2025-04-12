import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/theme";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionText?: string;
  actionLink?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionText,
  actionLink
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-4">
        <Icon icon={`${icon} text-3xl text-primary`} />
      </div>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-neutral-600 max-w-md mb-6">{description}</p>
      
      {actionText && actionLink && (
        <Button asChild>
          <Link href={actionLink}>{actionText}</Link>
        </Button>
      )}
    </div>
  );
}