// Sends a printable QR card to the administrator for manual forwarding.
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
    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    if (!resendApiKey || !siteUrl || !fromEmail || !adminEmail) {
      return json({ error: "Faltan secretos: RESEND_API_KEY, SITE_URL, FROM_EMAIL o ADMIN_EMAIL." }, 500);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: order, error } = await supabase.from("orders").select("*").eq("id", orderId).single();
    if (error) throw error;

    const capsuleUrl = `${siteUrl.replace(/\/$/, "")}/m/${order.order_code}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&margin=20&format=png&data=${encodeURIComponent(capsuleUrl)}`;

    const resend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: [adminEmail],
        subject: `[${order.order_code}] Tarjeta Revela para ${order.full_name || "cliente"}`,
        text: `Pedido ${order.order_code}. Reenvia esta tarjeta a ${order.full_name || "cliente"} (${order.email}). Enlace alternativo: ${capsuleUrl}`,
        html: `
          <div style="margin:0;padding:24px;background:#f7f3eb;text-align:center">
            <div style="width:480px;height:480px;max-width:100%;margin:0 auto;box-sizing:border-box;background:#fffdf8;border:7px solid #281f47;border-radius:36px;padding:34px 26px;overflow:hidden;font-family:Georgia,serif;color:#30264d;text-align:center">
              <div style="font-size:27px;line-height:1;margin:0 0 15px">&#10024;</div>
              <p style="margin:0 0 21px;font-size:22px;line-height:1.3;font-style:italic;font-weight:bold">
                Alguien prepar&oacute; algo bonito<br />para ti
              </p>
              <div style="display:inline-block;background:#fbf7ef;border:1px solid #e3d9c6;border-radius:18px;padding:13px">
                <img src="cid:revela-capsule-qr" width="280" height="280" alt="Codigo QR: escanea para revelar tu sorpresa" style="display:block;border:0;max-width:100%;height:auto" />
              </div>
              <p style="margin:17px 0 0;font-family:Arial,sans-serif;font-size:12px;line-height:1.45;color:#756b91">
                Escanea el c&oacute;digo QR con la c&aacute;mara<br />de tu tel&eacute;fono para revelar tu sorpresa.
              </p>
            </div>
          </div>
        `,
        attachments: [{
          path: qrImageUrl,
          filename: `tarjeta-revela-${order.order_code}.png`,
          content_id: "revela-capsule-qr",
          content_type: "image/png",
        }],
      }),
    });

    const body = await resend.text();
    if (!resend.ok) console.error("Resend responded with an error:", resend.status, body);
    return new Response(body, { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: resend.status });
  } catch (error) {
    console.error("send-capsule-email error:", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
}
