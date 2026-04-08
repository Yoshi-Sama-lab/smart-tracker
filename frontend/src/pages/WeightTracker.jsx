import React, { useState, useEffect, useCallback } from "react";
import {
  Scale, ArrowDown, ArrowUp, Minus, TrendingDown,
  CalendarDays, Plus,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const TARGET_WEIGHT = 90.0;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#18181b] border border-zinc-700 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-[#7c3aed]">{payload[0].value} kg</p>
    </div>
  );
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, iconColor, borderColor }) {
  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-1 bg-[#18181b]"
      style={{ borderColor: borderColor || "#27272a" }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
          {label}
        </span>
        <Icon size={14} style={{ color: iconColor }} />
      </div>
      <p className="text-2xl font-bold text-zinc-100">{value}</p>
      {sub && <p className="text-xs" style={{ color: iconColor }}>{sub}</p>}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function WeightTracker() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isSaving, setIsSaving] = useState(false);
  const [range, setRange] = useState(30); // days to show on chart

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getWeight(token);
      if (data.success) setLogs(data.logs);
    } catch {
      toast.error("Failed to load weight logs");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ── save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!weight || isNaN(parseFloat(weight))) {
      toast.warning("Enter a valid weight");
      return;
    }
    setIsSaving(true);
    try {
      await api.addWeight(token, parseFloat(weight), new Date(date).toISOString());
      toast.success(`${weight} kg logged ✓`);
      setWeight("");
      fetchLogs();
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  // ── derived stats ──────────────────────────────────────────────────────────
  const sortedAsc = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
  const latest = sortedAsc[sortedAsc.length - 1]?.weight ?? null;
  const previous = sortedAsc[sortedAsc.length - 2]?.weight ?? null;
  const startWeight = sortedAsc[0]?.weight ?? null;
  const diff = latest != null && previous != null ? (latest - previous).toFixed(1) : null;
  const totalLoss = startWeight != null && latest != null ? (startWeight - latest).toFixed(1) : null;
  const toGoal = latest != null ? (latest - TARGET_WEIGHT).toFixed(1) : null;

  // ── chart data ─────────────────────────────────────────────────────────────
  const cutoff = subDays(new Date(), range);
  const chartData = sortedAsc
    .filter((l) => new Date(l.date) >= cutoff)
    .map((l) => ({
      date: format(new Date(l.date), "MMM d"),
      weight: l.weight,
    }));

  // y-axis domain with padding
  const weights = chartData.map((d) => d.weight);
  const minW = weights.length ? Math.min(...weights) - 2 : TARGET_WEIGHT - 5;
  const maxW = weights.length ? Math.max(...weights) + 2 : TARGET_WEIGHT + 10;

  const DiffIcon =
    diff === null ? null : parseFloat(diff) < 0 ? ArrowDown : parseFloat(diff) > 0 ? ArrowUp : Minus;
  const diffColor =
    diff === null ? "#71717a" : parseFloat(diff) < 0 ? "#34d399" : parseFloat(diff) > 0 ? "#f87171" : "#71717a";

  return (
    <div className="min-h-full bg-[#09090b] text-zinc-50 p-6 md:p-8 space-y-7">
      {/* ── header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/10 border border-[#7c3aed]/20 flex items-center justify-center">
          <Scale size={18} className="text-[#7c3aed]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Weight Tracker</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {logs.length} entries · Target {TARGET_WEIGHT} kg
          </p>
        </div>
      </div>

      {/* ── stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Current"
          value={latest != null ? `${latest} kg` : "—"}
          sub={
            diff !== null
              ? `${parseFloat(diff) >= 0 ? "+" : ""}${diff} kg vs last`
              : "No data yet"
          }
          icon={Scale}
          iconColor="#7c3aed"
          borderColor="#7c3aed25"
        />
        <StatCard
          label="Target"
          value={`${TARGET_WEIGHT} kg`}
          sub="Goal weight"
          icon={TrendingDown}
          iconColor="#4ade80"
          borderColor="#4ade8025"
        />
        <StatCard
          label="To Goal"
          value={toGoal != null ? `${toGoal} kg` : "—"}
          sub={toGoal != null && parseFloat(toGoal) <= 0 ? "🎉 Achieved!" : "Keep going"}
          icon={ArrowDown}
          iconColor="#fbbf24"
          borderColor="#fbbf2425"
        />
        <StatCard
          label="Total Lost"
          value={totalLoss != null && parseFloat(totalLoss) > 0 ? `-${totalLoss} kg` : "—"}
          sub={logs.length > 0 ? `Over ${logs.length} entries` : "Start logging"}
          icon={TrendingDown}
          iconColor="#0ea5e9"
          borderColor="#0ea5e925"
        />
      </div>

      {/* ── chart + log form ──────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-[#18181b] border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-200">Progress Chart</h2>
            <div className="flex gap-1.5">
              {[7, 30, 90].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className="px-2.5 py-1 text-xs rounded-lg font-semibold transition-all"
                  style={{
                    background: range === r ? "#7c3aed" : "transparent",
                    color: range === r ? "#fff" : "#52525b",
                    border: `1px solid ${range === r ? "#7c3aed" : "#27272a"}`,
                  }}
                >
                  {r}d
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="h-56 bg-zinc-800/40 rounded-xl animate-pulse" />
          ) : chartData.length < 2 ? (
            <div className="h-56 flex flex-col items-center justify-center text-zinc-700">
              <Scale size={28} className="mb-2 opacity-40" />
              <p className="text-sm">Not enough data for chart</p>
              <p className="text-xs mt-1 opacity-60">Log at least 2 entries</p>
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#27272a" strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#52525b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[minW, maxW]}
                    tick={{ fill: "#52525b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    unit="kg"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine
                    y={TARGET_WEIGHT}
                    stroke="#4ade80"
                    strokeDasharray="6 3"
                    strokeOpacity={0.5}
                    label={{
                      value: "Target",
                      fill: "#4ade80",
                      fontSize: 10,
                      position: "insideTopRight",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke="#7c3aed"
                    strokeWidth={2.5}
                    fill="url(#weightGrad)"
                    dot={{ fill: "#7c3aed", r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#7c3aed", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Log Form */}
        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <Plus size={14} className="text-[#7c3aed]" />
            <h2 className="text-sm font-semibold text-zinc-200">Log Weight</h2>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              min="30"
              max="300"
              placeholder="e.g. 92.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="w-full bg-[#09090b] border border-zinc-800 text-zinc-100 text-lg font-bold px-4 py-3 rounded-xl focus:outline-none focus:border-[#7c3aed] transition-colors placeholder:text-zinc-700"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays size={11} /> Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#09090b] border border-zinc-800 text-zinc-300 px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#7c3aed] transition-colors text-sm"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || !weight}
            className="w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all disabled:opacity-40"
            style={{
              background: "#7c3aed",
              color: "#fff",
              boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
            }}
          >
            {isSaving ? "Saving…" : "Save Entry"}
          </button>

          {/* mini progress bar toward target */}
          {latest != null && startWeight != null && startWeight > TARGET_WEIGHT && (
            <div className="space-y-1.5 pt-1 border-t border-zinc-800">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Start: {startWeight} kg</span>
                <span>Target: {TARGET_WEIGHT} kg</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        ((startWeight - latest) / (startWeight - TARGET_WEIGHT)) * 100
                      )
                    )}%`,
                    background: "linear-gradient(90deg, #7c3aed, #4ade80)",
                  }}
                />
              </div>
              <p className="text-xs text-zinc-600 text-center">
                {Math.min(
                  100,
                  Math.round(
                    ((startWeight - latest) / (startWeight - TARGET_WEIGHT)) * 100
                  )
                )}
                % to goal
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── history table ─────────────────────────────────────────────────── */}
      <div className="bg-[#18181b] border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">History</h2>
          <span className="text-xs text-zinc-600">{logs.length} entries</span>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-zinc-800/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-zinc-700 text-sm">
            No entries yet — log your first weight above
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60 max-h-72 overflow-y-auto">
            {[...logs]
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((log, idx) => {
                const prev = logs[idx + 1];
                const change = prev ? log.weight - prev.weight : null;
                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] opacity-60" />
                      <div>
                        <p className="text-sm font-medium text-zinc-200">
                          {log.weight} kg
                        </p>
                        <p className="text-xs text-zinc-500">
                          {format(new Date(log.date), "EEE, MMM d yyyy")}
                        </p>
                      </div>
                    </div>
                    {change !== null && (
                      <span
                        className="text-xs font-bold font-mono"
                        style={{
                          color:
                            change < 0
                              ? "#34d399"
                              : change > 0
                              ? "#f87171"
                              : "#71717a",
                        }}
                      >
                        {change >= 0 ? "+" : ""}
                        {change.toFixed(1)} kg
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}