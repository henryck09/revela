// Deletes an order and every uploaded media file it owns. Requires an admin JWT.
import { createClient } from "npm:@supabase/supabase-js@2";

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

    const paths = mediaPaths(order);
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths);
      if (storageError) throw storageError;
    }

    const { error: deleteError } = await supabase.from("orders").delete().eq("id", orderId);
    if (deleteError) throw deleteError;
    return json({ deleted: true, filesDeleted: paths.length }, 200);
  } catch (error) {
    console.error("delete-order error:", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

function mediaPaths(order: Record<string, unknown>) {
  const urls = [
    ...(Array.isArray(order.photos) ? order.photos.map((photo) => photo?.url) : []),
    order.video_url,
    order.song_url,
    order.custom_background_url,
  ].filter((value): value is string => typeof value === "string");

  const prefix = `/storage/v1/object/public/${BUCKET}/`;
  return [...new Set(urls.map((url) => {
    const index = url.indexOf(prefix);
    return index === -1 ? null : decodeURIComponent(url.slice(index + prefix.length).split("?")[0]);
  }).filter((path): path is string => Boolean(path)))];
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
}
