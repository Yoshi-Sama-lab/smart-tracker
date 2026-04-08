import { useEffect, useMemo, useState } from "react";
import { Flame, Target, TrendingUp, Trophy, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { format, subDays, isSameDay } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

const SUBJECTS = ["Mathematics", "Physics", "Computer Science", "Literature", "Chemistry"];
const SUBJECT_COLORS = {
  Mathematics: "#7c3aed",
  Physics: "#0ea5e9",
  "Computer Science": "#10b981",
  Literature: "#f59e0b",
  Chemistry: "#ec4899",
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function GoalStatCard({ icon, label, value, sub, accent }) {
  const Icon = icon; 
  return (
    <Card className="bg-[#18181b] border-zinc-800">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}
          >
            <Icon size={14} style={{ color: accent }} />
          </div>
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
            {label}
          </span>
        </div>
        <p className="text-3xl font-bold text-zinc-100">{value}</p>
        {sub && <p className="text-xs mt-1" style={{ color: accent }}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function GoalsPage() {
  const { token, loading } = useAuth();
  const [logs, setLogs] = useState([]);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(120);
  const [inputVal, setInputVal] = useState("120");
  const [saving, setSaving] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);

  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        const [logsData, goalData] = await Promise.all([
          api.getLogs(token),
          api.getGoal(token),
        ]);
        setLogs(Array.isArray(logsData) ? logsData : []);
        if (goalData?.dailyMinutes) {
          setDailyGoalMinutes(goalData.dailyMinutes);
          setInputVal(String(goalData.dailyMinutes));
        }
      } catch {
        toast.error("Failed to load goals data");
      }
    };
    if (!loading) load();
  }, [loading, token]);

  // ── computed ───────────────────────────────────────────────────────────────
  const todayMin = useMemo(
    () =>
      logs
        .filter((l) => isSameDay(new Date(l.date), today))
        .reduce((s, l) => s + (Number(l.durationMinutes) || 0), 0),
    [logs, today]
  );

  const streak = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 365; i++) {
      const d = subDays(today, i);
      const mins = logs
        .filter((l) => isSameDay(new Date(l.date), d))
        .reduce((s, l) => s + (Number(l.durationMinutes) || 0), 0);
      if (mins > 0) count++;
      else break;
    }
    return count;
  }, [logs, today]);

  const weeklyTotal = useMemo(
    () =>
      logs
        .filter((l) => new Date(l.date) > subDays(today, 7))
        .reduce((s, l) => s + (Number(l.durationMinutes) || 0), 0),
    [logs, today]
  );

  const progress = Math.min(
    100,
    Math.round((todayMin / Math.max(dailyGoalMinutes, 1)) * 100)
  );

  // 30-day heatmap
  const heatmap = useMemo(
    () =>
      Array.from({ length: 35 }, (_, i) => {
        const d = subDays(today, 34 - i);
        const mins = logs
          .filter((l) => isSameDay(new Date(l.date), d))
          .reduce((s, l) => s + (Number(l.durationMinutes) || 0), 0);
        return { date: d, mins, isToday: isSameDay(d, today) };
      }),
    [logs, today]
  );

  const maxMins = Math.max(...heatmap.map((h) => h.mins), 1);

  // Per-subject breakdown this week
  const subjectBreakdown = useMemo(() => {
    const weekAgo = subDays(today, 7);
    return SUBJECTS.map((sub) => ({
      sub,
      mins: logs
        .filter((l) => l.subject === sub && new Date(l.date) > weekAgo)
        .reduce((s, l) => s + (Number(l.durationMinutes) || 0), 0),
    }))
      .filter((s) => s.mins > 0)
      .sort((a, b) => b.mins - a.mins);
  }, [logs, today]);

  const maxSubjectMins = Math.max(...subjectBreakdown.map((s) => s.mins), 1);

  // ── save goal ──────────────────────────────────────────────────────────────
  const saveGoal = async () => {
    const val = Math.max(1, Number(inputVal) || 120);
    setSaving(true);
    try {
      await api.setGoal(token, { dailyMinutes: val });
      setDailyGoalMinutes(val);
      setEditingGoal(false);
      toast.success("Daily goal updated ✓");
    } catch {
      toast.error("Failed to save goal");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <p className="text-zinc-600 text-sm">Loading…</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50 p-6 md:p-8 space-y-7">
      {/* ── header ────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Goals & Progress</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Track your consistency and momentum</p>
      </div>

      {/* ── stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <GoalStatCard
          icon={Target}
          label="Today"
          accent="#7c3aed"
          value={`${Math.floor(todayMin / 60)}h ${todayMin % 60}m`}
          sub={
            progress >= 100
              ? "Goal reached! 🎉"
              : `${progress}% of ${Math.floor(dailyGoalMinutes / 60)}h ${dailyGoalMinutes % 60}m goal`
          }
        />
        <GoalStatCard
          icon={Flame}
          label="Streak"
          accent="#f59e0b"
          value={`${streak} days`}
          sub={
            streak >= 30
              ? "Incredible! 🏆"
              : streak >= 7
              ? "On fire! 🔥"
              : streak > 0
              ? `${7 - streak} days to 1-week`
              : "Start today!"
          }
        />
        <GoalStatCard
          icon={TrendingUp}
          label="This Week"
          accent="#0ea5e9"
          value={`${Math.floor(weeklyTotal / 60)}h ${weeklyTotal % 60}m`}
          sub={`${logs.filter((l) => new Date(l.date) > subDays(today, 7)).length} sessions`}
        />
      </div>

      {/* ── daily progress ────────────────────────────────────────────────── */}
      <Card className="bg-[#18181b] border-zinc-800">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {progress >= 100 ? (
                <CheckCircle2 size={15} className="text-[#7c3aed]" />
              ) : (
                <Target size={15} className="text-[#7c3aed]" />
              )}
              <span className="text-sm font-semibold text-zinc-200">
                Daily Goal Progress
              </span>
            </div>

            {/* editable goal inline */}
            {editingGoal ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveGoal()}
                  className="w-20 bg-[#09090b] border border-zinc-700 text-zinc-200 text-xs px-2 py-1 rounded-lg focus:outline-none focus:border-[#7c3aed]"
                  placeholder="min"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={saveGoal}
                  disabled={saving}
                  className="h-7 text-xs bg-[#7c3aed] hover:bg-[#6d28d9] px-3"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingGoal(false)}
                  className="h-7 text-xs text-zinc-500"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setEditingGoal(true)}
                className="text-xs text-zinc-600 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1 rounded-lg transition-all"
              >
                {Math.floor(dailyGoalMinutes / 60)}h {dailyGoalMinutes % 60}m · Edit
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <Progress
                value={progress}
                className="h-3 bg-zinc-800 rounded-full [&>div]:bg-[#7c3aed] [&>div]:rounded-full"
              />
            </div>
            <span className="text-lg font-bold text-[#7c3aed] w-14 text-right tabular-nums">
              {progress}%
            </span>
          </div>

          <div className="flex gap-4 text-xs text-zinc-500">
            <span>
              {Math.floor(todayMin / 60)}h {todayMin % 60}m studied
            </span>
            <span>·</span>
            <span>
              {Math.max(0, dailyGoalMinutes - todayMin)}m remaining
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── heatmap ───────────────────────────────────────────────────────── */}
      <Card className="bg-[#18181b] border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-200">
            35-Day Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1.5 flex-wrap">
            {heatmap.map((h, i) => {
              const intensity = h.mins / maxMins;
              const met = h.mins >= dailyGoalMinutes;
              return (
                <div
                  key={i}
                  className="relative group"
                  style={{ width: "calc(100% / 35 - 5px)", maxWidth: 32 }}
                >
                  <div
                    className="w-full aspect-square rounded-md border transition-colors cursor-default"
                    style={{
                      background:
                        h.mins === 0
                          ? "#111113"
                          : met
                          ? `rgba(124,58,237,${0.35 + intensity * 0.65})`
                          : `rgba(124,58,237,${0.08 + intensity * 0.25})`,
                      borderColor: h.isToday ? "#7c3aed" : "transparent",
                      boxShadow: h.isToday ? "0 0 0 1px #7c3aed50" : "none",
                    }}
                  />
                  {/* tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                    <div className="bg-[#27272a] border border-zinc-700 rounded-lg px-2 py-1 whitespace-nowrap shadow-xl">
                      <p className="text-[10px] text-zinc-300 font-medium">
                        {format(h.date, "MMM d")}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {h.mins > 0
                          ? `${Math.floor(h.mins / 60)}h ${h.mins % 60}m`
                          : "No study"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* legend */}
          <div className="flex items-center gap-2 mt-3 justify-end">
            <span className="text-[10px] text-zinc-600">Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <div
                key={v}
                className="w-3 h-3 rounded-sm"
                style={{
                  background:
                    v === 0
                      ? "#111113"
                      : `rgba(124,58,237,${0.35 + v * 0.65})`,
                }}
              />
            ))}
            <span className="text-[10px] text-zinc-600">More</span>
          </div>
        </CardContent>
      </Card>

      {/* ── subject breakdown ─────────────────────────────────────────────── */}
      {subjectBreakdown.length > 0 && (
        <Card className="bg-[#18181b] border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-zinc-200">
              This Week by Subject
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subjectBreakdown.map(({ sub, mins }) => {
              const color = SUBJECT_COLORS[sub] || "#7c3aed";
              const pct = Math.round((mins / maxSubjectMins) * 100);
              return (
                <div key={sub} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-300">{sub}</span>
                    <span className="text-zinc-500 font-mono">
                      {Math.floor(mins / 60)}h {mins % 60}m
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── milestone badges ──────────────────────────────────────────────── */}
      <Card className="bg-[#18181b] border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Trophy size={14} className="text-[#f59e0b]" /> Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "First Log", done: logs.length >= 1, icon: "📚" },
              { label: "3-Day Streak", done: streak >= 3, icon: "🔥" },
              { label: "7-Day Streak", done: streak >= 7, icon: "⚡" },
              { label: "30-Day Streak", done: streak >= 30, icon: "🏆" },
              { label: "10 Sessions", done: logs.length >= 10, icon: "✅" },
              { label: "50 Sessions", done: logs.length >= 50, icon: "💎" },
              {
                label: "10h This Week",
                done: weeklyTotal >= 600,
                icon: "⏱️",
              },
            ].map(({ label, done, icon }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all"
                style={{
                  borderColor: done ? "#7c3aed40" : "#27272a",
                  background: done ? "#7c3aed0f" : "transparent",
                  color: done ? "#a78bfa" : "#3f3f46",
                  opacity: done ? 1 : 0.5,
                }}
              >
                <span>{icon}</span>
                {label}
                {done && <CheckCircle2 size={11} className="text-[#7c3aed]" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}