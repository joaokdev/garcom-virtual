"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4MB

export function ImageDropzone({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Imagem muito grande. Máximo de 4MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.onerror = () => setError("Não foi possível ler o arquivo.");
    reader.readAsDataURL(file);
  }

  if (value) {
    return (
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Pré-visualização do produto" className="h-48 w-full object-cover" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-paper backdrop-blur-sm transition active:scale-90"
          aria-label="Remover imagem"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex h-48 w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed transition-colors",
          dragOver ? "border-brand bg-brand/[0.04]" : "border-line hover:border-ink-faint"
        )}
      >
        <ImagePlus className="h-6 w-6 text-ink-faint" strokeWidth={1.5} />
        <p className="text-sm font-medium text-ink-soft">Arraste uma imagem ou toque para escolher</p>
        <p className="text-xs text-ink-faint">PNG ou JPG · até 4MB</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
