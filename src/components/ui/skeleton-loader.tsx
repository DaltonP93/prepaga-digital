
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'rectangular',
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-muted",
        {
          'animate-pulse': animation === 'pulse',
          'animate-wave': animation === 'wave',
          'rounded-full': variant === 'circular',
          'rounded-md': variant === 'rounded' || variant === 'rectangular',
          'h-4': variant === 'text',
        },
        className
      )}
      {...props}
    />
  );
}

// Componentes de skeleton específicos
export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-4">
    {/* Header */}
    <div className="flex space-x-4 pb-2 border-b">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-6 w-28" />
      <Skeleton className="h-6 w-20" />
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="flex space-x-4 py-2">
        <Skeleton className="h-12 w-32" />
        <Skeleton className="h-12 w-24" />
        <Skeleton className="h-12 w-28" />
        <Skeleton className="h-12 w-20" />
      </div>
    ))}
  </div>
);

export const CardSkeleton = () => (
  <div className="p-6 space-y-4 border rounded-lg">
    <div className="flex items-center space-x-4">
      <Skeleton variant="circular" className="h-12 w-12" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
    <div className="flex space-x-2 pt-4">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-16" />
    </div>
  </div>
);

export const FormSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-24 w-full" />
    </div>
    <div className="flex space-x-4">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-20" />
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Stats cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-20" />
            <Skeleton variant="circular" className="h-8 w-8" />
          </div>
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
    
    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="p-6 border rounded-lg space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
      <div className="p-6 border rounded-lg space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  </div>
);

export const DocumentListSkeleton = () => (
  <div className="space-y-4">
    {/* Filters */}
    <div className="flex space-x-4 mb-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-10 w-24" />
    </div>
    
    {/* Document cards */}
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="p-4 border rounded-lg">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Skeleton variant="circular" className="h-10 w-10" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    ))}
  </div>
);
