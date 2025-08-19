
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface PropertyPanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  title,
  children,
  className = ""
}) => {
  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {children}
      </CardContent>
    </Card>
  );
};

interface PropertyFieldProps {
  label: string;
  children: React.ReactNode;
  description?: string;
}

export const PropertyField: React.FC<PropertyFieldProps> = ({
  label,
  children,
  description
}) => {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-gray-600">{label}</Label>
      {children}
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
};
