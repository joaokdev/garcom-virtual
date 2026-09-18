import type { I18nText, Locale } from "@/types";
import ptBR from "@/lib/i18n/dictionaries/pt-BR.json";
import en from "@/lib/i18n/dictionaries/en.json";
import es from "@/lib/i18n/dictionaries/es.json";

export const dictionaries: Record<Locale, Record<string, unknown>> = {
  "pt-BR": ptBR,
  en,
  es,
};

export const LOCALE_LABELS: Record<Locale, string> = {
  "pt-BR": "Português",
  en: "English",
  es: "Español",
};

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const value = path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        typeof acc === "object" && acc !== null ? (acc as Record<string, unknown>)[key] : undefined,
      obj
    );
  return typeof value === "string" ? value : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Traduz uma chave de UI (ex.: "cart.title") no idioma informado, com
 * fallback para português caso a chave não exista no idioma escolhido.
 */
export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const fromLocale = getNested(dictionaries[locale], key);
  if (fromLocale) return interpolate(fromLocale, params);

  const fallback = getNested(dictionaries["pt-BR"], key);
  if (fallback) return interpolate(fallback, params);

  return key;
}

/**
 * Resolve um campo de conteúdo do cardápio (nome/descrição de item,
 * categoria etc.) que pode ter sido traduzido apenas parcialmente pelo
 * restaurante. Cadeia de fallback: idioma escolhido → pt-BR → en → es →
 * primeiro valor disponível → string vazia.
 */
export function pickI18nText(text: I18nText, locale: Locale): string {
  return (
    text[locale] ??
    text["pt-BR"] ??
    text["en"] ??
    text["es"] ??
    Object.values(text)[0] ??
    ""
  );
}

export function formatCurrencyCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatTime(isoDate: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}
