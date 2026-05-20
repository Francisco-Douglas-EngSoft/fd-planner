import { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value: string | null;
  onChange: (file: File | null) => void;
  onPreviewChange: (preview: string | null) => void;
  className?: string;
}

export function ImageUpload({ value, onChange, onPreviewChange, className }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    setIsLoading(true);
    onChange(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      onPreviewChange(reader.result as string);
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  }, [onChange, onPreviewChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleRemove = useCallback(() => {
    onChange(null);
    onPreviewChange(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [onChange, onPreviewChange]);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />
      
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-border group">
          <img
            src={value}
            alt="Capa do curso"
            className="w-full h-32 sm:h-40 object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClick}
            >
              <Upload className="h-4 w-4 mr-1" />
              Trocar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
            >
              <X className="h-4 w-4 mr-1" />
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 sm:p-8 transition-all cursor-pointer",
            "flex flex-col items-center justify-center gap-2 text-center",
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
            isLoading && "opacity-50 pointer-events-none"
          )}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          ) : (
            <>
              <div className={cn(
                "p-3 rounded-full transition-colors",
                isDragging ? "bg-primary/10" : "bg-muted"
              )}>
                <ImageIcon className={cn(
                  "h-6 w-6 transition-colors",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {isDragging ? "Solte a imagem aqui" : "Arraste uma imagem ou clique para selecionar"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG, GIF ou WebP (máx. 5MB)
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
