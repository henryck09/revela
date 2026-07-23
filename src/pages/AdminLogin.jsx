import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Lock } from "lucide-react";
import { signIn } from "../services/auth";
import { PAGE_BG, PANEL_BG, TEXT_DARK, TEXT_MUTED, INPUT_BG, INPUT_BORDER } from "../lib/capsuleConfig";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/admin");
    } catch {
      toast.error("Correo o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: PAGE_BG, minHeight: "100vh", color: TEXT_DARK }} className="w-full flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="max-w-sm w-full rounded-2xl p-8" style={{ background: PANEL_BG, border: `1px solid ${INPUT_BORDER}` }}>
        <div className="flex items-center gap-2 mb-6">
          <Lock size={18} color={TEXT_MUTED} />
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Panel de Revela</h1>
        </div>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo del administrador"
          className="w-full rounded-lg px-3 py-2 mb-3 outline-none" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, fontSize: 13 }}
          required
        />
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña"
          className="w-full rounded-lg px-3 py-2 mb-4 outline-none" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, fontSize: 13 }}
          required
        />
        <button type="submit" disabled={loading} className="w-full rounded-full py-2.5 disabled:opacity-60" style={{ background: TEXT_DARK, color: "#FFF", fontWeight: 600, fontSize: 13 }}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
