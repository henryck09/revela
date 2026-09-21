// Edge Function: r2-presign
// Genera una URL de subida firmada y temporal hacia Cloudflare R2.
// El navegador del cliente nunca ve las claves secretas de R2: solo recibe
// esta URL de un solo uso, sube el archivo directo a R2, y listo.

import { AwsClient } from "npm:aws4fetch@^1.0.17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOLDER_LIMITS_MB: Record<string, number> = {
  photos: 8,
  videos: 20,
  songs: 8,
  backgrounds: 8,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { folder, extension, contentType, size } = await req.json();

    if (!folder || !(folder in FOLDER_LIMITS_MB)) {
      return json({ error: "Carpeta no válida." }, 400);
    }
    const maxBytes = FOLDER_LIMITS_MB[folder] * 1024 * 1024;
    if (typeof size === "number" && size > maxBytes) {
      return json({ error: `El archivo supera el máximo permitido (${FOLDER_LIMITS_MB[folder]}MB).` }, 400);
    }

    const safeExt = String(extension || "bin").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "bin";
    const key = `${folder}/${crypto.randomUUID()}.${safeExt}`;

    const accountId = Deno.env.get("R2_ACCOUNT_ID")!;
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
    const bucket = Deno.env.get("R2_BUCKET")!;
    const publicBase = Deno.env.get("R2_PUBLIC_URL")!.replace(/\/$/, "");

    const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;

    const signedRequest = await client.sign(endpoint, {
      method: "PUT",
      headers: contentType ? { "Content-Type": contentType } : {},
      aws: { signQuery: true },
    });

    return json({
      uploadUrl: signedRequest.url,
      publicUrl: `${publicBase}/${key}`,
    }, 200);
  } catch (error) {
    console.error("r2-presign error:", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
}
