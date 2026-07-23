import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function admin() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function randomKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 12; i++) out += chars[bytes[i] % chars.length];
  return `INL-${out.slice(0,4)}-${out.slice(4,8)}-${out.slice(8,12)}`;
}

/** Public: verify a visitor's access key and return its id. */
export const verifyAccessKey = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ key: z.string().trim().min(4).max(64) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: true; keyId: string } | { ok: false }> => {
    const sb = admin();
    const { data: row } = await sb
      .from("access_keys").select("id, active").eq("key", data.key).maybeSingle();
    if (!row || !row.active) return { ok: false };
    return { ok: true, keyId: row.id };
  });

function checkAdmin(token: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error("ADMIN_PASSWORD não configurado no servidor.");
  if (token !== expected) throw new Error("Senha admin inválida.");
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ password: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => { checkAdmin(data.password); return { ok: true as const }; });

export const adminListKeys = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    checkAdmin(data.token);
    const { data: rows, error } = await admin()
      .from("access_keys")
      .select("id, key, label, active, uses, last_used_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminCreateKey = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    token: z.string(),
    label: z.string().trim().max(120).optional().default(""),
  }).parse(d))
  .handler(async ({ data }) => {
    checkAdmin(data.token);
    const key = randomKey();
    const { data: row, error } = await admin()
      .from("access_keys")
      .insert({ key, label: data.label || null })
      .select("id, key, label, active, uses, last_used_at, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminToggleKey = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    token: z.string(), id: z.string().uuid(), active: z.boolean(),
  }).parse(d))
  .handler(async ({ data }) => {
    checkAdmin(data.token);
    const { error } = await admin().from("access_keys").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminDeleteKey = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    checkAdmin(data.token);
    const { error } = await admin().from("access_keys").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
