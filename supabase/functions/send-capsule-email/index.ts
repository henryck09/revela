// Edge Function: send-capsule-email
// It runs after an administrator approves an order.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { orderId } = await req.json();
    if (!orderId) return json({ error: "Falta orderId en el body" }, 400);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const siteUrl = Deno.env.get("SITE_URL");
    const fromEmail = Deno.env.get("FROM_EMAIL");
    if (!resendApiKey || !siteUrl || !fromEmail) {
      return json({ error: "Faltan secretos: RESEND_API_KEY, SITE_URL o FROM_EMAIL." }, 500);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
    if (error) throw error;

    const capsuleUrl = `${siteUrl.replace(/\/$/, "")}/m/${order.order_code}`;
    // Email apps often block externally-hosted images. Adding the QR as a CID
    // attachment makes it part of the message, so it survives printing.
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&margin=16&format=png&data=${encodeURIComponent(capsuleUrl)}`;
    const recipientName = escapeHtml(order.full_name || "");

    const resend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [order.email],
        subject: "Tu capsula Revela esta lista",
        text: `Hola ${order.full_name || ""}. Tu capsula ya esta disponible: ${capsuleUrl}`,
        html: `
          <h2>Hola ${recipientName}</h2>
          <p>Tu capsula ya esta disponible.</p>
          <p>Imprime este codigo QR y escanealo con la camara del telefono para abrir la sorpresa.</p>
          <a href="${capsuleUrl}" style="display:inline-block;background:#fff;padding:12px;border:1px solid #e3d9c6">
            <img src="cid:revela-capsule-qr" width="280" height="280" alt="Codigo QR para abrir tu capsula Revela" style="display:block;border:0" />
          </a>
          <p>Si estas viendo el correo en el telefono, <a href="${capsuleUrl}">abre la capsula aqui</a>.</p>
        `,
        attachments: [{
          path: qrImageUrl,
          filename: `revela-${order.order_code}.png`,
          content_id: "revela-capsule-qr",
          content_type: "image/png",
        }],
      }),
    });

    const body = await resend.text();
    if (!resend.ok) console.error("Resend responded with an error:", resend.status, body);

    return new Response(body, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: resend.status,
    });
  } catch (error) {
    console.error("send-capsule-email error:", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]);
}
