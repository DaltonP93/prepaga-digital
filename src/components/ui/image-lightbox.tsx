import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ZoomIn, ZoomOut, Download, Maximize2, Minimize2 } from 'lucide-react';

interface ImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt?: string;
  fileName?: string;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  open,
  onOpenChange,
  src,
  alt = 'Imagen',
  fileName,
}) => {
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25));
  const toggleFullscreen = () => setFullscreen((f) => !f);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setZoom(1);
      setFullscreen(false);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`p-0 border-none bg-black/90 ${
          fullscreen ? 'max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] rounded-none' : 'max-w-[90vw] max-h-[90vh]'
        }`}
      >
        {/* Toolbar */}
        <div className="absolute top-2 right-2 z-50 flex items-center gap-1 bg-background/80 rounded-lg p-1 backdrop-blur-sm">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Image */}
        <div className="flex items-center justify-center overflow-auto w-full h-full min-h-[300px] p-4">
          <img
            src={src}
            alt={alt}
            style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease' }}
            className="max-w-full max-h-[80vh] object-contain cursor-grab"
          />
        </div>

        {/* File name */}
        {fileName && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 rounded px-3 py-1 backdrop-blur-sm">
            <span className="text-xs text-muted-foreground">{fileName}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
