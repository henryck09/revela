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

    const resend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [order.email],
        subject: "Tu tarjeta Revela esta lista para imprimir",
        // El enlace queda solo como alternativa de accesibilidad; la tarjeta
        // HTML no lo muestra porque está pensada para imprimir y entregar.
        text: `Tu tarjeta Revela esta lista. Imprime el codigo QR y escanealo con la camara del telefono. Enlace alternativo: ${capsuleUrl}`,
        html: `
          <div style="margin:0;padding:32px 16px;background:#f7f3eb;font-family:Georgia,serif;color:#30264d;text-align:center">
            <div style="max-width:480px;margin:0 auto;background:#fffdf8;border:7px solid #281f47;border-radius:42px;padding:42px 30px 38px;box-sizing:border-box">
              <div style="font-size:28px;line-height:1;margin-bottom:20px">&#10024;</div>
              <p style="margin:0 0 25px;font-size:23px;line-height:1.35;font-style:italic;font-weight:bold">
                Alguien prepar&oacute; algo bonito<br />para ti
              </p>
              <div style="display:inline-block;background:#fbf7ef;border:1px solid #e3d9c6;border-radius:22px;padding:18px">
                <img src="cid:revela-capsule-qr" width="320" height="320" alt="Codigo QR: escanea para revelar tu sorpresa" style="display:block;border:0;max-width:100%;height:auto" />
              </div>
              <p style="margin:28px 0 0;font-family:Arial,sans-serif;font-size:13px;line-height:1.55;color:#756b91">
                Escanea el c&oacute;digo QR con la c&aacute;mara de tu tel&eacute;fono<br />para revelar tu sorpresa.
              </p>
              <p style="margin:18px 0 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#9b91af">
                Tarjeta Revela &middot; lista para imprimir
              </p>
            </div>
          </div>
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
