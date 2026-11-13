import type { MessageKey, Params } from "@/i18n";

/** An error meant for the user: a dictionary key plus parameters, translated where it is shown. */
export class AppError extends Error {
  constructor(public readonly key: MessageKey, public readonly params?: Params) {
    super(key);
  }
}
