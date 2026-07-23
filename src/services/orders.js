import { supabase } from "./supabase";
import { generateOrderCode } from "../utils/generateOrderCode";

/**
 * Crea un pedido en estado PENDIENTE.
 */
export async function createOrder(order) {
  const orderCode = generateOrderCode();

  const { data, error } = await supabase
    .from("orders")
    .insert({
      order_code: orderCode,
      full_name: order.full_name,
      email: order.email,
      whatsapp: order.whatsapp,
      occasion: order.occasion,
      accent: order.accent,
      background: order.background,
      custom_background_url: order.custom_background_url || null,
      font: order.font,
      main_text: order.main_text,
      closing_text: order.closing_text,
      special_date: order.special_date || null,
      youtube_url: order.youtube_url || null,
      youtube_start: order.youtube_start || 0,
      song_url: order.song_url || null,
      photos: order.photos || [],
      video_url: order.video_url || null,
      price: order.price,
      status: "PENDIENTE",
      payment_status: "PENDIENTE",
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Obtiene un pedido aprobado por código.
 */
export async function getOrderByCode(orderCode) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_code", orderCode)
    .eq("payment_status", "APROBADO")
    .single();

  if (error) throw error;

  return data;
}

/**
 * Lista todos los pedidos.
 */
export async function listOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

/**
 * Aprueba un pedido y envía el correo.
 */
export async function approveOrder(orderId) {
  const { data, error } = await supabase
    .from("orders")
    .update({
      payment_status: "APROBADO",
      status: "COMPLETADO",
    })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;

  // Dispara la Edge Function que envía el correo con el QR.
  // Si falla, el pedido ya quedó aprobado igual, pero devolvemos el error
  // para que el panel pueda avisarte con un mensaje claro.
  const { data: fnData, error: fnError } = await supabase.functions.invoke("send-capsule-email", {
    body: { orderId: data.id },
  });

  if (fnError) {
    console.error("Edge Function send-capsule-email falló:", fnError);
    return { order: data, emailError: fnError.message || "No se pudo enviar el correo" };
  }
  if (fnData?.error) {
    console.error("send-capsule-email respondió con error:", fnData.error);
    return { order: data, emailError: typeof fnData.error === "string" ? fnData.error : JSON.stringify(fnData.error) };
  }

  return { order: data, emailError: null };
}

/**
 * Rechaza un pedido.
 */
export async function rejectOrder(orderId) {
  const { data, error } = await supabase
    .from("orders")
    .update({
      payment_status: "RECHAZADO",
      status: "RECHAZADO",
    })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;

  return data;
}