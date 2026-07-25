# Guía rápida de despliegue — Revela

Para el manual completo (arquitectura, flujo, panel admin, seguridad, mantenimiento), abre
`docs/Manual_operativo_Revela.docx`. Esto de aquí es solo la checklist para dejarlo funcionando.

## Cómo funciona el envío de correo ahora

Ya no se le envía el QR directamente al cliente por correo (eso exigiría verificar un dominio en
Resend, y quedamos en que por ahora seguimos 100% gratis). En su lugar:

1. Apruebas el pedido en `/admin`.
2. Resend te manda la tarjeta QR (cuadrada, lista para imprimir) a **tu propio correo**
   (`ADMIN_EMAIL`).
3. Tú la reenvías manualmente al cliente, o la imprimes y se la entregas.

## 1. Base de datos, storage y permisos

1. Supabase → **SQL Editor** → pega **todo** `supabase/schema.sql` → **Run**.
   (Este archivo ya incluye los permisos de esquema y las políticas para admin que antes había que
   agregar a mano — si es una reinstalación, correrlo de nuevo no rompe nada.)
2. **Authentication → Users → Add user** → tu usuario admin, confírmalo ahí mismo.

## 2. Resend

1. Cuenta gratis en [resend.com](https://resend.com) → **API Keys** → crea una y cópiala.
2. Usarás el remitente de pruebas `onboarding@resend.dev`. Solo entrega a **la casilla con la que
   te registraste en Resend** — por eso `ADMIN_EMAIL` (abajo) debe ser exactamente esa dirección.

## 3. Desplegar las dos Edge Functions

Parado dentro de la carpeta `revela-demo/` (donde está `package.json`):

```bash
npm install -g supabase       # una sola vez en tu computador
supabase login
supabase link --project-ref aypwugtvxozzboqkigxc

supabase secrets set RESEND_API_KEY=tu_api_key_de_resend
supabase secrets set SITE_URL=https://tu-proyecto.vercel.app
supabase secrets set FROM_EMAIL="Revela <onboarding@resend.dev>"
supabase secrets set ADMIN_EMAIL=tu-correo-de-resend@ejemplo.com

supabase functions deploy send-capsule-email
supabase functions deploy delete-order
```

El archivo `supabase/config.toml` ya trae la configuración correcta de cada función (por qué cada
una la necesita está explicado ahí mismo, en los comentarios), así que no hace falta agregar flags
manuales al desplegar.

**Para confirmar que se desplegó bien:** en el dashboard de Supabase → **Edge Functions →
send-capsule-email → Code**, el código debe empezar con el comentario
`// Sends a printable QR card...`. Si en cambio ves `Hello from Functions!`, revisa que estabas
parado dentro de `revela-demo/` (no en una carpeta contenedora) al desplegar.

## 4. Vercel

1. Sube el proyecto a GitHub (`git init`, `git add .`, `git commit`, `git push`).
2. En [vercel.com](https://vercel.com) → **Add New → Project** → conecta el repo.
3. Antes de darle Deploy, en **Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_WHATSAPP_NUMBER` (tu número real, sin `+` ni espacios)
   - `VITE_SITE_URL` (la URL que te da Vercel; si cambia después, actualízala aquí y también el
     secreto `SITE_URL` en Supabase, y vuelve a desplegar `send-capsule-email`)
4. **Deploy.**

## 5. Prueba de punta a punta

1. Crea una cápsula de prueba en el sitio.
2. Confirma → WhatsApp con el código de pedido.
3. En `/admin`, aprueba el pedido.
4. Revisa tu correo (`ADMIN_EMAIL`): debe llegar la tarjeta cuadrada con el QR.
5. Prueba escanear el QR desde otro teléfono.
6. Prueba también **Reenviar tarjeta**, **Eliminar** (con un pedido de prueba) y los filtros/buscador
   del panel.

Si algo falla, revisa primero **Supabase → Edge Functions → [nombre] → Logs** — ahora ambas
funciones dejan mensajes de error claros ahí (secretos faltantes, permisos, etc.) en vez de fallar
en silencio.

## Límites gratuitos

- **Supabase**: 500MB de base de datos, 1GB de storage. Los límites de tamaño en el creador
  (video 20MB, fotos/audio 8MB) ayudan a que rinda para más pedidos.
- **Vercel**: gratis, sin límite de proyectos personales.
- **Resend**: 3,000 correos/mes — de sobra, ya que ahora solo te envía a ti.
