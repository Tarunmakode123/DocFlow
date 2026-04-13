import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadFieldProps {
  fieldId: string;
  label: string;
  value: string; // storage path
  userId: string;
  templateId: string;
  onUploaded: (storagePath: string) => void;
}

export default function ImageUploadField({ fieldId, label, value, userId, templateId, onUploaded }: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Generate preview URL from storage path
  const getPreviewUrl = async (path: string) => {
    const { data } = await supabase.storage.from("student-uploads").createSignedUrl(path, 3600);
    if (data?.signedUrl) setPreviewUrl(data.signedUrl);
  };

  // Load existing preview on mount
  useState(() => {
    if (value) getPreviewUrl(value);
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file (PNG, JPG, etc.)", variant: "destructive" });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image under 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      const ext = file.name.split(".").pop() || "png";
      const storagePath = `${userId}/${templateId}/${fieldId}.${ext}`;

      const { error } = await supabase.storage
        .from("student-uploads")
        .upload(storagePath, file, { upsert: true, contentType: file.type });

      if (error) throw error;

      // Get preview URL
      const { data: signedData } = await supabase.storage.from("student-uploads").createSignedUrl(storagePath, 3600);
      if (signedData?.signedUrl) setPreviewUrl(signedData.signedUrl);

      onUploaded(storagePath);
      toast({ title: "Image uploaded", description: `${label} uploaded successfully` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (value) {
      await supabase.storage.from("student-uploads").remove([value]);
    }
    setPreviewUrl(null);
    onUploaded("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {previewUrl ? (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt={label}
            className="max-h-32 rounded-lg border border-border object-contain bg-background"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-accent/50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="text-xs text-muted-foreground">Uploading...</span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Click to upload {label.toLowerCase()}</span>
              <span className="text-xs text-muted-foreground/60">PNG, JPG up to 5MB</span>
            </>
          )}
        </button>
      )}

      {previewUrl && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-xs border-border"
        >
          <Upload className="h-3 w-3 mr-1" />
          Replace
        </Button>
      )}
    </div>
  );
}
