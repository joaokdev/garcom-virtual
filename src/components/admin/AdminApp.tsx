"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LogOut, Plus, Search, Settings, Settings2, UtensilsCrossed, X } from "lucide-react";
import { RestaurantMark } from "@/components/brand/RestaurantMark";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductFormSheet } from "@/components/admin/ProductFormSheet";
import { CategoryManagerSheet } from "@/components/admin/CategoryManagerSheet";
import { useIdleLogout } from "@/lib/hooks/useIdleLogout";
import { Signature } from "@/components/brand/Signature";
import { SettingsSheet } from "@/components/layout/SettingsSheet";
import { formatCurrencyCents } from "@/lib/i18n";
import { cn, getReadableForeground } from "@/lib/utils";
import { useToastStore } from "@/store/toast-store";
import type { AdminCategory, AdminProduct, ProductInput } from "@/lib/db/repositories/admin";

async function api<T>(slug: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin/${path}${path.includes("?") ? "&" : "?"}slug=${slug}`, {
    ...init,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? data.error ?? "Erro ao salvar.");
  return data as T;
}

export function AdminApp({
  slug,
  restaurantName,
  primaryColor,
  accentColor,
  logoIcon,
}: {
  slug: string;
  restaurantName: string;
  primaryColor: string;
  accentColor: string;
  logoIcon: string | null;
}) {
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const pushToast = useToastStore((s) => s.push);

  const brandStyle = useMemo(
    () =>
      ({
        "--brand": primaryColor,
        "--brand-foreground": getReadableForeground(primaryColor),
        "--accent": accentColor,
        "--accent-foreground": getReadableForeground(accentColor),
      }) as React.CSSProperties,
    [primaryColor, accentColor]
  );

  const loadProducts = useCallback(async () => {
    const { products: list } = await api<{ products: AdminProduct[] }>(slug, "products");
    setProducts(list);
  }, [slug]);

  const loadCategories = useCallback(async () => {
    const { categories: list } = await api<{ categories: AdminCategory[] }>(slug, "categories");
    setCategories(list);
  }, [slug]);

  useEffect(() => {
    // IIFE cancelável: evita setState depois do componente desmontar e,
    // ao mesmo tempo, atende a regra do linter contra setState direto no
    // corpo do efeito. Também trata falha de carregamento — sem isso, uma
    // falha de rede deixava a tela presa no skeleton de loading pra sempre.
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([loadProducts(), loadCategories()]);
      } catch {
        if (!cancelled) {
          setProducts([]);
          pushToast("Não foi possível carregar o cardápio.", "error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProducts, loadCategories, pushToast]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let result = products;
    if (activeCategoryId) result = result.filter((p) => p.categoryId === activeCategoryId);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, activeCategoryId, search]);

  async function handleSaveProduct(input: ProductInput) {
    setSaving(true);
    try {
      if (editingProduct) {
        await api(slug, `products/${editingProduct.id}`, { method: "PATCH", body: JSON.stringify(input) });
      } else {
        await api(slug, "products", { method: "POST", body: JSON.stringify(input) });
      }
      await loadProducts();
      setFormOpen(false);
      setEditingProduct(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAvailability(product: AdminProduct) {
    setProducts((prev) =>
      prev ? prev.map((p) => (p.id === product.id ? { ...p, isAvailable: !p.isAvailable } : p)) : prev
    );
    await api(slug, `products/${product.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isAvailable: !product.isAvailable }),
    });
  }

  async function handleDeleteProduct(product: AdminProduct) {
    if (!confirm(`Excluir "${product.name}"? Esta ação não pode ser desfeita.`)) return;
    await api(slug, `products/${product.id}`, { method: "DELETE" });
    await loadProducts();
  }

  async function handleLogout() {
    await fetch(`/api/auth?slug=${slug}&type=admin`, { method: "DELETE" });
    window.location.reload();
  }

  // Desloga sozinho após 10 min sem interação (tablet compartilhado da equipe).
  useIdleLogout(handleLogout, 10);

  return (
    <div style={brandStyle} className="min-h-screen bg-stone">
      {/* Header */}
      <header className="material-thin sticky top-0 z-20">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <RestaurantMark name={restaurantName} logoIcon={logoIcon} size="sm" />
            <div>
              <h1 className="text-title text-ink">{restaurantName}</h1>
              <span className="text-xs font-semibold text-ink-soft">Gestão de Produtos</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-line px-3 py-2 text-xs font-semibold text-ink-soft transition hover:text-ink active:scale-95"
              title="Configurações"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-line px-3 py-2 text-xs font-semibold text-ink-soft transition hover:text-ink active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-5 px-6 py-6">
        {/* Busca e ações */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="w-full rounded-[var(--radius-lg)] border border-line bg-paper py-2.5 pl-10 pr-9 text-sm text-ink placeholder:text-ink-faint focus:border-ink/40 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="md" icon={<Settings2 className="h-4 w-4" />} onClick={() => setCategoriesOpen(true)}>
              Categorias
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditingProduct(null);
                setFormOpen(true);
              }}
            >
              Novo produto
            </Button>
          </div>
        </div>

        {/* Filtro por categoria */}
        {categories.length > 0 && (
          <div className="scroll-no-bar flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategoryId(null)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition",
                activeCategoryId === null ? "bg-ink text-paper" : "border border-line text-ink-soft hover:border-ink-faint"
              )}
            >
              Todos
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategoryId(c.id)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition",
                  activeCategoryId === c.id ? "bg-ink text-paper" : "border border-line text-ink-soft hover:border-ink-faint"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Grid de produtos */}
        {products === null && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Skeleton key={n} className="h-64 w-full rounded-[var(--radius-lg)]" />
            ))}
          </div>
        )}

        {products !== null && filteredProducts.length === 0 && (
          <EmptyState
            icon={<UtensilsCrossed className="h-10 w-10" strokeWidth={1.5} />}
            title={products.length === 0 ? "Nenhum produto cadastrado" : "Nenhum resultado encontrado"}
            description={products.length === 0 ? "Comece adicionando o primeiro item do seu cardápio." : undefined}
            action={
              products.length === 0 ? (
                <Button variant="primary" onClick={() => setFormOpen(true)} icon={<Plus className="h-4 w-4" />}>
                  Novo produto
                </Button>
              ) : undefined
            }
          />
        )}

        {products !== null && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className={cn(
                  "group overflow-hidden rounded-[var(--radius-lg)] bg-paper shadow-[var(--shadow-card)] transition-opacity",
                  !product.isAvailable && "opacity-60"
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(product);
                    setFormOpen(true);
                  }}
                  className="block w-full text-left"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-line/40">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-ink-faint">
                        <UtensilsCrossed className="h-7 w-7" strokeWidth={1.1} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                      {product.categoryName}
                    </p>
                    <h3 className="font-display text-base font-semibold leading-snug text-ink">
                      {product.name}
                    </h3>
                    <p className="font-mono text-sm font-semibold text-ink">
                      {formatCurrencyCents(product.priceCents)}
                    </p>
                  </div>
                </button>

                <div className="flex items-center justify-between border-t border-line px-4 py-3">
                  <span className="text-xs font-medium text-ink-soft">
                    {product.isAvailable ? "Disponível" : "Indisponível"}
                  </span>
                  <Switch
                    checked={product.isAvailable}
                    onChange={() => handleToggleAvailability(product)}
                    label={`Disponibilidade de ${product.name}`}
                  />
                </div>
                <button
                  onClick={() => handleDeleteProduct(product)}
                  className="w-full border-t border-line px-4 py-2.5 text-center text-[12px] font-semibold text-ink-faint transition hover:bg-danger/5 hover:text-danger"
                >
                  Excluir produto
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="pt-6">
          <Signature />
        </div>
      </div>

      <ProductFormSheet
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        categories={categories}
        product={editingProduct}
        saving={saving}
        defaultCategoryId={activeCategoryId ?? undefined}
      />

      <CategoryManagerSheet
        isOpen={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        categories={categories}
        onCreate={async (name) => {
          await api(slug, "categories", { method: "POST", body: JSON.stringify({ name }) });
          await loadCategories();
        }}
        onRename={async (id, name) => {
          await api(slug, `categories/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
          await loadCategories();
        }}
        onDelete={async (id) => {
          try {
            await api(slug, `categories/${id}`, { method: "DELETE" });
            await loadCategories();
            await loadProducts();
            return {};
          } catch (error) {
            return { error: error instanceof Error ? error.message : "Não foi possível excluir." };
          }
        }}
        onMove={async (id, direction) => {
          await api(slug, "categories/reorder", { method: "PATCH", body: JSON.stringify({ categoryId: id, direction }) });
          await loadCategories();
        }}
      />

      <SettingsSheet isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
