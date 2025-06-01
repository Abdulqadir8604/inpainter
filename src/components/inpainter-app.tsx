
"use client";

import React, { useState, useCallback, ChangeEvent, DragEvent } from 'react';
import Image from 'next/image';
import ImageEditor from './image-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateFillWithPrompt } from '@/ai/flows/generate-fill-prompt';
import { generateFillWithContext } from '@/ai/flows/generate-fill-context';
import { UploadCloud, Download, Wand2, Sparkles, Trash2, Loader2, AlertTriangle } from 'lucide-react';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

export default function InPainterApp() {
  const [originalImageDataUri, setOriginalImageDataUri] = useState<string | null>(null);
  const [scaledPhotoDataUri, setScaledPhotoDataUri] = useState<string | null>(null);
  const [selectionMaskDataUri, setSelectionMaskDataUri] = useState<string | null>(null);
  const [inpaintedImageDataUri, setInpaintedImageDataUri] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [clearSelectionSignal, setClearSelectionSignal] = useState<boolean>(false);
  const { toast } = useToast();

  const handleImageUpload = (file: File | null) => {
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid File Type", description: "Please upload an image file.", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImageDataUri(reader.result as string);
        setInpaintedImageDataUri(null); // Clear previous result
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleImageUpload(event.target.files?.[0] ?? null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    handleImageUpload(event.dataTransfer.files?.[0] ?? null);
    event.currentTarget.classList.remove('border-primary');
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('border-primary');
  };
  
  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-primary');
  };

  const handleClearSelection = () => {
    setClearSelectionSignal(true);
  };

  const handleSelectionCleared = () => {
    setClearSelectionSignal(false);
  };

  const performInpainting = async (mode: 'prompt' | 'context') => {
    if (!scaledPhotoDataUri || !selectionMaskDataUri) {
      toast({ title: "Missing data", description: "Please upload an image and make a selection.", variant: "destructive" });
      return;
    }
    if (mode === 'prompt' && !prompt.trim()) {
      toast({ title: "Missing prompt", description: "Please enter a prompt for the fill.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setError(null);
    setInpaintedImageDataUri(null);

    try {
      let resultUri: string | undefined;
      if (mode === 'prompt') {
        const output = await generateFillWithPrompt({
          photoDataUri: scaledPhotoDataUri,
          selectionDataUri: selectionMaskDataUri,
          prompt: prompt,
        });
        resultUri = output.inpaintedPhotoDataUri;
      } else {
        const output = await generateFillWithContext({
          photoDataUri: scaledPhotoDataUri,
          selectionDataUri: selectionMaskDataUri,
        });
        resultUri = output.inpaintedPhotoDataUri;
      }
      
      if (resultUri) {
        setInpaintedImageDataUri(resultUri);
        toast({ title: "Inpainting Complete!", description: "Your image has been updated." });
      } else {
        throw new Error("AI generation failed to return an image.");
      }

    } catch (err) {
      console.error("Inpainting error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during inpainting.";
      setError(errorMessage);
      toast({ title: "Inpainting Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (inpaintedImageDataUri) {
      const link = document.createElement('a');
      link.href = inpaintedImageDataUri;
      link.download = 'inpainted-image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Download Started", description: "Your image is being downloaded." });
    }
  };
  
  return (
    <div className="container mx-auto p-4 flex flex-col items-center space-y-6 min-h-screen">
      <header className="text-center">
        <h1 className="text-5xl font-headline font-bold text-primary">InPainter</h1>
        <p className="text-muted-foreground mt-2 text-lg">Magically transform your images with AI.</p>
      </header>

      <Card className="w-full max-w-3xl shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" /> Your Creative Canvas
          </CardTitle>
          <CardDescription>Upload an image, select an area, and let AI fill it in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!originalImageDataUri ? (
            <div
              className="w-full h-64 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById('file-upload')?.click()}
              data-ai-hint="abstract texture"
            >
              <UploadCloud size={48} className="mb-4" />
              <p className="font-semibold">Drag & drop an image here, or click to select</p>
              <p className="text-sm">Supports JPG, PNG, WEBP</p>
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isLoading}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center space-y-4">
                <ImageEditor
                  originalImageDataUri={originalImageDataUri}
                  onScaledPhotoReady={setScaledPhotoDataUri}
                  onMaskChange={setSelectionMaskDataUri}
                  clearSignal={clearSelectionSignal}
                  onClearDone={handleSelectionCleared}
                  canvasWidth={CANVAS_WIDTH}
                  canvasHeight={CANVAS_HEIGHT}
                  className="shadow-md"
                />
                 { inpaintedImageDataUri && scaledPhotoDataUri && (
                  <div className={`w-full max-w-[${CANVAS_WIDTH}px] mt-4 p-2 border rounded-md bg-card`}>
                    <p className="text-sm font-medium text-center mb-2 text-foreground">Result:</p>
                    <Image
                      src={inpaintedImageDataUri}
                      alt="Inpainted Image"
                      width={CANVAS_WIDTH}
                      height={CANVAS_HEIGHT}
                      className="rounded-md shadow-md object-contain mx-auto"
                      data-ai-hint="inpainted art"
                    />
                  </div>
                )}

                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="space-y-2">
                        <Label htmlFor="prompt">Describe what to fill (optional)</Label>
                        <Textarea
                        id="prompt"
                        placeholder="e.g., 'a field of wildflowers', 'a futuristic cityscape'"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={isLoading}
                        className="h-24"
                        />
                    </div>
                    <div className="space-y-3 pt-1 md:pt-6">
                        <Button onClick={handleClearSelection} variant="outline" className="w-full" disabled={isLoading || !scaledPhotoDataUri}>
                            <Trash2 className="mr-2 h-4 w-4" /> Clear Selection
                        </Button>
                        <Button onClick={() => performInpainting('prompt')} className="w-full" disabled={isLoading || !selectionMaskDataUri || !scaledPhotoDataUri || !prompt.trim()}>
                            <Wand2 className="mr-2 h-4 w-4" /> Fill with Prompt
                        </Button>
                        <Button onClick={() => performInpainting('context')} variant="secondary" className="w-full" disabled={isLoading || !selectionMaskDataUri || !scaledPhotoDataUri}>
                            <Sparkles className="mr-2 h-4 w-4" /> Fill with Context
                        </Button>
                    </div>
                </div>
                
                {isLoading && (
                  <div className="flex items-center justify-center space-x-2 text-primary p-4">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-lg">Inpainting in progress... this may take a moment.</p>
                  </div>
                )}

                {error && (
                  <div className="w-full p-4 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    <p>{error}</p>
                  </div>
                )}

               
                <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
                    <Button onClick={handleDownload} disabled={!inpaintedImageDataUri || isLoading} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
                        <Download className="mr-2 h-4 w-4" /> Download Inpainted Image
                    </Button>
                     <Button onClick={() => {setOriginalImageDataUri(null); setInpaintedImageDataUri(null); setScaledPhotoDataUri(null); setSelectionMaskDataUri(null); setPrompt(''); setError(null);}} variant="outline" className="w-full sm:w-auto" disabled={isLoading}>
                        Upload New Image
                    </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <footer className="text-center text-sm text-muted-foreground py-8">
        <p>&copy; {new Date().getFullYear()} InPainter. Powered by Generative AI.</p>
      </footer>
    </div>
  );
}
