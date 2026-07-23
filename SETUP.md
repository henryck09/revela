# Guía de puesta en marcha — Revela (100% gratis)

## ⚠️ Por qué no te llegaba el correo (léelo primero)

En los archivos que me mandaste encontré el problema exacto: tenías **dos carpetas `supabase/`**:

```
revela-demo/              <- carpeta contenedora (NO es el proyecto)
├── revela-demo/           <- el proyecto real (la app de React)
│   └── supabase/          <- ✅ la función CORRECTA (con el código de Resend)
└── supabase/               <- ❌ carpeta creada por error, con la función de EJEMPLO
                                ("Hello from Functions!") que Supabase pone por defecto
```

Lo que pasó: en algún momento se ejecutó `supabase init` (o `supabase functions deploy`) desde la
carpeta de afuera en lugar de entrar primero a la carpeta real del proyecto. Como resultado, lo que
quedó desplegado en Supabase era la función de ejemplo vacía, no la que envía el correo — por eso el
pedido se aprobaba sin ningún error, pero nunca llegaba nada.

**Ya corregí esto:** en el zip que te adjunto solo hay **una** carpeta `supabase/`, la correcta, dentro
del proyecto. Elimina por completo cualquier copia vieja que tengas en tu computador y usa únicamente
esta.

También aproveché para:
- Agregar límites de tamaño con avisos: si alguien sube una foto, video o canción muy pesada, la app
  se lo rechaza al instante y le pide comprimirlo, antes de que llegue a ocupar espacio en Supabase
  (video máx. 20MB, fotos máx. 8MB, audio máx. 8MB — lo puedes ajustar en `CreatorPage.jsx`, constantes
  `MAX_VIDEO_MB`, `MAX_PHOTO_MB`, `MAX_SONG_MB`).
- Hacer que el panel admin te avise con un mensaje claro si el correo falla al aprobar (antes fallaba
  en silencio).
- Mejorar la función de correo para que te diga exactamente qué falta si te olvidas de configurar
  algún secreto (API key de Resend, etc.).

---

## 0. Antes de empezar: borra las carpetas viejas

En tu computador, borra por completo la carpeta de proyecto que tenías (todas las copias, incluida
cualquier `revela-demo/revela-demo` o `supabase/` sueltos). Descomprime el zip nuevo en un lugar limpio
y trabaja solo desde ahí. La carpeta del proyecto se llama `revela-demo/` y contiene `src/`, `supabase/`,
`package.json`, etc. **directamente adentro** — no debe haber otra carpeta `revela-demo` dentro de ella.

---

## 1. Base de datos y storage en Supabase

*(Si ya lo hiciste la vez pasada y sigue funcionando, puedes saltar este paso — el esquema no cambió.)*

1. Entra a tu proyecto en [supabase.com](https://supabase.com/dashboard).
2. **SQL Editor → New query** → pega todo `supabase/schema.sql` → **Run**.
3. **Authentication → Users → Add user** → crea tu usuario admin (correo + contraseña), confírmalo ahí
   mismo.

## 2. Resend (envío de correos)

1. Crea cuenta gratis en [resend.com](https://resend.com).
2. **API Keys** → crea una y cópiala.
3. Sin dominio propio verificado, usa el remitente `onboarding@resend.dev` — funciona, pero **solo
   entrega correos a la casilla con la que creaste la cuenta de Resend**. Para enviar a clientes reales,
   verifica un dominio propio en Resend (gratis, es cuestión de agregar unos registros DNS).

## 3. Desplegar la Edge Function — PASO A PASO, sin saltarse el `cd`

Todo esto se ejecuta en una terminal en tu computador (no aquí en el chat), **parado exactamente
dentro de la carpeta `revela-demo/` del proyecto** (la que tiene `package.json`).

```bash
# 1. Entra a la carpeta del proyecto (ajusta la ruta a donde lo descomprimiste)
cd ruta/a/revela-demo

# 2. Confirma que estás en el lugar correcto: esto debe listar package.json y supabase/
ls

# 3. Instala el CLI de Supabase (una sola vez en tu computador)
npm install -g supabase

# 4. Inicia sesión
supabase login

# 5. Enlaza este proyecto con tu proyecto de Supabase
#    (el project-ref lo ves en la URL: https://TU_PROJECT_REF.supabase.co)
supabase link --project-ref aypwugtvxozzboqkigxc

# 6. Configura los secretos de la función (reemplaza con tus datos reales)
supabase secrets set RESEND_API_KEY=tu_api_key_de_resend
supabase secrets set SITE_URL=https://tu-proyecto.vercel.app
supabase secrets set FROM_EMAIL="Revela <onboarding@resend.dev>"

# 7. Despliega — OJO: debes seguir estando dentro de revela-demo/
supabase functions deploy send-capsule-email
```

**Cómo confirmar que desplegaste la función correcta:** entra a tu proyecto en supabase.com →
**Edge Functions → send-capsule-email → Code**. Debe mostrar el código que empieza con
`// Edge Function: send-capsule-email`, NO el texto `Hello from Functions!`. Si ves "Hello from
Functions", es que se desplegó desde la carpeta equivocada — revisa en qué carpeta estabas parado (paso 1)
y repite el paso 7.

## 4. Subir a GitHub

```bash
cd revela-demo
git init
git add .
git commit -m "Revela: flujo completo de pedidos"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/revela.git
git push -u origin main
```

## 5. Desplegar en Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → conecta GitHub → selecciona el repo.
2. Antes de darle Deploy, en **Environment Variables** agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_WHATSAPP_NUMBER` → tu número real, sin `+` ni espacios (ej. `593987654321`). Ahora mismo en
     tu `.env` local sigue el número de prueba `593999999999` — cámbialo también ahí.
   - `VITE_SITE_URL` → la URL que te da Vercel, ej. `https://revela.vercel.app`
3. **Deploy**. Cuando tengas la URL final, si cambió, actualiza `VITE_SITE_URL` en Vercel y el secreto
   `SITE_URL` en Supabase (paso 3.6), y vuelve a desplegar ambos.

## 6. Probar el flujo completo de nuevo

1. Crea una cápsula de prueba con tu propio correo.
2. Confirma → te lleva a WhatsApp.
3. Entra a `/admin/login`, aprueba el pedido.
4. Si el correo **no llega**, revisa en Supabase → **Edge Functions → send-capsule-email → Logs** —
   ahora la función deja un mensaje claro ahí si falta algún secreto o si Resend rechazó el envío.
   El panel admin también te muestra el error directamente en pantalla al aprobar.

---

## Límites gratuitos a tener en cuenta

- **Supabase**: 500MB de base de datos, 1GB de storage. Los límites de tamaño que agregué (20MB video,
  8MB fotos/audio) ayudan a que este espacio te rinda para más pedidos.
- **Vercel**: gratis, sin límite de proyectos personales.
- **Resend**: 3,000 correos/mes, 100/día.
