import { supabase } from "./supabase";
import { generateOrderCode } from "../utils/generateOrderCode";

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

export async function listOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function approveOrder(orderId) {
  const { data, error } = await supabase
    .from("orders")
    .update({ payment_status: "APROBADO", status: "COMPLETADO" })
    .eq("id", orderId)
    .select()
    .single();
  if (error) throw error;
  return { order: data, emailError: await sendOrderEmail(data.id) };
}

/** Sends the printable QR card to the administrator for manual forwarding. */
export async function sendOrderEmail(orderId) {
  const { data, error } = await supabase.functions.invoke("send-capsule-email", { body: { orderId } });
  if (error) return error.message || "No se pudo enviar el correo";
  if (data?.error) return typeof data.error === "string" ? data.error : JSON.stringify(data.error);
  return null;
}

export async function rejectOrder(orderId) {
  const { data, error } = await supabase
    .from("orders")
    .update({ payment_status: "RECHAZADO", status: "RECHAZADO" })
    .eq("id", orderId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Deletes the record and its uploaded media through the protected Edge Function. */
export async function deleteOrder(orderId) {
  const { data, error } = await supabase.functions.invoke("delete-order", { body: { orderId } });
  if (error) throw error;
  if (data?.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
  return data;
}
