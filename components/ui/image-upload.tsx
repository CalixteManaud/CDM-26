"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  label?: string;
}

export function ImageUpload({ value, onChange, onRemove, disabled, label = "Logo" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Le fichier doit être une image");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5MB");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      const json: { url?: string; error?: string } = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Erreur lors de l'upload");
      }

      if (json.url) {
        onChange(json.url);
        toast.success("Image uploadée avec succès");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    } else {
      onChange("");
    }
  };

  return (
    <div className="space-y-4">
      <input
        title="Upload Image"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {value ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative group"
          >
            <div className="relative w-32 h-32 mx-auto rounded-xl overflow-hidden border-2 border-stone-200 bg-stone-100">
              <Image
                src={value}
                alt={label}
                fill
                className="object-cover"
                sizes="128px"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleRemove}
                  disabled={disabled || uploading}
                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
            <p className="text-center text-sm text-stone-500 mt-2">Clique pour supprimer</p>
          </motion.div>
        ) : (
          <motion.button
            key="upload"
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="relative w-full py-12 border-2 border-dashed border-stone-300 rounded-xl hover:border-stone-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-stone-50 hover:bg-stone-100"
          >
            <div className="flex flex-col items-center space-y-3">
              {uploading ? (
                <>
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                  <p className="text-sm font-medium text-stone-600">Upload en cours...</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-linear-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-stone-900">Cliquer pour uploader</p>
                    <p className="text-xs text-stone-500 mt-1">PNG, JPG, WEBP (max 5MB)</p>
                  </div>
                </>
              )}
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
