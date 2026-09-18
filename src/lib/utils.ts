import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(...inputs);
}

/**
 * Decide se o texto sobre uma cor de marca (definida livremente por cada
 * restaurante) deve ser claro ou escuro, usando luminância relativa.
 * Evita que um restaurante escolha uma cor clara e o texto fique ilegível.
 */
export function getReadableForeground(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;

  const r = parseInt(full.substring(0, 2), 16) / 255;
  const g = parseInt(full.substring(2, 4), 16) / 255;
  const b = parseInt(full.substring(4, 6), 16) / 255;

  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

  return luminance > 0.45 ? "#211d1a" : "#f7f5f1";
}
