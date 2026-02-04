interface LayoutProps {
  children: React.ReactNode;
  title: string;  
  description?: string;
}

// Layout no verifica loading - SimpleProtectedRoute ya lo hace
export function Layout({ children, title, description }: LayoutProps) {
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
