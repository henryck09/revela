import { supabase } from "./supabase";

/**
 * Pide a la Edge Function r2-presign un permiso temporal de subida hacia
 * Cloudflare R2, y devuelve tanto la URL de subida (firmada, de un solo uso)
 * como la URL pública final donde va a quedar el archivo.
 */
async function getPresignedUpload(file, folder) {
  const extension = (file.name.split(".").pop() || "bin").toLowerCase();
  const { data, error } = await supabase.functions.invoke("r2-presign", {
    body: { folder, extension, contentType: file.type, size: file.size },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data; // { uploadUrl, publicUrl }
}

/**
 * Sube un archivo a Cloudflare R2 y devuelve su URL pública.
 * folder ayuda a organizar: p.ej. "photos", "videos", "songs", "backgrounds".
 */
export async function uploadFile(file, folder) {
  const { uploadUrl, publicUrl } = await getPresignedUpload(file, folder);

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: file.type ? { "Content-Type": file.type } : {},
    body: file,
  });
  if (!response.ok) throw new Error("No se pudo subir el archivo.");

  return publicUrl;
}

/** Sube varias fotos (array de File) y devuelve [{ url, caption }] preservando el orden y los captions dados */
export async function uploadPhotos(photoObjects) {
  const uploaded = [];
  for (const p of photoObjects) {
    // p.file es el objeto File original; p.caption es el texto opcional
    const url = await uploadFile(p.file, "photos");
    uploaded.push({ url, caption: p.caption || "" });
  }
  return uploaded;
}
