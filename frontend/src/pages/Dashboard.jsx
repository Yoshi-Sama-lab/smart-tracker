import { useEffect, useMemo, useState } from "react";
import { format, subDays, isSameDay } from "date-fns";
import { Clock, Flame, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899"];

export default function Dashboard() {
  const { user, token, loading } = useAuth();
  const [logs, setLogs] = useState([]);

  const [now] = useState(() => Date.now());
  const [today] = useState(() => new Date());

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        const data = await api.getLogs(token);
        setLogs(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load logs:", e);
      }
    };

    if (!loading) load();
  }, [loading, token]);

  // ---- Dynamic Subjects ----
  const subjects = useMemo(() => {
    const set = new Set();
    logs.forEach((l) => set.add(l.subject || "Other"));
    return Array.from(set);
  }, [logs]);

  // ---- Today Minutes ----
  const todayMin = useMemo(() => {
    return logs
      .filter((l) => isSameDay(new Date(l.date), today))
      .reduce((s, l) => s + (Number(l.durationMinutes) || 0), 0);
  }, [logs, today]);

  // ---- Weekly Total ----
  const weeklyTotal = useMemo(() => {
    const weekAgo = now - 7 * 86400000;
    return logs
      .filter((l) => new Date(l.date).getTime() > weekAgo)
      .reduce((s, l) => s + (Number(l.durationMinutes) || 0), 0);
  }, [logs, now]);

  // ---- Streak ----
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

  // ---- Chart Data (7 days) ----
  const chartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today, 6 - i);
      const row = { day: format(d, "EEE") };

      subjects.forEach((sub) => {
        const mins = logs
          .filter(
            (l) =>
              l.subject === sub &&
              isSameDay(new Date(l.date), d)
          )
          .reduce((s, l) => s + (Number(l.durationMinutes) || 0), 0);

        row[sub] = mins;
      });

      return row;
    });
  }, [logs, subjects, today]);

  // ---- Breakdown ----
  const breakdownData = useMemo(() => {
    return subjects
      .map((name) => ({
        name,
        value: logs
          .filter((l) => l.subject === name)
          .reduce((s, l) => s + (Number(l.durationMinutes) || 0), 0),
      }))
      .filter((d) => d.value > 0);
  }, [logs, subjects]);

  if (loading)
    return <div className="p-10 text-zinc-500">Loading Dashboard...</div>;

  return (
    <div className="space-y-8 p-8 min-h-screen bg-[#09090b] text-white">
      <div>
        <h1 className="text-4xl font-bold">
          Welcome back, {user?.displayName?.split(" ")[0] || "Student"}
        </h1>
        <p className="text-zinc-500 mt-1">
          {format(today, "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-[#09090b] border-[#27272a]">
          <CardContent className="flex items-center gap-5 p-8">
            <Clock className="text-indigo-400" />
            <div>
              <p className="text-3xl font-bold">
                {Math.floor(todayMin / 60)}h {todayMin % 60}m
              </p>
              <p className="text-sm text-zinc-500">Today</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#09090b] border-[#27272a]">
          <CardContent className="flex items-center gap-5 p-8">
            <Flame className="text-indigo-400" />
            <div>
              <p className="text-3xl font-bold">{streak} days</p>
              <p className="text-sm text-zinc-500">Current streak</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#09090b] border-[#27272a]">
          <CardContent className="flex items-center gap-5 p-8">
            <TrendingUp className="text-indigo-400" />
            <div>
              <p className="text-3xl font-bold">
                {Math.floor(weeklyTotal / 60)}h
              </p>
              <p className="text-sm text-zinc-500">This week</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3 bg-[#09090b] border-[#27272a] p-6">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="#1f2937" vertical={false} />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                {subjects.map((sub, i) => (
                  <Bar
                    key={sub}
                    dataKey={sub}
                    stackId="a"
                    fill={COLORS[i % COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2 bg-[#09090b] border-[#27272a] p-6">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdownData}
                  dataKey="value"
                  innerRadius={60}
                  outerRadius={90}
                >
                  {breakdownData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}