import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "@/types";

interface CartState {
  cartsByContext: Record<string, CartLine[]>;
  addLine: (contextKey: string, line: Omit<CartLine, "cartLineId">) => void;
  updateQuantity: (contextKey: string, cartLineId: string, quantity: number) => void;
  updateNotes: (contextKey: string, cartLineId: string, notes: string) => void;
  removeLine: (contextKey: string, cartLineId: string) => void;
  clearContext: (contextKey: string) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cartsByContext: {},

      addLine: (contextKey, line) =>
        set((state) => {
          const current = state.cartsByContext[contextKey] ?? [];
          const newLine: CartLine = { ...line, cartLineId: crypto.randomUUID() };
          return {
            cartsByContext: {
              ...state.cartsByContext,
              [contextKey]: [...current, newLine],
            },
          };
        }),

      updateQuantity: (contextKey, cartLineId, quantity) =>
        set((state) => {
          const current = state.cartsByContext[contextKey] ?? [];
          if (quantity <= 0) {
            return {
              cartsByContext: {
                ...state.cartsByContext,
                [contextKey]: current.filter((l) => l.cartLineId !== cartLineId),
              },
            };
          }
          return {
            cartsByContext: {
              ...state.cartsByContext,
              [contextKey]: current.map((l) =>
                l.cartLineId === cartLineId ? { ...l, quantity } : l
              ),
            },
          };
        }),

      updateNotes: (contextKey, cartLineId, notes) =>
        set((state) => {
          const current = state.cartsByContext[contextKey] ?? [];
          return {
            cartsByContext: {
              ...state.cartsByContext,
              [contextKey]: current.map((l) =>
                l.cartLineId === cartLineId ? { ...l, notes } : l
              ),
            },
          };
        }),

      removeLine: (contextKey, cartLineId) =>
        set((state) => {
          const current = state.cartsByContext[contextKey] ?? [];
          return {
            cartsByContext: {
              ...state.cartsByContext,
              [contextKey]: current.filter((l) => l.cartLineId !== cartLineId),
            },
          };
        }),

      clearContext: (contextKey) =>
        set((state) => ({
          cartsByContext: { ...state.cartsByContext, [contextKey]: [] },
        })),
    }),
    { name: "comanda-cart" }
  )
);

const EMPTY_LINES: CartLine[] = [];

export function useCartLines(contextKey: string): CartLine[] {
  return useCartStore((state) => state.cartsByContext[contextKey] ?? EMPTY_LINES);
}
