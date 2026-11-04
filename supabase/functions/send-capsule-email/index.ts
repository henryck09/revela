// Sends a printable QR card to the administrator for manual forwarding.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Debe reflejar los mismos valores que src/lib/capsuleConfig.jsx
const OCCASIONS: Record<string, { emoji: string; message: string }> = {
  cumpleanos: { emoji: "🎂", message: "¡Feliz cumpleaños! Tu sorpresa te espera" },
  aniversario: { emoji: "💍", message: "Revive nuestra historia juntos" },
  sanvalentin: { emoji: "❤️", message: "Un mensaje de amor te está esperando" },
  navidad: { emoji: "🎄", message: "Un regalo especial para ti en esta Navidad 🎄" },
  especial: { emoji: "✨", message: "Alguien preparó algo bonito para ti" },
};
const ACCENTS: Record<string, string> = {
  gold: "C9973F", rose: "C46B79", sage: "6B8F6B",
  crimson: "991B1B", pine: "065F46", xmasgold: "D97706",
};
// Navidad: el QR va en rojo oscuro o verde pino (alto contraste); el dorado no se lee bien sobre blanco
const XMAS_QR_COLORS: Record<string, string> = { "991B1B": "8B0000", "065F46": "0F5132", "D97706": "8B0000" };

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
    const isXmas = order.occasion === "navidad";
    const qrColor = isXmas ? (XMAS_QR_COLORS[accentHex] ?? "8B0000") : accentHex;
    // Navidad: franjas rojo-verde-rojo arriba y abajo de la tarjeta
    const topBar = isXmas ? "linear-gradient(90deg,#991B1B,#065F46,#991B1B)" : `linear-gradient(90deg,#${accentHex},#${accentHex}55)`;
    const bottomBar = isXmas ? "linear-gradient(90deg,#991B1B,#065F46,#991B1B)" : `linear-gradient(90deg,#${accentHex}55,#${accentHex})`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&margin=16&format=png&color=${qrColor}&bgcolor=FFFFFF&data=${encodeURIComponent(capsuleUrl)}`;

    // El QR se adjunta como imagen en línea. En Navidad, la guirnalda y el gorro de Santa van como
    // una segunda imagen en línea pegada justo encima del QR. Se descarga de tu sitio
    // (public/xmas-decor.png), igual que el QR, que es el método que ya sabemos que funciona.
    const qrFilename = `tarjeta-revela-${order.order_code}.png`;
    const attachments: Record<string, string>[] = [
      { path: qrImageUrl, filename: qrFilename, content_id: "revela-capsule-qr", content_type: "image/png" },
    ];
    if (isXmas) {
      attachments.push({ path: `${siteUrl.replace(/\/$/, "")}/xmas-decor.png`, filename: "adornos-navidad.png", content_id: "revela-xmas-decor", content_type: "image/png" });
    }
    // La franja mide 1200x230 y el QR queda centrado a 1000 de ancho: se escala igual que el QR (270 px)
    const decorW = Math.round((270 * 1200) / 1000);
    const decorH = Math.round((decorW * 230) / 1200);
    const decorHtml = isXmas
      ? `<img src="cid:revela-xmas-decor" width="${decorW}" height="${decorH}" alt="" style="display:block;border:0;margin:0 auto" />`
      : "";

    console.log(`Tarjeta ${order.order_code}: ocasión=${order.occasion}, navideña=${isXmas}, adjuntos=${attachments.length}`);

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
            <div style="width:480px;height:${isXmas ? "auto" : "480px"};min-height:480px;max-width:100%;margin:0 auto;box-sizing:border-box;background:#fffdf8;border:1px solid #${accentHex}55;border-radius:32px;padding:0;overflow:hidden;font-family:Georgia,serif;color:#30264d;text-align:center;box-shadow:0 18px 40px -18px rgba(40,31,71,0.35)">
              <div style="height:6px;background:${topBar}"></div>
              <div style="padding:30px 28px 34px">
                <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#${accentHex}">Revela</p>
                <div style="font-size:26px;line-height:1;margin:14px 0 12px">${occasion.emoji}</div>
                <p style="margin:0 0 22px;font-size:21px;line-height:1.35;font-style:italic;font-weight:bold;color:#30264d">
                  ${occasion.message}
                </p>
                <div style="display:inline-block;background:#fbf7ef;border:1px solid #${accentHex}66;border-radius:20px;padding:14px">
                  ${decorHtml}
                  <img src="cid:revela-capsule-qr" width="270" height="270" alt="Codigo QR" style="display:block;border:0;margin:0 auto;border-radius:6px" />
                </div>
              </div>
              <div style="height:6px;background:${bottomBar}"></div>
            </div>
          </div>
        `,
        attachments,
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
