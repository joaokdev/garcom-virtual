"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { ImageDropzone } from "@/components/admin/ImageDropzone";
import type { AdminCategory, AdminProduct, ProductInput } from "@/lib/db/repositories/admin";

function centsToInputValue(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function inputValueToCents(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Math.round(parseFloat(normalized || "0") * 100);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function ProductFormSheet({
  isOpen,
  onClose,
  onSave,
  categories,
  product,
  saving,
  defaultCategoryId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: ProductInput) => Promise<void>;
  categories: AdminCategory[];
  product: AdminProduct | null;
  saving: boolean;
  defaultCategoryId?: string;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceInput, setPriceInput] = useState("0,00");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isChefRecommendation, setIsChefRecommendation] = useState(false);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState("15");
  const [tagsInput, setTagsInput] = useState("");
  const [touched, setTouched] = useState(false);

  // Sincroniza os campos do form com `product` sempre que o sheet abre (ou
  // troca de produto/categoria padrão) enquanto está aberto. Isto é "ajustar
  // estado a partir de props", então é feito durante a renderização — o
  // padrão que os próprios docs do React recomendam para este caso — em vez
  // de um useEffect com setState direto no corpo (React nunca deixa a tela
  // "piscar" com o estado velho: o setState aqui é aplicado antes do commit).
  const defaultFirstCategoryId = categories[0]?.id ?? "";
  const syncKey = isOpen
    ? `${product?.id ?? "new"}:${defaultCategoryId ?? ""}:${defaultFirstCategoryId}`
    : "__closed__";
  const [lastSyncKey, setLastSyncKey] = useState("__closed__");

  if (syncKey !== lastSyncKey) {
    setLastSyncKey(syncKey);
    if (isOpen) {
      if (product) {
        setName(product.name);
        setDescription(product.description);
        setCategoryId(product.categoryId);
        setPriceInput(centsToInputValue(product.priceCents));
        setImageUrl(product.imageUrl);
        setIsAvailable(product.isAvailable);
        setIsChefRecommendation(product.isChefRecommendation);
        setPrepTimeMinutes(String(product.prepTimeMinutes));
        setTagsInput(product.tags.join(", "));
      } else {
        setName("");
        setDescription("");
        setCategoryId(defaultCategoryId ?? defaultFirstCategoryId);
        setPriceInput("0,00");
        setImageUrl(null);
        setIsAvailable(true);
        setIsChefRecommendation(false);
        setPrepTimeMinutes("15");
        setTagsInput("");
      }
      setTouched(false);
    }
  }

  const nameError = touched && name.trim().length === 0;
  const categoryError = touched && categoryId.length === 0;
  const canSave = name.trim().length > 0 && categoryId.length > 0 && !saving;

  async function handleSubmit() {
    setTouched(true);
    if (!canSave) return;

    await onSave({
      categoryId,
      name: name.trim(),
      description: description.trim(),
      priceCents: inputValueToCents(priceInput),
      imageUrl,
      isAvailable,
      isChefRecommendation,
      prepTimeMinutes: Math.max(1, parseInt(prepTimeMinutes, 10) || 15),
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  }

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={product ? "Editar produto" : "Novo produto"}
      closeLabel="Fechar"
      size="tall"
      footer={
        <Button variant="primary" size="lg" fullWidth loading={saving} onClick={handleSubmit}>
          {product ? "Salvar alterações" : "Adicionar produto"}
        </Button>
      }
    >
      <div className="space-y-5 pb-2">
        <ImageDropzone value={imageUrl} onChange={setImageUrl} />

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-ink">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Picanha na Brasa"
            className="w-full rounded-[var(--radius-lg)] border border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-ink/40 focus:outline-none"
          />
          {nameError && <p className="text-xs font-medium text-danger">Informe um nome.</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-ink">Categoria</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-[var(--radius-lg)] border border-line bg-paper px-4 py-3 text-sm text-ink focus:border-ink/40 focus:outline-none"
          >
            <option value="" disabled>Selecione uma categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {categoryError && <p className="text-xs font-medium text-danger">Selecione uma categoria.</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-ink">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Conte o que torna esse prato especial"
            className="w-full resize-none rounded-[var(--radius-lg)] border border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-ink/40 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-ink">Preço (R$)</label>
            <input
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
              className="w-full rounded-[var(--radius-lg)] border border-line bg-paper px-4 py-3 font-mono text-sm text-ink focus:border-ink/40 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-ink">Preparo (min)</label>
            <input
              value={prepTimeMinutes}
              onChange={(e) => setPrepTimeMinutes(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className="w-full rounded-[var(--radius-lg)] border border-line bg-paper px-4 py-3 font-mono text-sm text-ink focus:border-ink/40 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-ink">Tags <span className="font-normal text-ink-faint">(opcional, separadas por vírgula)</span></label>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="vegano, sem-glúten"
            className="w-full rounded-[var(--radius-lg)] border border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-ink/40 focus:outline-none"
          />
        </div>

        <div className="space-y-3 rounded-[var(--radius-lg)] bg-stone p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink">Disponível no cardápio</span>
            <Switch checked={isAvailable} onChange={setIsAvailable} label="Disponível no cardápio" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink">Sugestão do chef</span>
            <Switch checked={isChefRecommendation} onChange={setIsChefRecommendation} label="Sugestão do chef" />
          </div>
        </div>
      </div>
    </Sheet>
  );
}
