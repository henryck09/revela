import { supabase } from "./supabase";

const BUCKET = "capsule-media";

/**
 * Sube un archivo al bucket público "capsule-media" y devuelve su URL pública.
 * folder ayuda a organizar: p.ej. "photos", "videos", "songs", "backgrounds".
 */
export async function uploadFile(file, folder) {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
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
