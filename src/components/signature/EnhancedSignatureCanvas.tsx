
import React, { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw, Check, Undo, Download, Smartphone } from "lucide-react";

interface EnhancedSignatureCanvasProps {
  onSignatureChange?: (signatureData: string | null) => void;
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  showDownload?: boolean;
}

export const EnhancedSignatureCanvas: React.FC<EnhancedSignatureCanvasProps> = ({
  onSignatureChange,
  width = 500,
  height = 200,
  strokeColor = "#000000",
  strokeWidth = 2.5,
  showDownload = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [actualWidth, setActualWidth] = useState(width);

  // Responsive canvas sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32; // padding
        setActualWidth(Math.min(width, containerWidth));
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [width]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High DPI support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = actualWidth * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${actualWidth}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Configure drawing style
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Fill background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, actualWidth, height);

    // Draw signature line
    ctx.strokeStyle = "#e5e5e5";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, height - 40);
    ctx.lineTo(actualWidth - 20, height - 40);
    ctx.stroke();

    // Reset stroke style for drawing
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
  }, [actualWidth, height, strokeColor, strokeWidth]);

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev.slice(-10), imageData]); // Keep last 10 states
  }, []);

  const getCoordinates = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    saveState();
    setIsDrawing(true);
    setIsEmpty(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getCoordinates(e);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getCoordinates(e);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Export signature data
    const signatureData = canvas.toDataURL("image/png");
    onSignatureChange?.(signatureData);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and redraw background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, actualWidth, height);

    // Redraw signature line
    ctx.strokeStyle = "#e5e5e5";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, height - 40);
    ctx.lineTo(actualWidth - 20, height - 40);
    ctx.stroke();

    // Reset stroke style
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;

    setIsEmpty(true);
    setHistory([]);
    onSignatureChange?.(null);
  };

  const undo = () => {
    if (history.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newHistory = [...history];
    const previousState = newHistory.pop();
    
    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
      setHistory(newHistory);

      const signatureData = canvas.toDataURL("image/png");
      onSignatureChange?.(signatureData);
    }
  };

  const downloadSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;

    const link = document.createElement('a');
    link.download = `firma-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Check className="h-5 w-5" />
          Firma Digital
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div ref={containerRef} className="w-full">
          <div className="border-2 border-dashed border-border rounded-lg p-2 bg-white">
            <canvas
              ref={canvasRef}
              className="border border-border rounded cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={history.length === 0}
          >
            <Undo className="h-4 w-4 mr-2" />
            Deshacer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearSignature}
            disabled={isEmpty}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
          {showDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSignature}
              disabled={isEmpty}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
          )}
        </div>

        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Smartphone className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            Dibuja tu firma con el dedo (móvil) o mouse (PC). 
            La firma se guardará automáticamente.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
