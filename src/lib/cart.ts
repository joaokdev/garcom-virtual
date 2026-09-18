import type { CartLine } from "@/types";

export function computeLineUnitTotalCents(line: CartLine): number {
  const choicesTotal = line.selectedChoices.reduce((sum, c) => sum + c.priceDeltaCents, 0);
  return line.unitBasePriceCents + choicesTotal;
}

export function computeLineTotalCents(line: CartLine): number {
  return computeLineUnitTotalCents(line) * line.quantity;
}

export function computeCartSubtotalCents(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + computeLineTotalCents(line), 0);
}

export function computeCartItemCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function buildCartContextKey(restaurantId: string, tableId: string): string {
  return `${restaurantId}:${tableId}`;
}
