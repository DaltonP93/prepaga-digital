
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface PDFPreviewProps {
  url?: string;
  title?: string;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({ url, title = "PDF Document" }) => {
  if (!url) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No PDF available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <iframe
          src={url}
          className="w-full h-96 border rounded"
          title={title}
        />
      </CardContent>
    </Card>
  );
};
