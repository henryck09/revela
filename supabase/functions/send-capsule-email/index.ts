// Sends a printable QR card to the administrator for manual forwarding.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Debe reflejar los mismos valores que src/lib/capsuleConfig.jsx
const OCCASIONS: Record<string, { emoji: string; message: string }> = {
  cumpleanos: { emoji: "🎂", message: "¡Feliz cumpleaños! Escanea para tu sorpresa" },
  aniversario: { emoji: "💍", message: "Escanea y revive nuestra historia juntos" },
  sanvalentin: { emoji: "❤️", message: "Un mensaje de amor te está esperando" },
  especial: { emoji: "✨", message: "Alguien preparó algo bonito para ti" },
};
const ACCENTS: Record<string, string> = { gold: "C9973F", rose: "C46B79", sage: "6B8F6B" };

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
    const accentHex = ACCENTS[order.accent] ?? ACCENTS.sage;
    const occasion = OCCASIONS[order.occasion] ?? OCCASIONS.especial;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&margin=16&format=png&color=${accentHex}&bgcolor=FFFFFF&data=${encodeURIComponent(capsuleUrl)}`;

    const resend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: [adminEmail],
        subject: `[${order.order_code}] Tarjeta Revela para ${order.full_name || "cliente"}`,
        text: `Pedido ${order.order_code}. Reenvia esta tarjeta a ${order.full_name || "cliente"} (${order.email}). Enlace alternativo: ${capsuleUrl}`,
        html: `
          <div style="margin:0;padding:32px;background:#f7f3eb;text-align:center">
            <div style="width:480px;height:480px;max-width:100%;margin:0 auto;box-sizing:border-box;background:#fffdf8;border:1px solid #${accentHex}55;border-radius:32px;padding:0;overflow:hidden;font-family:Georgia,serif;color:#30264d;text-align:center;box-shadow:0 18px 40px -18px rgba(40,31,71,0.35)">
              <div style="height:6px;background:linear-gradient(90deg,#${accentHex},#${accentHex}55)"></div>
              <div style="padding:30px 28px 34px">
                <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#${accentHex}">Revela</p>
                <div style="font-size:26px;line-height:1;margin:14px 0 12px">${occasion.emoji}</div>
                <p style="margin:0 0 22px;font-size:21px;line-height:1.35;font-style:italic;font-weight:bold;color:#30264d">
                  ${occasion.message}
                </p>
                <div style="display:inline-block;background:#fbf7ef;border:1px solid #${accentHex}66;border-radius:20px;padding:14px">
                  <img src="cid:revela-capsule-qr" width="270" height="270" alt="Codigo QR: escanea para revelar tu sorpresa" style="display:block;border:0;max-width:100%;height:auto;border-radius:6px" />
                </div>
                <p style="margin:20px 0 0;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#756b91">
                  Escanea el c&oacute;digo QR con la c&aacute;mara<br />de tu tel&eacute;fono para revelar tu sorpresa.
                </p>
              </div>
              <div style="height:6px;background:linear-gradient(90deg,#${accentHex}55,#${accentHex})"></div>
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
