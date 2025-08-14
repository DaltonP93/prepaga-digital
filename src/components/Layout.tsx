
import { useSimpleAuthContext } from '@/components/SimpleAuthProvider';
import { Loader2 } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  title: string;  
  description?: string;
}

export function Layout({ children, title, description }: LayoutProps) {
  const { profile, loading } = useSimpleAuthContext();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
