// Deletes an order and every uploaded media file it owns. Requires an admin JWT.
// Soporta archivos viejos en Supabase Storage y archivos nuevos en Cloudflare R2:
// detecta según el dominio de la URL guardada en el pedido y borra del lugar correcto.
import { createClient } from "npm:@supabase/supabase-js@2";
import { AwsClient } from "npm:aws4fetch@^1.0.17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const BUCKET = "capsule-media";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "No autorizado" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = authorization.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "No autorizado" }, 401);

    const { orderId } = await req.json();
    if (!orderId) return json({ error: "Falta orderId en el body" }, 400);

    const { data: order, error: orderError } = await supabase.from("orders").select("*").eq("id", orderId).single();
    if (orderError) throw orderError;

    const { supabasePaths, r2Keys } = classifyMedia(order);

    if (supabasePaths.length) {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove(supabasePaths);
      if (storageError) throw storageError;
    }
    await deleteFromR2(r2Keys);

    const { error: deleteError } = await supabase.from("orders").delete().eq("id", orderId);
    if (deleteError) throw deleteError;
    return json({ deleted: true, filesDeleted: supabasePaths.length + r2Keys.length }, 200);
  } catch (error) {
    console.error("delete-order error:", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

/** Separa las URLs guardadas en el pedido según vengan de Supabase Storage o de R2 */
function classifyMedia(order: Record<string, unknown>) {
  const urls = [
    ...(Array.isArray(order.photos) ? order.photos.map((photo) => photo?.url) : []),
    order.video_url,
    order.song_url,
    order.custom_background_url,
  ].filter((value): value is string => typeof value === "string");

  const r2PublicBase = (Deno.env.get("R2_PUBLIC_URL") || "").replace(/\/$/, "");
  const supabasePrefix = `/storage/v1/object/public/${BUCKET}/`;

  const supabasePaths = new Set<string>();
  const r2Keys = new Set<string>();

  for (const url of urls) {
    if (r2PublicBase && url.startsWith(r2PublicBase + "/")) {
      r2Keys.add(decodeURIComponent(url.slice(r2PublicBase.length + 1).split("?")[0]));
      continue;
    }
    const idx = url.indexOf(supabasePrefix);
    if (idx !== -1) {
      supabasePaths.add(decodeURIComponent(url.slice(idx + supabasePrefix.length).split("?")[0]));
    }
  }
  return { supabasePaths: [...supabasePaths], r2Keys: [...r2Keys] };
}

async function deleteFromR2(keys: string[]) {
  if (!keys.length) return;
  const accountId = Deno.env.get("R2_ACCOUNT_ID");
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
  const bucket = Deno.env.get("R2_BUCKET");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return;

  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  await Promise.all(keys.map(async (key) => {
    const url = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
    const res = await client.fetch(url, { method: "DELETE" });
    if (!res.ok && res.status !== 404) {
      console.error(`No se pudo borrar ${key} de R2 (status ${res.status})`);
    }
  }));
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
}
