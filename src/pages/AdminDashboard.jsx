import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LogOut, CheckCircle2, XCircle, RefreshCw, ExternalLink } from "lucide-react";
import { getSession, onAuthChange, signOut } from "../services/auth";
import { listOrders, approveOrder, rejectOrder } from "../services/orders";
import { PAGE_BG, PANEL_BG, TEXT_DARK, TEXT_MUTED, INPUT_BORDER } from "../lib/capsuleConfig";

const STATUS_COLORS = {
  PENDIENTE: "#C9973F",
  APROBADO: "#4C9A6A",
  RECHAZADO: "#B5545F",
};

export default function AdminDashboard() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await listOrders());
    } catch {
      toast.error("No se pudieron cargar los pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getSession().then((session) => {
      if (!session) { navigate("/admin/login"); return; }
      setCheckingAuth(false);
      load();
    });
    const unsub = onAuthChange((session) => { if (!session) navigate("/admin/login"); });
    return unsub;
  }, [navigate, load]);

  async function handleApprove(id) {
    setBusyId(id);
    try {
      const { emailError } = await approveOrder(id);
      if (emailError) {
        toast.error(`Pedido aprobado, pero el correo NO se envió: ${emailError}`, { duration: 8000 });
      } else {
        toast.success("Pedido aprobado. Se envió el correo con el QR.");
      }
      load();
    } catch {
      toast.error("No se pudo aprobar el pedido.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    setBusyId(id);
    try {
      await rejectOrder(id);
      toast.success("Pedido rechazado.");
      load();
    } catch {
      toast.error("No se pudo rechazar el pedido.");
    } finally {
      setBusyId(null);
    }
  }

  if (checkingAuth) return null;

  const pending = orders.filter((o) => o.payment_status === "PENDIENTE");
  const resolved = orders.filter((o) => o.payment_status !== "PENDIENTE");

  return (
    <div style={{ background: PAGE_BG, minHeight: "100vh", color: TEXT_DARK }} className="w-full">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Pedidos</h1>
          <div className="flex items-center gap-3">
            <button onClick={load} className="flex items-center gap-1 rv-mono" style={{ fontSize: 12, color: TEXT_MUTED }}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> actualizar
            </button>
            <button onClick={async () => { await signOut(); navigate("/admin/login"); }} className="flex items-center gap-1 rv-mono" style={{ fontSize: 12, color: TEXT_MUTED }}>
              <LogOut size={13} /> salir
            </button>
          </div>
        </div>

        <h2 className="rv-mono uppercase mb-3" style={{ fontSize: 12, letterSpacing: "0.08em", color: TEXT_MUTED }}>
          Pendientes de aprobar ({pending.length})
        </h2>
        <div className="flex flex-col gap-3 mb-10">
          {pending.length === 0 && <p style={{ color: TEXT_MUTED, fontSize: 13 }}>No hay pedidos pendientes.</p>}
          {pending.map((o) => (
            <OrderCard key={o.id} order={o} busy={busyId === o.id} onApprove={() => handleApprove(o.id)} onReject={() => handleReject(o.id)} />
          ))}
        </div>

        <h2 className="rv-mono uppercase mb-3" style={{ fontSize: 12, letterSpacing: "0.08em", color: TEXT_MUTED }}>
          Historial
        </h2>
        <div className="flex flex-col gap-3">
          {resolved.map((o) => (
            <OrderCard key={o.id} order={o} readOnly />
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, onApprove, onReject, busy, readOnly }) {
  return (
    <div className="rounded-xl p-4" style={{ background: PANEL_BG, border: `1px solid ${INPUT_BORDER}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="rv-mono" style={{ fontSize: 12, color: TEXT_MUTED }}>{order.order_code}</span>
        <span className="rv-mono uppercase" style={{ fontSize: 10, color: STATUS_COLORS[order.payment_status] || TEXT_MUTED }}>
          {order.payment_status}
        </span>
      </div>
      <p style={{ fontSize: 14, fontWeight: 600 }}>{order.full_name}</p>
      <p style={{ fontSize: 12, color: TEXT_MUTED }}>{order.email} · {order.whatsapp}</p>
      <p style={{ fontSize: 12, color: TEXT_MUTED }}>Ocasión: {order.occasion} · Precio: ${order.price}</p>
      {order.photos?.[0]?.url && (
        <a href={order.photos[0].url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1" style={{ fontSize: 11, color: TEXT_MUTED }}>
          <ExternalLink size={11} /> ver primera foto
        </a>
      )}
      {!readOnly && (
        <div className="flex gap-2 mt-3">
          <button onClick={onApprove} disabled={busy} className="flex items-center gap-1 rounded-full px-3 py-1.5 disabled:opacity-60" style={{ background: "#4C9A6A", color: "#FFF", fontSize: 12 }}>
            <CheckCircle2 size={13} /> Aprobar
          </button>
          <button onClick={onReject} disabled={busy} className="flex items-center gap-1 rounded-full px-3 py-1.5 disabled:opacity-60" style={{ background: "#B5545F", color: "#FFF", fontSize: 12 }}>
            <XCircle size={13} /> Rechazar
          </button>
        </div>
      )}
    </div>
  );
}
