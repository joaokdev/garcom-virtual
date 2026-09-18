"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, X, Check } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import type { AdminCategory } from "@/lib/db/repositories/admin";

export function CategoryManagerSheet({
  isOpen,
  onClose,
  categories,
  onCreate,
  onRename,
  onDelete,
  onMove,
}: {
  isOpen: boolean;
  onClose: () => void;
  categories: AdminCategory[];
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<{ error?: string }>;
  onMove: (id: string, direction: "up" | "down") => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await onCreate(newName.trim());
      setNewName("");
    } finally {
      setCreating(false);
    }
  }

  function startEditing(category: AdminCategory) {
    setEditingId(category.id);
    setEditingValue(category.name);
    setDeleteError(null);
  }

  async function confirmRename(id: string) {
    if (editingValue.trim()) {
      await onRename(id, editingValue.trim());
    }
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    setDeleteError(null);
    const result = await onDelete(id);
    if (result.error) setDeleteError(result.error);
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Categorias" closeLabel="Fechar">
      <div className="space-y-5 pb-2">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Nova categoria, ex.: Sobremesas"
            className="flex-1 rounded-[var(--radius-lg)] border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-ink/40 focus:outline-none"
          />
          <Button variant="primary" size="md" onClick={handleCreate} loading={creating} icon={<Plus className="h-4 w-4" />}>
            Criar
          </Button>
        </div>

        {deleteError && (
          <p className="rounded-[var(--radius-md)] bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">{deleteError}</p>
        )}

        <div className="divide-y divide-line">
          {categories.map((category, index) => (
            <div key={category.id} className="flex items-center gap-2 py-3">
              <div className="flex flex-col">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => onMove(category.id, "up")}
                  className="text-ink-faint transition hover:text-ink disabled:opacity-25"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={index === categories.length - 1}
                  onClick={() => onMove(category.id, "down")}
                  className="text-ink-faint transition hover:text-ink disabled:opacity-25"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {editingId === category.id ? (
                <>
                  <input
                    autoFocus
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmRename(category.id)}
                    className="flex-1 rounded-[var(--radius-md)] border border-ink/30 bg-paper px-3 py-1.5 text-sm text-ink focus:outline-none"
                  />
                  <button onClick={() => confirmRename(category.id)} className="text-success">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-ink-faint">
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">{category.name}</p>
                    <p className="text-xs text-ink-faint">
                      {category.itemCount} {category.itemCount === 1 ? "produto" : "produtos"}
                    </p>
                  </div>
                  <button onClick={() => startEditing(category)} className="p-1.5 text-ink-faint transition hover:text-ink">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(category.id)} className="p-1.5 text-ink-faint transition hover:text-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}

          {categories.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-faint">Nenhuma categoria criada ainda.</p>
          )}
        </div>
      </div>
    </Sheet>
  );
}
