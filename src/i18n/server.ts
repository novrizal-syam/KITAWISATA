import "server-only";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, fromAcceptLanguage, isLocale, makeT, type Locale } from ".";

/** The viewer's language: their choice from the switcher, else their browser's preference. */
export async function getLocale(): Promise<Locale> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;
  return fromAcceptLanguage((await headers()).get("accept-language"));
}

export async function getT() {
  const locale = await getLocale();
  return { t: makeT(locale), locale };
}
