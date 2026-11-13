import { setLocale } from "./actions";
import { LOCALES, LOCALE_NAME, type Locale } from ".";

/** EN | ID switch. A plain form, so it works before JavaScript loads. */
export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  return (
    <form action={setLocale} className="flex items-center gap-1" aria-label={label}>
      {LOCALES.map((l) => (
        <button key={l} name="locale" value={l} lang={l} title={LOCALE_NAME[l]} aria-pressed={l === locale}
          className={`min-h-9 rounded-[9px] px-2.5 text-[13px] font-bold uppercase ${l === locale ? "bg-ink text-white" : "text-muted hover:text-ink"}`}>
          {l}
        </button>
      ))}
    </form>
  );
}
