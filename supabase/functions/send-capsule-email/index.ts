// Edge Function: send-capsule-email
// Se dispara desde el panel admin (approveOrder) cuando se aprueba un pago.
// Genera el link + imagen QR de la cápsula final y envía el correo con Resend.
//
// Variables de entorno necesarias (Supabase > Project Settings > Edge Functions > Secrets):
//   RESEND_API_KEY   -> tu API key de https://resend.com
//   SITE_URL         -> ej. https://revela.vercel.app (sin barra final)
//   FROM_EMAIL       -> remitente, ej. "Revela <onboarding@resend.dev>" mientras no tengas dominio propio
//
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "Falta orderId en el body" }), { headers: corsHeaders, status: 400 });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SITE_URL = Deno.env.get("SITE_URL");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL");
    if (!RESEND_API_KEY || !SITE_URL || !FROM_EMAIL) {
      return new Response(
        JSON.stringify({
          error: "Faltan secretos de la función (RESEND_API_KEY / SITE_URL / FROM_EMAIL). Configúralos con 'supabase secrets set' y vuelve a desplegar.",
        }),
        { headers: corsHeaders, status: 500 }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error) throw error;

    const capsuleUrl = `${SITE_URL}/m/${order.order_code}`;
    const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(capsuleUrl)}`;

    const resend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [order.email],
        subject: "Tu cápsula Revela está lista",
        html: `
          <h2>Hola ${order.full_name}</h2>
          <p>Tu cápsula ya está disponible.</p>
          <img src="${qrImage}" width="220"/>
          <p>
            <a href="${capsuleUrl}">
              Abrir cápsula
            </a>
          </p>
        `,
      }),
    });

    const body = await resend.text();

    if (!resend.ok) {
      console.error("Resend respondió con error:", resend.status, body);
    }

    return new Response(body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: resend.status,
    });
  } catch (e) {
    console.error("send-capsule-email error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        headers: corsHeaders,
        status: 500,
      }
    );
  }
});