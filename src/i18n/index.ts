// Minimal i18n: two dictionaries, a t() with {placeholder} interpolation, and locale-aware formatting.
import { en, type MessageKey } from "./en";
import { id } from "./id";

export type Locale = "en" | "id";
export const LOCALES: Locale[] = ["id", "en"];
export const LOCALE_COOKIE = "lang";
export const LOCALE_NAME: Record<Locale, string> = { id: "Bahasa Indonesia", en: "English" };
export type { MessageKey };

const DICTS: Record<Locale, Record<MessageKey, string>> = { en, id };
export type Params = Record<string, string | number>;
export type T = (key: MessageKey, params?: Params) => string;

export function isLocale(v: unknown): v is Locale {
  return v === "en" || v === "id";
}

/** Translator for a locale. Unknown keys fall back to English, then to the key itself. */
export function makeT(locale: Locale): T {
  const dict = DICTS[locale];
  return (key, params) => {
    const s = dict[key] ?? en[key] ?? key;
    return params ? s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : s;
  };
}

/** Translate a message that may be a dictionary key (as thrown by services and zod schemas). */
export function tMaybe(t: T, message: string, params?: Params): string {
  return message in en ? t(message as MessageKey, params) : message;
}

export const BCP47: Record<Locale, string> = { en: "en-GB", id: "id-ID" };

/** Pick a locale from an Accept-Language header: Indonesian unless English is preferred over it. */
export function fromAcceptLanguage(header: string | null): Locale {
  if (!header) return "id";
  const prefs = header.split(",").map((p) => p.trim().split(";")[0].toLowerCase());
  const idIdx = prefs.findIndex((p) => p === "id" || p.startsWith("id-") || p === "in");
  const enIdx = prefs.findIndex((p) => p === "en" || p.startsWith("en-"));
  if (enIdx >= 0 && (idIdx < 0 || enIdx < idIdx)) return "en";
  return "id";
}
