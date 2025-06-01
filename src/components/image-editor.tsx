
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ImageEditorProps {
  originalImageDataUri: string | null;
  onScaledPhotoReady: (dataUri: string) => void;
  onMaskChange: (dataUri: string) => void;
  clearSignal?: boolean; // Signal to clear selection
  onClearDone?: () => void; // Callback when clearing is done
  canvasWidth: number;
  canvasHeight: number;
  brushColor?: string; // For visual feedback of selection
  brushSize?: number;
  className?: string;
}

const DEFAULT_BRUSH_COLOR = 'rgba(236, 101, 13, 0.5)'; // Accent color with alpha
const DEFAULT_BRUSH_SIZE = 20;

const ImageEditor: React.FC<ImageEditorProps> = ({
  originalImageDataUri,
  onScaledPhotoReady,
  onMaskChange,
  clearSignal = false,
  onClearDone,
  canvasWidth,
  canvasHeight,
  brushColor = DEFAULT_BRUSH_COLOR,
  brushSize = DEFAULT_BRUSH_SIZE,
  className,
}) => {
  const imageCanvasRef = useRef<HTMLCanvasElement>(null); // For clean scaled image
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null); // For user's visual drawing
  const maskExportCanvasRef = useRef<HTMLCanvasElement>(null); // For B&W mask export

  const [isDrawing, setIsDrawing] = useState(false);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);

  // Load image
  useEffect(() => {
    if (originalImageDataUri) {
      const img = new Image();
      img.onload = () => {
        setImageElement(img);
      };
      img.onerror = () => {
        console.error("Failed to load image");
        setImageElement(null);
      };
      img.src = originalImageDataUri;
    } else {
      setImageElement(null);
    }
  }, [originalImageDataUri]);

  const clearCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);
  
  const initializeMaskExportCanvas = useCallback(() => {
    const canvas = maskExportCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);


  // Draw image and prepare canvases when imageElement is ready
  useEffect(() => {
    const imgCanvas = imageCanvasRef.current;
    const drawCtx = drawingCanvasRef.current?.getContext('2d');
    const maskExpCtx = maskExportCanvasRef.current?.getContext('2d');

    clearCanvas(imgCanvas);
    clearCanvas(drawingCanvasRef.current);
    clearCanvas(maskExportCanvasRef.current);
    initializeMaskExportCanvas();


    if (imageElement && imgCanvas && drawCtx && maskExpCtx) {
      const imgCtx = imgCanvas.getContext('2d');
      if (!imgCtx) return;

      // Calculate scaled dimensions
      const aspectRatio = imageElement.width / imageElement.height;
      let newWidth = canvasWidth;
      let newHeight = canvasWidth / aspectRatio;

      if (newHeight > canvasHeight) {
        newHeight = canvasHeight;
        newWidth = canvasHeight * aspectRatio;
      }
      
      const offsetX = (canvasWidth - newWidth) / 2;
      const offsetY = (canvasHeight - newHeight) / 2;

      // Draw scaled image on imageCanvas
      imgCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      imgCtx.drawImage(imageElement, offsetX, offsetY, newWidth, newHeight);
      onScaledPhotoReady(imgCanvas.toDataURL('image/png'));

      // Initialize mask export canvas (fill with black)
      initializeMaskExportCanvas();
      if (maskExportCanvasRef.current) {
        onMaskChange(maskExportCanvasRef.current!.toDataURL('image/png')); // Emit initial black mask
      }
    } else if (!imageElement) {
        // If no image, ensure scaled photo and mask are cleared/defaulted
        onScaledPhotoReady(''); // Or a placeholder data URI
        const emptyMaskCanvas = document.createElement('canvas');
        emptyMaskCanvas.width = canvasWidth;
        emptyMaskCanvas.height = canvasHeight;
        const emptyCtx = emptyMaskCanvas.getContext('2d');
        if(emptyCtx){
            emptyCtx.fillStyle = 'black';
            emptyCtx.fillRect(0,0,canvasWidth,canvasHeight);
            onMaskChange(emptyMaskCanvas.toDataURL('image/png'));
        }
    }
  }, [imageElement, canvasWidth, canvasHeight, onScaledPhotoReady, onMaskChange, clearCanvas, initializeMaskExportCanvas]);

  // Handle clear signal
  useEffect(() => {
    if (clearSignal) {
      clearCanvas(drawingCanvasRef.current);
      initializeMaskExportCanvas();
      if (maskExportCanvasRef.current) {
        onMaskChange(maskExportCanvasRef.current.toDataURL('image/png'));
      }
      if (onClearDone) {
        onClearDone();
      }
      lastPositionRef.current = null;
    }
  }, [clearSignal, onClearDone, onMaskChange, clearCanvas, initializeMaskExportCanvas]);


  const getMousePosition = (event: React.MouseEvent): { x: number; y: number } | null => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const drawLine = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string, size: number) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    if (!imageElement) return;
    const pos = getMousePosition(event);
    if (pos) {
      setIsDrawing(true);
      lastPositionRef.current = pos;
      // Start drawing a point even on mousedown
      const drawingCtx = drawingCanvasRef.current?.getContext('2d');
      const maskCtx = maskExportCanvasRef.current?.getContext('2d');
      if (drawingCtx && maskCtx) {
        // Draw dot on visual canvas
        drawingCtx.beginPath();
        drawingCtx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
        drawingCtx.fillStyle = brushColor;
        drawingCtx.fill();
        // Draw dot on mask export canvas (white)
        maskCtx.beginPath();
        maskCtx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
        maskCtx.fillStyle = 'white';
        maskCtx.fill();
      }
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDrawing || !imageElement) return;
    const pos = getMousePosition(event);
    if (pos && lastPositionRef.current) {
      const drawingCtx = drawingCanvasRef.current?.getContext('2d');
      const maskCtx = maskExportCanvasRef.current?.getContext('2d');
      if (drawingCtx && maskCtx) {
        drawLine(drawingCtx, lastPositionRef.current.x, lastPositionRef.current.y, pos.x, pos.y, brushColor, brushSize);
        drawLine(maskCtx, lastPositionRef.current.x, lastPositionRef.current.y, pos.x, pos.y, 'white', brushSize);
      }
      lastPositionRef.current = pos;
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPositionRef.current = null;
    if (maskExportCanvasRef.current) {
      onMaskChange(maskExportCanvasRef.current.toDataURL('image/png'));
    }
  };

  const handleMouseLeave = () => {
    if (!isDrawing) return; // Only call onMaskChange if drawing was in progress
    setIsDrawing(false);
     lastPositionRef.current = null;
    if (maskExportCanvasRef.current) {
      onMaskChange(maskExportCanvasRef.current.toDataURL('image/png'));
    }
  };

  return (
    <div className={cn("relative overflow-hidden rounded-md border bg-muted", className)} style={{ width: canvasWidth, height: canvasHeight }}>
      <canvas
        ref={imageCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="absolute top-0 left-0"
        aria-label="Original image display"
      />
      <canvas
        ref={drawingCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="absolute top-0 left-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        aria-label="Drawing area for selection"
      />
      <canvas
        ref={maskExportCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="hidden" 
        aria-hidden="true"
      />
      {!originalImageDataUri && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-muted-foreground">Upload an image to start</p>
        </div>
      )}
    </div>
  );
};

export default ImageEditor;
