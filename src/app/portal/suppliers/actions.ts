"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { getT } from "@/i18n/server";
import { tMaybe } from "@/i18n";
import { fieldErrorsFrom } from "@/lib/format";
import { SupplierSettingsError, assignSuppliers, connectionInput, deleteConnection, saveConnection, testConnection } from "@/server/supplierSettingsService";

export type SupState = { error?: string; fieldErrors?: Record<string, string>; saved?: boolean; test?: { ok: boolean; message: string } };

async function run(fn: () => Promise<unknown>): Promise<SupState> {
  try { await fn(); } catch (e) {
    if (e instanceof SupplierSettingsError) return { error: (await getT()).t(e.key, e.params) };
    throw e;
  }
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function saveConnectionAction(_prev: SupState, form: FormData): Promise<SupState> {
  const session = await requireRole(["OPS"], "/portal/suppliers");
  const { t } = await getT();
  const parsed = connectionInput.safeParse({
    id: form.get("id") ?? undefined, name: form.get("name"), baseUrl: form.get("baseUrl"), apiKey: form.get("apiKey") ?? undefined,
    clearKey: form.get("clearKey") === "on", kinds: form.getAll("kinds").map(String), canIssue: form.get("canIssue") === "on",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues, t, tMaybe), error: t("common.checkFields") };
  return run(() => saveConnection(session.user.id, parsed.data));
}

export async function deleteConnectionAction(_prev: SupState, form: FormData): Promise<SupState> {
  const session = await requireRole(["OPS"], "/portal/suppliers");
  return run(() => deleteConnection(session.user.id, String(form.get("id"))));
}

export async function assignAction(_prev: SupState, form: FormData): Promise<SupState> {
  const session = await requireRole(["OPS"], "/portal/suppliers");
  const pick = (k: string) => (form.get(k) && form.get(k) !== "sample" ? String(form.get(k)) : null);
  return run(() => assignSuppliers(session.user.id, { FLIGHT: pick("FLIGHT"), TRAIN: pick("TRAIN"), STAY: pick("STAY") }));
}

export async function testConnectionAction(_prev: SupState, form: FormData): Promise<SupState> {
  const session = await requireRole(["OPS"], "/portal/suppliers");
  const { t } = await getT();
  const r = await testConnection(session.user.id, String(form.get("id")));
  revalidatePath("/portal/suppliers");
  return { test: { ok: r.ok, message: t(r.key, r.params) } };
}
