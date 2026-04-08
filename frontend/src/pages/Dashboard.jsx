import { useEffect, useMemo, useState, useCallback } from "react";
import { format, subDays, isSameDay } from "date-fns";
import {
  Clock, Flame, TrendingUp, Scale, Wallet,
  CalendarDays, Dumbbell, Utensils, ChevronRight,
  Plus, BookOpen, Zap, CheckCircle2, Circle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];
const SUBJECTS = ["Mathematics", "Physics", "Computer Science", "Literature", "Chemistry"];

// ─── SKELETON ─────────────────────────────────────────────────────────────────
const Skeleton = ({ className = "" }) => (
  <div className={`bg-zinc-800/60 rounded-xl animate-pulse ${className}`} />
);

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color, onClick, loading }) => (
  <button
    onClick={onClick}
    className="group flex flex-col gap-3 p-5 bg-[#18181b] border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all text-left w-full"
  >
    <div className="flex items-center justify-between">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: `${color}18`, border: `1px solid ${color}35` }}
      >
        <Icon size={16} style={{ color }} />
      </div>
      <ChevronRight size={13} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
    </div>
    {loading ? (
      <>
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-3 w-16" />
      </>
    ) : (
      <div>
        <p className="text-xl font-bold text-zinc-100">{value}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
        {sub && (
          <p className="text-xs mt-1.5 font-medium" style={{ color }}>
            {sub}
          </p>
        )}
      </div>
    )}
  </button>
);

// ─── HABIT PILL ───────────────────────────────────────────────────────────────
const HabitPill = ({ label, done, color, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-medium"
    style={{
      borderColor: done ? `${color}50` : "#27272a",
      background: done ? `${color}12` : "transparent",
      color: done ? color : "#52525b",
    }}
  >
    {done ? <CheckCircle2 size={12} /> : <Circle size={12} />}
    {label}
  </button>
);

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="bg-[#18181b] border border-zinc-700 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      {payload.map((p) =>
        p.value > 0 ? (
          <p key={p.dataKey} className="text-xs" style={{ color: p.fill }}>
            {p.dataKey}: {p.value}m
          </p>
        ) : null
      )}
      {total > 0 && (
        <p className="text-xs font-bold text-zinc-200 border-t border-zinc-700 mt-1 pt-1">
          Total: {Math.floor(total / 60)}h {total % 60}m
        </p>
      )}
    </div>
  );
};

// ─── QUICK LOG ────────────────────────────────────────────────────────────────
function QuickStudyLog({ token, onLogged }) {
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handle = async () => {
    if (!subject || !duration || !token) return;
    setSaving(true);
    try {
      await api.addLog(token, {
        subject,
        durationMinutes: Number(duration),
        date: new Date().toISOString(),
      });
      setSubject("");
      setDuration("");
      setDone(true);
      setTimeout(() => setDone(false), 2000);
      onLogged?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <select
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="w-full bg-[#09090b] border border-zinc-800 text-zinc-300 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-[#7c3aed] transition-colors"
      >
        <option value="">Select subject…</option>
        {SUBJECTS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Minutes"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handle()}
          className="flex-1 bg-[#09090b] border border-zinc-800 text-zinc-300 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-[#7c3aed] transition-colors"
        />
        <button
          onClick={handle}
          disabled={saving || !subject || !duration}
          className="px-4 py-2 bg-[#7c3aed] text-white text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-[#6d28d9] transition-all"
        >
          {done ? "✓" : saving ? "…" : "Log"}
        </button>
      </div>
      {done && (
        <p className="text-xs text-[#7c3aed] text-center animate-slide-up">
          Session logged! ✓
        </p>
      )}
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, token, loading } = useAuth();
  const navigate = useNavigate();

  const [studyLogs, setStudyLogs] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [latestWeight, setLatestWeight] = useState(null);
  const [budgetLogs, setBudgetLogs] = useState([]);
  const [gymLogs, setGymLogs] = useState([]);
  const [foodLogs, setFoodLogs] = useState([]);
  const [dailyGoal, setDailyGoal] = useState(120);
  const [isLoading, setIsLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    const h = { Authorization: `Bearer ${token}` };
    try {
      const [study, sched, weight, budget, gym, food, goal] = await Promise.allSettled([
        fetch(`${BASE_URL}/study`, { headers: h }).then((r) => r.json()),
        fetch(`${BASE_URL}/schedule`, { headers: h }).then((r) => r.json()),
        fetch(`${BASE_URL}/weight`, { headers: h }).then((r) => r.json()),
        fetch(`${BASE_URL}/lifelog/budget`, { headers: h }).then((r) => r.json()),
        fetch(`${BASE_URL}/lifelog/gym`, { headers: h }).then((r) => r.json()),
        fetch(`${BASE_URL}/lifelog/food`, { headers: h }).then((r) => r.json()),
        fetch(`${BASE_URL}/goals`, { headers: h }).then((r) => r.json()),
      ]);

      if (study.status === "fulfilled")
        setStudyLogs(Array.isArray(study.value) ? study.value : []);
      if (sched.status === "fulfilled")
        setSchedule(Array.isArray(sched.value) ? sched.value : []);
      if (weight.status === "fulfilled" && weight.value?.success)
        setLatestWeight(weight.value.logs?.[0] || null);
      if (budget.status === "fulfilled" && budget.value?.success)
        setBudgetLogs(budget.value.logs || []);
      if (gym.status === "fulfilled" && gym.value?.success)
        setGymLogs(gym.value.logs || []);
      if (food.status === "fulfilled" && food.value?.success)
        setFoodLogs(food.value.logs || []);
      if (goal.status === "fulfilled" && goal.value?.dailyMinutes)
        setDailyGoal(goal.value.dailyMinutes);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!loading) loadAll();
  }, [loading, loadAll]);

  const today = useMemo(() => new Date(), []);
  const getLocalDateStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  const todayStr = getLocalDateStr(today);

  const todayStudyMin = useMemo(
    () =>
      studyLogs
        .filter((l) => isSameDay(new Date(l.date), today))
        .reduce((s, l) => s + (Number(l.durationMinutes) || 0), 0),
    [studyLogs, today]
  );

  const streak = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 365; i++) {
      const d = subDays(today, i);
      const mins = studyLogs
        .filter((l) => isSameDay(new Date(l.date), d))
        .reduce((s, l) => s + (Number(l.durationMinutes) || 0), 0);
      if (mins > 0) count++;
      else break;
    }
    return count;
  }, [studyLogs, today]);

  const subjects = useMemo(
    () => [...new Set(studyLogs.map((l) => l.subject || "Other"))],
    [studyLogs]
  );

  const weeklyChart = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = subDays(today, 6 - i);
        const row = { day: format(d, "EEE") };
        subjects.forEach((sub) => {
          row[sub] = studyLogs
            .filter((l) => l.subject === sub && isSameDay(new Date(l.date), d))
            .reduce((s, l) => s + (Number(l.durationMinutes) || 0), 0);
        });
        return row;
      }),
    [studyLogs, subjects, today]
  );

  const todayClasses = useMemo(
    () =>
      schedule
        .filter((e) => e.day === todayStr)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [schedule, todayStr]
  );

  const budgetRemaining = budgetLogs[0]?.metrics?.remainingBudget ?? 5000;
  const goalProgress = Math.min(100, Math.round((todayStudyMin / dailyGoal) * 100));
  const weeklyMinutes = studyLogs
    .filter((l) => new Date(l.date) > subDays(today, 7))
    .reduce((s, l) => s + (Number(l.durationMinutes) || 0), 0);

  const greeting =
    today.getHours() < 12
      ? "Good morning"
      : today.getHours() < 17
      ? "Good afternoon"
      : "Good evening";

  // Habit tracking — did they log each module today?
  const loggedGymToday = gymLogs.some((l) =>
    isSameDay(new Date(l.date), today)
  );
  const loggedFoodToday = foodLogs.some((l) =>
    isSameDay(new Date(l.date), today)
  );
  const loggedBudgetToday = budgetLogs.some((l) =>
    isSameDay(new Date(l.date), today)
  );

  const firstName = user?.displayName?.split(" ")[0] || "Student";

  // ─── LOADING STATE ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 min-h-screen bg-[#09090b] flex items-center justify-center">
        <p className="text-zinc-600 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50 p-6 md:p-8 space-y-7">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-zinc-500 text-sm mb-0.5">
            {greeting}, {firstName} 👋
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            {format(today, "EEEE, MMMM d")}
          </h1>
          <p className="text-zinc-500 text-xs mt-1">
            {todayClasses.length} classes scheduled ·{" "}
            {format(today, "yyyy")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#18181b] border border-zinc-800 rounded-xl">
            <Zap size={13} className="text-[#7c3aed]" />
            <span className="text-xs text-zinc-300 font-medium">
              {Math.floor(weeklyMinutes / 60)}h this week
            </span>
          </div>
          {/* Daily goal progress pill */}
          <div
            className="flex items-center gap-2 px-3 py-2 bg-[#18181b] border rounded-xl"
            style={{
              borderColor: goalProgress >= 100 ? "#7c3aed50" : "#27272a",
              background: goalProgress >= 100 ? "#7c3aed12" : undefined,
            }}
          >
            <div
              className="relative w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden"
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all"
                style={{
                  width: `${goalProgress}%`,
                  background: "#7c3aed",
                }}
              />
            </div>
            <span className="text-xs font-medium text-zinc-400">
              {goalProgress}% goal
            </span>
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label="Study Today"
          color="#7c3aed"
          value={`${Math.floor(todayStudyMin / 60)}h ${todayStudyMin % 60}m`}
          sub={
            goalProgress >= 100
              ? "Goal reached! 🎉"
              : `${goalProgress}% of daily goal`
          }
          onClick={() => navigate("/study")}
          loading={isLoading}
        />
        <StatCard
          icon={Flame}
          label="Study Streak"
          color="#f59e0b"
          value={`${streak} days`}
          sub={
            streak >= 7
              ? "On fire! 🔥"
              : streak > 0
              ? `${7 - streak} to 1-week`
              : "Start today!"
          }
          onClick={() => navigate("/goals")}
          loading={isLoading}
        />
        <StatCard
          icon={Scale}
          label="Latest Weight"
          color="#a78bfa"
          value={latestWeight ? `${latestWeight.weight} kg` : "—"}
          sub={
            latestWeight
              ? format(new Date(latestWeight.date), "MMM d")
              : "Log your weight"
          }
          onClick={() => navigate("/weight")}
          loading={isLoading}
        />
        <StatCard
          icon={Wallet}
          label="Budget Left"
          color="#0ea5e9"
          value={`₹${budgetRemaining.toLocaleString()}`}
          sub={
            budgetLogs.length > 0
              ? "of ₹5,000 monthly"
              : "No logs yet"
          }
          onClick={() => navigate("/budget")}
          loading={isLoading}
        />
      </div>

      {/* ── HABIT TRACKER ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-600 font-medium uppercase tracking-wider mr-1">
          Today
        </span>
        <HabitPill
          label="Studied"
          done={todayStudyMin > 0}
          color="#7c3aed"
          onClick={() => navigate("/study")}
        />
        <HabitPill
          label="Gym"
          done={loggedGymToday}
          color="#7c3aed"
          onClick={() => navigate("/gym")}
        />
        <HabitPill
          label="Nutrition"
          done={loggedFoodToday}
          color="#4ade80"
          onClick={() => navigate("/food")}
        />
        <HabitPill
          label="Budget"
          done={loggedBudgetToday}
          color="#0ea5e9"
          onClick={() => navigate("/budget")}
        />
      </div>

      {/* ── MIDDLE ROW ────────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 bg-[#18181b] border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={15} className="text-[#7c3aed]" />
              <h2 className="font-semibold text-zinc-100 text-sm">
                Today's Classes
              </h2>
            </div>
            <button
              onClick={() => navigate("/schedule")}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
              All <ChevronRight size={11} />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : todayClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-700">
              <CalendarDays size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No classes today!</p>
              <p className="text-xs mt-1 opacity-60">
                Sync VTOP to auto-populate
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayClasses.slice(0, 5).map((cls) => {
                const now = new Date();
                const [endH, endM] = cls.endTime.split(":").map(Number);
                const end = new Date();
                end.setHours(endH, endM, 0);
                const [startH, startM] = cls.startTime.split(":").map(Number);
                const start = new Date();
                start.setHours(startH, startM, 0);
                const isNow = now >= start && now <= end;
                const isPast = now > end;

                return (
                  <div
                    key={cls.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isNow
                        ? "bg-[#7c3aed]/10 border-[#7c3aed]/30"
                        : isPast
                        ? "opacity-35 border-zinc-800/40 bg-transparent"
                        : "border-zinc-800 bg-[#09090b]"
                    }`}
                  >
                    <div
                      className="w-1 h-10 rounded-full shrink-0"
                      style={{
                        background: isNow ? "#7c3aed" : "#27272a",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">
                        {cls.courseName || cls.subject}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {cls.startTime} – {cls.endTime}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isNow && (
                        <span className="text-[9px] font-bold text-[#7c3aed] bg-[#7c3aed]/15 px-1.5 py-0.5 rounded-full">
                          NOW
                        </span>
                      )}
                      {cls.attendance && (
                        <span
                          className={`text-[10px] font-mono font-bold ${
                            parseFloat(cls.attendance) >= 75
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {cls.attendance}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {todayClasses.length > 5 && (
                <button
                  onClick={() => navigate("/schedule")}
                  className="w-full text-xs text-zinc-600 hover:text-zinc-400 py-2 text-center transition-colors"
                >
                  +{todayClasses.length - 5} more
                </button>
              )}
            </div>
          )}
        </div>

        {/* Weekly Study Chart */}
        <div className="lg:col-span-3 bg-[#18181b] border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-[#7c3aed]" />
            <h2 className="font-semibold text-zinc-100 text-sm">
              Study This Week
            </h2>
          </div>

          {isLoading ? (
            <Skeleton className="h-52" />
          ) : subjects.length === 0 ||
            weeklyChart.every((d) =>
              subjects.every((s) => !d[s])
            ) ? (
            <div className="h-52 flex flex-col items-center justify-center text-zinc-700">
              <BookOpen size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No sessions logged yet</p>
              <button
                onClick={() => navigate("/study")}
                className="mt-2 text-xs text-[#7c3aed] hover:underline"
              >
                Log your first session →
              </button>
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChart} barCategoryGap="28%">
                  <CartesianGrid
                    stroke="#27272a"
                    vertical={false}
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#52525b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#52525b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                    unit="m"
                  />
                  <Tooltip content={<ChartTooltip />} />
                  {subjects.map((sub, i) => (
                    <Bar
                      key={sub}
                      dataKey={sub}
                      stackId="a"
                      fill={COLORS[i % COLORS.length]}
                      radius={
                        i === subjects.length - 1
                          ? [4, 4, 0, 0]
                          : [0, 0, 0, 0]
                      }
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM ROW ────────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-5">
        {/* Recent Gym */}
        <button
          onClick={() => navigate("/gym")}
          className="group text-left bg-[#18181b] border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#7c3aed]/10 border border-[#7c3aed]/20 flex items-center justify-center">
                <Dumbbell size={14} className="text-[#7c3aed]" />
              </div>
              <span className="text-sm font-semibold text-zinc-200">
                Training
              </span>
            </div>
            <ChevronRight
              size={13}
              className="text-zinc-700 group-hover:text-zinc-400 transition-colors"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ) : gymLogs[0] ? (
            <div>
              <p className="text-[11px] text-zinc-500 mb-2">
                Last session:{" "}
                {format(new Date(gymLogs[0].date), "MMM d, h:mm a")}
              </p>
              <div className="flex gap-4">
                {[
                  ["Sets", gymLogs[0].metrics?.setsCompleted || 0],
                  ["Drop Sets", gymLogs[0].metrics?.dropSets || 0],
                  [
                    "Steps",
                    (gymLogs[0].metrics?.steps || 0).toLocaleString(),
                  ],
                ].map(([lbl, val]) => (
                  <div key={lbl} className="text-center">
                    <p className="text-lg font-bold text-[#7c3aed]">{val}</p>
                    <p className="text-[10px] text-zinc-500">{lbl}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-600 italic">
              No sessions logged yet
            </p>
          )}
        </button>

        {/* Recent Nutrition */}
        <button
          onClick={() => navigate("/food")}
          className="group text-left bg-[#18181b] border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#4ade80]/10 border border-[#4ade80]/20 flex items-center justify-center">
                <Utensils size={14} className="text-[#4ade80]" />
              </div>
              <span className="text-sm font-semibold text-zinc-200">
                Nutrition
              </span>
            </div>
            <ChevronRight
              size={13}
              className="text-zinc-700 group-hover:text-zinc-400 transition-colors"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          ) : foodLogs[0] ? (
            <div>
              <p className="text-[11px] text-zinc-500 mb-2">
                Last log: {format(new Date(foodLogs[0].date), "MMM d")}
              </p>
              <div className="flex gap-4">
                {[
                  [
                    "Protein",
                    `${foodLogs[0].metrics?.proteinGrams || 0}g`,
                  ],
                  [
                    "Calories",
                    `${(
                      foodLogs[0].metrics?.calories || 0
                    ).toLocaleString()} kcal`,
                  ],
                ].map(([lbl, val]) => (
                  <div key={lbl} className="text-center">
                    <p className="text-lg font-bold text-[#4ade80]">{val}</p>
                    <p className="text-[10px] text-zinc-500">{lbl}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-600 italic">
              No nutrition logs yet
            </p>
          )}
        </button>

        {/* Quick Study Log */}
        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-[#7c3aed]/10 border border-[#7c3aed]/20 flex items-center justify-center">
              <Plus size={14} className="text-[#7c3aed]" />
            </div>
            <span className="text-sm font-semibold text-zinc-200">
              Quick Log
            </span>
          </div>
          <QuickStudyLog token={token} onLogged={loadAll} />
        </div>
      </div>
    </div>
  );
}