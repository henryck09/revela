// Edge Function: cleanup-orphans
// Borra archivos "huérfanos" -subidos durante la creación de un pedido que
// luego falló antes de guardarse en la base de datos- tanto de Supabase
// Storage (pedidos viejos) como de Cloudflare R2 (pedidos nuevos).
//
// Solo compara y borra archivos — nunca toca la tabla orders.

import { createClient } from "npm:@supabase/supabase-js@2";
import { AwsClient } from "npm:aws4fetch@^1.0.17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const BUCKET = "capsule-media";
const FOLDERS = ["photos", "videos", "songs", "backgrounds"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Solo un admin con sesión válida puede ejecutar la limpieza
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return json({ error: "No autorizado." }, 401);
    }

    // 1. Junta todas las rutas/keys que SÍ están en uso por algún pedido
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("photos, video_url, song_url, custom_background_url");
    if (ordersError) throw ordersError;

    const r2PublicBase = (Deno.env.get("R2_PUBLIC_URL") || "").replace(/\/$/, "");
    const inUseSupabase = new Set<string>();
    const inUseR2 = new Set<string>();

    for (const order of orders || []) {
      const urls: string[] = [
        ...(order.photos || []).map((p: { url?: string }) => p?.url),
        order.video_url,
        order.song_url,
        order.custom_background_url,
      ].filter((u: unknown): u is string => typeof u === "string");

      for (const url of urls) {
        if (r2PublicBase && url.startsWith(r2PublicBase + "/")) {
          inUseR2.add(decodeURIComponent(url.slice(r2PublicBase.length + 1).split("?")[0]));
        } else {
          inUseSupabase.add(pathFromSupabaseUrl(url));
        }
      }
    }

    let deleted = 0;
    let freedBytes = 0;

    // 2. Supabase Storage: recorre cada carpeta y borra lo que no esté en uso
    for (const folder of FOLDERS) {
      const { data: files, error: listError } = await supabase.storage.from(BUCKET).list(folder, { limit: 1000 });
      if (listError || !files) continue;

      const toDelete: string[] = [];
      for (const file of files) {
        const path = `${folder}/${file.name}`;
        if (!inUseSupabase.has(path)) {
          toDelete.push(path);
          freedBytes += (file.metadata as { size?: number })?.size || 0;
        }
      }
      if (toDelete.length) {
        const { error: removeError } = await supabase.storage.from(BUCKET).remove(toDelete);
        if (!removeError) deleted += toDelete.length;
      }
    }

    // 3. Cloudflare R2: lista el bucket entero y borra lo que no esté en uso
    const r2Result = await cleanupR2(inUseR2);
    deleted += r2Result.deleted;
    freedBytes += r2Result.freedBytes;

    return json({ deleted, freedMB: (freedBytes / (1024 * 1024)).toFixed(1) }, 200);
  } catch (error) {
    console.error("cleanup-orphans error:", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

async function cleanupR2(inUse: Set<string>) {
  const accountId = Deno.env.get("R2_ACCOUNT_ID");
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
  const bucket = Deno.env.get("R2_BUCKET");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return { deleted: 0, freedBytes: 0 };

  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  const base = `https://${accountId}.r2.cloudflarestorage.com/${bucket}`;

  let deleted = 0;
  let freedBytes = 0;
  let continuationToken: string | undefined;

  do {
    const params = new URLSearchParams({ "list-type": "2", "max-keys": "1000" });
    if (continuationToken) params.set("continuation-token", continuationToken);
    const res = await client.fetch(`${base}/?${params.toString()}`, { method: "GET" });
    if (!res.ok) break;
    const xml = await res.text();

    const keys: { key: string; size: number }[] = [];
    for (const match of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const block = match[1];
      const key = block.match(/<Key>([\s\S]*?)<\/Key>/)?.[1];
      const size = Number(block.match(/<Size>([\s\S]*?)<\/Size>/)?.[1] || 0);
      if (key) keys.push({ key: decodeXml(key), size });
    }

    const toDelete = keys.filter((f) => !inUse.has(f.key));
    for (const file of toDelete) {
      const delRes = await client.fetch(`${base}/${file.key}`, { method: "DELETE" });
      if (delRes.ok || delRes.status === 404) {
        deleted += 1;
        freedBytes += file.size;
      }
    }

    const truncated = xml.match(/<IsTruncated>([\s\S]*?)<\/IsTruncated>/)?.[1] === "true";
    continuationToken = truncated ? xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1] : undefined;
  } while (continuationToken);

  return { deleted, freedBytes };
}

function decodeXml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function pathFromSupabaseUrl(url: string): string {
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? url : url.slice(idx + marker.length);
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
}
