import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComparisonKpiCardProps {
  title: string;
  value: string;
  previousValue?: string;
  delta?: number; // percentage change
  description: string;
  icon: React.ReactNode;
  visible?: boolean;
}

export const ComparisonKpiCard: React.FC<ComparisonKpiCardProps> = ({
  title,
  value,
  previousValue,
  delta,
  description,
  icon,
  visible = true,
}) => {
  if (!visible) return null;

  const showDelta = delta !== undefined && delta !== null;
  const isPositive = (delta ?? 0) > 0;
  const isNeutral = delta === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {showDelta ? (
          <div className="flex items-center gap-1.5 mt-1">
            {isNeutral ? (
              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
            ) : isPositive ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            )}
            <span
              className={cn(
                'text-xs font-medium',
                isNeutral && 'text-muted-foreground',
                isPositive && 'text-emerald-500',
                !isPositive && !isNeutral && 'text-red-500'
              )}
            >
              {isPositive ? '+' : ''}{delta}%
            </span>
            {previousValue && (
              <span className="text-xs text-muted-foreground">
                (ant: {previousValue})
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};
