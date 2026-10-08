import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { PANEL_BG, TEXT_DARK, TEXT_MUTED, INPUT_BG, INPUT_BORDER } from "../lib/capsuleConfig";

const DAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"];
const fmtDay = new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "short" });
const fmtMonth = new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric" });
const fmtMonthShort = new Intl.DateTimeFormat("es-EC", { month: "short" });

const money = (n) => `$${n.toFixed(2)}`;
const price = (o) => Number(o.price || 0);
const sum = (list) => list.reduce((acc, o) => acc + price(o), 0);
// Fecha en la que entró el dinero. Los pedidos viejos (sin approved_at) usan la fecha de creación.
const paidDate = (o) => new Date(o.approved_at || o.created_at);
const isPro = (o) => price(o) >= 5;
const inRange = (o, r) => { const d = paidDate(o); return d >= r.start && d < r.end; };

/** Rango de fechas de un periodo. offset 0 = actual, -1 = anterior, etc. (semanas desde el lunes) */
function getRange(mode, offset) {
  const now = new Date();
  if (mode === "total") return { start: new Date(0), end: new Date(8.64e15), label: "Todo el tiempo" };
  if (mode === "week") {
    const start = new Date(now);
    const day = (start.getDay() + 6) % 7;
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - day + offset * 7);
    const end = new Date(start); end.setDate(end.getDate() + 7);
    const last = new Date(end); last.setDate(last.getDate() - 1);
    return { start, end, label: `${fmtDay.format(start)} – ${fmtDay.format(last)}` };
  }
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return { start, end, label: fmtMonth.format(start) };
}

const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function FinancePanel({ orders }) {
  const [mode, setMode] = useState("week"); // week | month | total
  const [offset, setOffset] = useState(0);

  const approved = useMemo(() => orders.filter((o) => o.payment_status === "APROBADO"), [orders]);
  const pending = useMemo(() => orders.filter((o) => o.payment_status === "PENDIENTE"), [orders]);

  const range = useMemo(() => getRange(mode, offset), [mode, offset]);
  const current = useMemo(() => approved.filter((o) => inRange(o, range)), [approved, range]);
  const previous = useMemo(
    () => (mode === "total" ? null : approved.filter((o) => inRange(o, getRange(mode, offset - 1)))),
    [approved, mode, offset],
  );

  const total = sum(current);
  const avg = current.length ? total / current.length : 0;
  const basic = current.filter((o) => !isPro(o));
  const pro = current.filter(isPro);
  const prevTotal = previous ? sum(previous) : null;
  const diff = prevTotal === null ? null : total - prevTotal;
  const pct = prevTotal ? (diff / prevTotal) * 100 : null;

  // Últimos 12 meses (se usa en la tabla y en el gráfico de la vista "Total")
  const monthly = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - 10 + i, 1);
      const list = approved.filter((o) => inRange(o, { start, end }));
      return { label: fmtMonthShort.format(start).replace(".", ""), title: fmtMonth.format(start), value: sum(list), count: list.length };
    });
  }, [approved]);

  const buckets = useMemo(() => {
    if (mode === "week") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(range.start); d.setDate(d.getDate() + i);
        return { label: DAY_SHORT[i], title: fmtDay.format(d), value: sum(current.filter((o) => sameDay(paidDate(o), d))) };
      });
    }
    if (mode === "month") {
      const days = new Date(range.end.getFullYear(), range.end.getMonth(), 0).getDate();
      return Array.from({ length: days }, (_, i) => {
        const d = new Date(range.start.getFullYear(), range.start.getMonth(), i + 1);
        const n = i + 1;
        return { label: n === 1 || n % 5 === 0 ? String(n) : "", title: fmtDay.format(d), value: sum(current.filter((o) => sameDay(paidDate(o), d))) };
      });
    }
    return monthly;
  }, [mode, range, current, monthly]);

  const max = Math.max(0, ...buckets.map((b) => b.value));

  function changeMode(next) { setMode(next); setOffset(0); }

  function exportCsv() {
    const rows = [["Código", "Cliente", "Correo", "Fecha de pago", "Plan", "Precio"]];
    [...current].sort((a, b) => paidDate(a) - paidDate(b)).forEach((o) => rows.push([
      o.order_code, o.full_name, o.email, paidDate(o).toLocaleDateString("es-EC"), isPro(o) ? "Pro" : "Básica", price(o).toFixed(2),
    ]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ingresos-${range.label.replace(/[^a-z0-9]+/gi, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const modeBtn = (key, label) => (
    <button
      key={key}
      onClick={() => changeMode(key)}
      className="rounded-full px-3 py-1.5"
      style={{ background: mode === key ? "#30264D" : INPUT_BG, color: mode === key ? "#FFF" : TEXT_MUTED, border: `1px solid ${INPUT_BORDER}`, fontSize: 12 }}
    >
      {label}
    </button>
  );

  return (
    <section className="rounded-xl p-4 mb-8" style={{ background: PANEL_BG, border: `1px solid ${INPUT_BORDER}` }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">{modeBtn("week", "Semana")}{modeBtn("month", "Mes")}{modeBtn("total", "Total")}</div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOffset((o) => o - 1)} disabled={mode === "total"} className="disabled:opacity-30" aria-label="Periodo anterior"><ChevronLeft size={18} color={TEXT_MUTED} /></button>
          <span className="rv-mono capitalize text-center" style={{ fontSize: 12, color: TEXT_DARK, minWidth: 150 }}>{range.label}</span>
          <button onClick={() => setOffset((o) => o + 1)} disabled={mode === "total" || offset >= 0} className="disabled:opacity-30" aria-label="Periodo siguiente"><ChevronRight size={18} color={TEXT_MUTED} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card label="Ingresos" value={money(total)} color="#4C9A6A" big>
          {diff !== null && (
            <p className="rv-mono" style={{ fontSize: 10, color: diff >= 0 ? "#4C9A6A" : "#B5545F", marginTop: 3 }}>
              {diff >= 0 ? "▲" : "▼"} {money(Math.abs(diff))}{pct !== null ? ` (${Math.abs(pct).toFixed(0)}%)` : ""} vs {mode === "week" ? "semana" : "mes"} anterior
            </p>
          )}
        </Card>
        <Card label="Pedidos aprobados" value={current.length} />
        <Card label="Ticket promedio" value={money(avg)} />
        <Card label="Por cobrar (pendientes)" value={money(sum(pending))} color="#C9973F">
          <p className="rv-mono" style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 3 }}>{pending.length} pedido(s) sin aprobar</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-4 rv-mono" style={{ fontSize: 11, color: TEXT_MUTED }}>
        <span>Versión Básica: <b style={{ color: TEXT_DARK }}>{basic.length}</b> · {money(sum(basic))}</span>
        <span>Versión Pro: <b style={{ color: TEXT_DARK }}>{pro.length}</b> · {money(sum(pro))}</span>
      </div>

      <div className="flex items-end gap-1" style={{ height: 90 }}>
        {buckets.map((b, i) => (
          <div key={i} title={`${b.title}: ${money(b.value)}`} className="flex-1 flex items-end justify-center h-full">
            <div style={{ width: "100%", maxWidth: 28, height: max ? `${b.value > 0 ? Math.max((b.value / max) * 100, 4) : 0}%` : 0, background: "#4C9A6A", borderRadius: 3 }} />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {buckets.map((b, i) => <span key={i} className="flex-1 text-center rv-mono" style={{ fontSize: 9, color: TEXT_MUTED }}>{b.label}</span>)}
      </div>
      {mode === "total" && <p className="rv-mono mt-1" style={{ fontSize: 9, color: TEXT_MUTED }}>Gráfico: últimos 12 meses</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <details>
          <summary className="rv-mono uppercase cursor-pointer" style={{ fontSize: 11, color: TEXT_MUTED, letterSpacing: "0.06em" }}>Resumen de los últimos 12 meses</summary>
          <table className="mt-2" style={{ fontSize: 12, color: TEXT_DARK }}>
            <thead><tr style={{ color: TEXT_MUTED, textAlign: "left" }}><th className="pr-6 font-normal">Mes</th><th className="pr-6 font-normal">Pedidos</th><th className="font-normal">Ingresos</th></tr></thead>
            <tbody>
              {[...monthly].reverse().map((m) => (
                <tr key={m.title}><td className="pr-6 capitalize">{m.title}</td><td className="pr-6">{m.count}</td><td>{money(m.value)}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
        <button onClick={exportCsv} disabled={!current.length} className="flex items-center gap-1 rv-mono disabled:opacity-40" style={{ fontSize: 12, color: TEXT_MUTED }}>
          <Download size={13} /> exportar este periodo (CSV)
        </button>
      </div>
    </section>
  );
}

function Card({ label, value, color = TEXT_DARK, big, children }) {
  return (
    <div className="rounded-xl p-4" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}` }}>
      <p className="rv-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.08em", color: TEXT_MUTED }}>{label}</p>
      <p style={{ marginTop: 5, fontSize: big ? 26 : 22, fontWeight: 600, color }}>{value}</p>
      {children}
    </div>
  );
}
