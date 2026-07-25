import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CheckCircle2, ChevronDown, Copy, ExternalLink, LogOut, Mail,
  RefreshCw, Search, Send, Trash2, XCircle,
} from "lucide-react";
import { getSession, onAuthChange, signOut } from "../services/auth";
import { listOrders, approveOrder, rejectOrder, deleteOrder, sendOrderEmail } from "../services/orders";
import { PAGE_BG, PANEL_BG, TEXT_DARK, TEXT_MUTED, INPUT_BG, INPUT_BORDER } from "../lib/capsuleConfig";

const STATUS_COLORS = { PENDIENTE: "#C9973F", APROBADO: "#4C9A6A", RECHAZADO: "#B5545F" };
const dateFormatter = new Intl.DateTimeFormat("es-EC", { dateStyle: "medium", timeStyle: "short" });
const monthFormatter = new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric" });

export default function AdminDashboard() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("TODOS");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try { setOrders(await listOrders()); } catch { toast.error("No se pudieron cargar los pedidos."); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    getSession().then((session) => {
      if (!session) { navigate("/admin/login"); return; }
      setCheckingAuth(false);
      load();
    });
    return onAuthChange((session) => { if (!session) navigate("/admin/login"); });
  }, [navigate, load]);

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const needle = query.trim().toLowerCase();
    const matchesQuery = !needle || [order.order_code, order.full_name, order.email, order.whatsapp]
      .some((value) => String(value || "").toLowerCase().includes(needle));
    return matchesQuery && (filter === "TODOS" || order.payment_status === filter);
  }), [orders, query, filter]);

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((order) => order.payment_status === "PENDIENTE").length,
    approved: orders.filter((order) => order.payment_status === "APROBADO").length,
    revenue: orders.filter((order) => order.payment_status === "APROBADO").reduce((sum, order) => sum + Number(order.price || 0), 0),
  }), [orders]);

  async function handleApprove(id) {
    setBusyId(id);
    try {
      const { emailError } = await approveOrder(id);
      emailError
        ? toast.error(`Pedido aprobado, pero no se envió la tarjeta: ${emailError}`, { duration: 8000 })
        : toast.success("Pedido aprobado. La tarjeta llegó a tu correo para reenviarla.");
      load();
    } catch { toast.error("No se pudo aprobar el pedido."); } finally { setBusyId(null); }
  }

  async function handleReject(id) {
    setBusyId(id);
    try { await rejectOrder(id); toast.success("Pedido rechazado."); load(); }
    catch { toast.error("No se pudo rechazar el pedido."); }
    finally { setBusyId(null); }
  }

  async function handleResend(id) {
    setBusyId(id);
    try {
      const error = await sendOrderEmail(id);
      error ? toast.error(`No se pudo enviar la tarjeta: ${error}`) : toast.success("Tarjeta enviada a tu correo.");
    } finally { setBusyId(null); }
  }

  async function handleDelete(order) {
    const confirmed = window.confirm(`Eliminar el pedido ${order.order_code}? También se borrarán sus fotos, audio, video y fondo. Esta acción no se puede deshacer.`);
    if (!confirmed) return;
    setBusyId(order.id);
    try { await deleteOrder(order.id); toast.success("Pedido y archivos eliminados."); load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo eliminar el pedido."); }
    finally { setBusyId(null); }
  }

  if (checkingAuth) return null;
  const pending = filteredOrders.filter((order) => order.payment_status === "PENDIENTE");
  const historyGroups = groupOrders(filteredOrders.filter((order) => order.payment_status !== "PENDIENTE"));

  return (
    <div style={{ background: PAGE_BG, minHeight: "100vh", color: TEXT_DARK }} className="w-full">
      <div className="max-w-5xl mx-auto px-5 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-7">
          <div><p className="rv-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.12em", color: TEXT_MUTED }}>Revela / administración</p><h1 style={{ fontSize: 26, fontWeight: 600 }}>Control de pedidos</h1></div>
          <div className="flex items-center gap-3">
            <button onClick={load} className="flex items-center gap-1 rv-mono" style={{ fontSize: 12, color: TEXT_MUTED }}><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> actualizar</button>
            <button onClick={async () => { await signOut(); navigate("/admin/login"); }} className="flex items-center gap-1 rv-mono" style={{ fontSize: 12, color: TEXT_MUTED }}><LogOut size={13} /> salir</button>
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
          <Stat label="Total pedidos" value={stats.total} />
          <Stat label="Pendientes" value={stats.pending} color="#C9973F" />
          <Stat label="Aprobados" value={stats.approved} color="#4C9A6A" />
          <Stat label="Ingresos aprobados" value={`$${stats.revenue.toFixed(2)}`} color="#30264D" />
        </section>

        <section className="rounded-xl p-3 mb-8 flex flex-col md:flex-row gap-3" style={{ background: PANEL_BG, border: `1px solid ${INPUT_BORDER}` }}>
          <label className="flex-1 flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}` }}><Search size={15} color={TEXT_MUTED} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, correo, WhatsApp o código" className="w-full bg-transparent outline-none" style={{ fontSize: 13 }} /></label>
          <label className="relative flex items-center"><select value={filter} onChange={(event) => setFilter(event.target.value)} className="appearance-none rounded-lg px-3 py-2 pr-8 outline-none" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, fontSize: 12, color: TEXT_DARK }}><option value="TODOS">Todos los estados</option><option value="PENDIENTE">Pendientes</option><option value="APROBADO">Aprobados</option><option value="RECHAZADO">Rechazados</option></select><ChevronDown size={14} className="absolute right-2 pointer-events-none" color={TEXT_MUTED} /></label>
        </section>

        <SectionTitle>Por aprobar ({pending.length})</SectionTitle>
        <div className="flex flex-col gap-3 mb-10">
          {pending.length ? pending.map((order) => <OrderCard key={order.id} order={order} busy={busyId === order.id} onApprove={handleApprove} onReject={handleReject} onDelete={handleDelete} />) : <Empty>No hay pedidos pendientes con estos filtros.</Empty>}
        </div>

        <SectionTitle>Historial por periodo</SectionTitle>
        {historyGroups.length ? historyGroups.map((group) => <section key={group.label} className="mb-8"><h3 className="rv-mono uppercase mb-3" style={{ fontSize: 11, letterSpacing: "0.08em", color: TEXT_MUTED }}>{group.label} ({group.orders.length})</h3><div className="flex flex-col gap-3">{group.orders.map((order) => <OrderCard key={order.id} order={order} busy={busyId === order.id} onResend={handleResend} onDelete={handleDelete} />)}</div></section>) : <Empty>No hay pedidos en el historial con estos filtros.</Empty>}
      </div>
    </div>
  );
}

function Stat({ label, value, color = TEXT_DARK }) { return <div className="rounded-xl p-4" style={{ background: PANEL_BG, border: `1px solid ${INPUT_BORDER}` }}><p className="rv-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.08em", color: TEXT_MUTED }}>{label}</p><p style={{ marginTop: 5, fontSize: 22, fontWeight: 600, color }}>{value}</p></div>; }
function SectionTitle({ children }) { return <h2 className="rv-mono uppercase mb-3" style={{ fontSize: 12, letterSpacing: "0.08em", color: TEXT_MUTED }}>{children}</h2>; }
function Empty({ children }) { return <p className="mb-8" style={{ color: TEXT_MUTED, fontSize: 13 }}>{children}</p>; }

function OrderCard({ order, busy, onApprove, onReject, onResend, onDelete }) {
  const mediaCount = (order.photos?.length || 0) + Number(Boolean(order.video_url)) + Number(Boolean(order.song_url)) + Number(Boolean(order.custom_background_url));
  async function copyEmail() { try { await navigator.clipboard.writeText(order.email); toast.success("Correo copiado."); } catch { toast.error("No se pudo copiar el correo."); } }
  return <article className="rounded-xl p-4" style={{ background: PANEL_BG, border: `1px solid ${INPUT_BORDER}` }}>
    <div className="flex items-start justify-between gap-3 mb-2"><div><p className="rv-mono" style={{ fontSize: 12, color: TEXT_MUTED }}>{order.order_code}</p><p style={{ fontSize: 15, fontWeight: 600 }}>{order.full_name}</p></div><div className="flex items-center gap-2"><span className="rv-mono uppercase" style={{ fontSize: 10, color: STATUS_COLORS[order.payment_status] || TEXT_MUTED }}>{order.payment_status}</span><button aria-label="Eliminar pedido" title="Eliminar pedido y archivos" onClick={() => onDelete(order)} disabled={busy} style={{ color: "#B5545F" }}><Trash2 size={16} /></button></div></div>
    <div className="grid md:grid-cols-2 gap-x-6 gap-y-1" style={{ color: TEXT_MUTED, fontSize: 12 }}><p className="flex items-center gap-1"><Mail size={12} /> {order.email}<button onClick={copyEmail} title="Copiar correo" className="ml-1"><Copy size={11} /></button></p><p>{order.whatsapp}</p><p>Creado: {dateFormatter.format(new Date(order.created_at))}</p><p>Ocasión: {order.occasion} · Precio: ${order.price} · {mediaCount} archivo(s)</p></div>
    <div className="flex flex-wrap items-center gap-2 mt-3"><a href={`/m/${order.order_code}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-full px-3 py-1.5" style={{ background: "#F0EBDD", color: TEXT_DARK, fontSize: 12 }}><ExternalLink size={12} /> ver cápsula</a>{order.payment_status === "PENDIENTE" && <><button onClick={() => onApprove(order.id)} disabled={busy} className="flex items-center gap-1 rounded-full px-3 py-1.5 disabled:opacity-60" style={{ background: "#4C9A6A", color: "#FFF", fontSize: 12 }}><CheckCircle2 size={13} /> Aprobar y enviar</button><button onClick={() => onReject(order.id)} disabled={busy} className="flex items-center gap-1 rounded-full px-3 py-1.5 disabled:opacity-60" style={{ background: "#B5545F", color: "#FFF", fontSize: 12 }}><XCircle size={13} /> Rechazar</button></>}{order.payment_status === "APROBADO" && <button onClick={() => onResend(order.id)} disabled={busy} className="flex items-center gap-1 rounded-full px-3 py-1.5 disabled:opacity-60" style={{ background: "#30264D", color: "#FFF", fontSize: 12 }}><Send size={12} /> Reenviar tarjeta</button>}</div>
  </article>;
}

function groupOrders(orders) {
  const now = new Date();
  const startOfWeek = (date) => { const copy = new Date(date); const day = (copy.getDay() + 6) % 7; copy.setHours(0, 0, 0, 0); copy.setDate(copy.getDate() - day); return copy; };
  const thisWeek = startOfWeek(now);
  const previousWeek = new Date(thisWeek); previousWeek.setDate(previousWeek.getDate() - 7);
  const groups = new Map();
  orders.forEach((order) => {
    const date = new Date(order.created_at); const week = startOfWeek(date);
    const label = week.getTime() === thisWeek.getTime() ? "Esta semana" : week.getTime() === previousWeek.getTime() ? "Semana pasada" : monthFormatter.format(date);
    if (!groups.has(label)) groups.set(label, []); groups.get(label).push(order);
  });
  return [...groups.entries()].map(([label, groupedOrders]) => ({ label, orders: groupedOrders }));
}
