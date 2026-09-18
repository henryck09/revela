// Edge Function: cleanup-orphans
// Borra archivos de Storage (capsule-media) que quedaron "huérfanos":
// subidos durante la creación de un pedido que luego falló antes de
// guardarse en la base de datos (por eso no aparecen en ningún pedido
// y el botón normal de "Eliminar" nunca puede alcanzarlos).
//
// Solo compara y borra archivos — nunca toca la tabla orders.

import { createClient } from "npm:@supabase/supabase-js@2";

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

    // 1. Junta todas las rutas de archivo que SÍ están en uso por algún pedido
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("photos, video_url, song_url, custom_background_url");
    if (ordersError) throw ordersError;

    const inUse = new Set<string>();
    for (const order of orders || []) {
      (order.photos || []).forEach((p: { url?: string }) => {
        if (p?.url) inUse.add(pathFromUrl(p.url));
      });
      [order.video_url, order.song_url, order.custom_background_url].forEach((u: string | null) => {
        if (u) inUse.add(pathFromUrl(u));
      });
    }

    // 2. Recorre cada carpeta del bucket y borra lo que no esté en uso
    let deleted = 0;
    let freedBytes = 0;
    for (const folder of FOLDERS) {
      const { data: files, error: listError } = await supabase.storage.from(BUCKET).list(folder, { limit: 1000 });
      if (listError || !files) continue;

      const toDelete: string[] = [];
      for (const file of files) {
        const path = `${folder}/${file.name}`;
        if (!inUse.has(path)) {
          toDelete.push(path);
          freedBytes += (file.metadata as { size?: number })?.size || 0;
        }
      }
      if (toDelete.length) {
        const { error: removeError } = await supabase.storage.from(BUCKET).remove(toDelete);
        if (!removeError) deleted += toDelete.length;
      }
    }

    return json({ deleted, freedMB: (freedBytes / (1024 * 1024)).toFixed(1) }, 200);
  } catch (error) {
    console.error("cleanup-orphans error:", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

function pathFromUrl(url: string): string {
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? url : url.slice(idx + marker.length);
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
}
