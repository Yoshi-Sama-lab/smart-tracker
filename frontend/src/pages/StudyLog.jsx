import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Plus, BookOpen, Trash2, Clock, CalendarDays, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Computer Science",
  "Literature",
  "Chemistry",
];

const SUBJECT_COLORS = {
  Mathematics: "#7c3aed",
  Physics: "#0ea5e9",
  "Computer Science": "#10b981",
  Literature: "#f59e0b",
  Chemistry: "#ec4899",
};

const DURATIONS = [15, 25, 30, 45, 60, 90, 120];

// ─── TOTAL BADGE ──────────────────────────────────────────────────────────────
function TotalBadge({ logs }) {
  const total = logs.reduce((s, l) => s + (Number(l.durationMinutes) || 0), 0);
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#7c3aed]/10 border border-[#7c3aed]/20 rounded-xl">
      <Clock size={12} className="text-[#7c3aed]" />
      <span className="text-xs font-semibold text-[#7c3aed]">
        {Math.floor(total / 60)}h {total % 60}m total
      </span>
    </div>
  );
}

// ─── SESSION CARD ─────────────────────────────────────────────────────────────
function SessionCard({ log, onDelete }) {
  const color = SUBJECT_COLORS[log.subject] || "#7c3aed";
  const hrs = Math.floor(log.durationMinutes / 60);
  const mins = log.durationMinutes % 60;
  const timeLabel = hrs > 0 ? `${hrs}h ${mins > 0 ? mins + "m" : ""}` : `${mins}m`;

  return (
    <Card className="group bg-[#18181b] border-zinc-800 hover:border-zinc-700 transition-all duration-200 rounded-2xl overflow-hidden">
      <CardContent className="p-5">
        {/* top row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: color }}
            />
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color }}
            >
              {log.subject}
            </span>
          </div>
          <button
            onClick={() => onDelete(log.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-700 hover:text-red-400 p-1"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* duration */}
        <p className="text-2xl font-bold text-zinc-100 leading-none mb-2">
          {timeLabel}
        </p>

        {/* note */}
        {log.note && (
          <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 mb-3">
            {log.note}
          </p>
        )}

        {/* date */}
        <div className="flex items-center gap-1.5 mt-auto">
          <CalendarDays size={10} className="text-zinc-700" />
          <span className="text-[10px] text-zinc-600">
            {format(new Date(log.date), "EEE, MMM d · h:mm a")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyState({ onOpen }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-zinc-800 rounded-2xl">
      <BookOpen size={36} className="text-zinc-700 mb-3" />
      <p className="text-zinc-400 font-medium mb-1">No sessions yet</p>
      <p className="text-zinc-600 text-sm mb-5">
        Log your first study session to start tracking
      </p>
      <Button
        onClick={onOpen}
        size="sm"
        className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white gap-2"
      >
        <Plus size={13} /> Add First Session
      </Button>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function StudyLogPage() {
  const { token, loading } = useAuth();

  const [logs, setLogs] = useState([]);
  const [filterSubject, setFilterSubject] = useState("all");

  // form
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState("");
  const [customDuration, setCustomDuration] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  // delete confirm
  const [deleteId, setDeleteId] = useState(null);

  const filtered =
    filterSubject === "all"
      ? logs
      : logs.filter((l) => l.subject === filterSubject);

  const loadLogs = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getLogs(token);
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Failed to load sessions");
    }
  }, [token]);

  useEffect(() => {
    if (!loading && token) loadLogs();
  }, [loading, token, loadLogs]);

  // ── add log ─────────────────────────────────────────────────────────────────
  const handleAddLog = async () => {
    const finalDuration = Number(duration || customDuration);
    if (!subject) {
      toast.warning("Select a subject");
      return;
    }
    if (!finalDuration || finalDuration < 1) {
      toast.warning("Enter a valid duration");
      return;
    }
    setSaving(true);
    try {
      await api.addLog(token, {
        subject,
        durationMinutes: finalDuration,
        note,
        date: new Date(date).toISOString(),
      });
      toast.success(`${finalDuration}m of ${subject} logged ✓`);
      setSubject("");
      setDuration("");
      setCustomDuration("");
      setNote("");
      setOpen(false);
      loadLogs();
    } catch (e) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ── delete log ──────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deleteLog(token, deleteId);
      toast.success("Session deleted");
      loadLogs();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen bg-[#09090b]">
        <p className="text-zinc-600 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50 p-6 md:p-8 space-y-7">
      {/* ── header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Study Log</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {logs.length} sessions recorded
          </p>
        </div>

        <div className="flex items-center gap-3">
          {logs.length > 0 && <TotalBadge logs={filtered} />}

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white gap-2 rounded-xl shadow-lg shadow-purple-500/20"
              >
                <Plus size={13} /> Add Session
              </Button>
            </DialogTrigger>

            <DialogContent className="bg-[#18181b] border-zinc-800 text-zinc-100 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  Log Study Session
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-1">
                {/* Subject */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                    Subject
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {SUBJECTS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSubject(s)}
                        className="px-2 py-2 rounded-xl text-xs font-semibold border transition-all"
                        style={{
                          borderColor:
                            subject === s
                              ? SUBJECT_COLORS[s]
                              : "#27272a",
                          background:
                            subject === s
                              ? `${SUBJECT_COLORS[s]}15`
                              : "transparent",
                          color:
                            subject === s ? SUBJECT_COLORS[s] : "#71717a",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration quick picks */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                    Duration
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {DURATIONS.map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          setDuration(String(d));
                          setCustomDuration("");
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                        style={{
                          borderColor:
                            duration === String(d) ? "#7c3aed" : "#27272a",
                          background:
                            duration === String(d)
                              ? "#7c3aed20"
                              : "transparent",
                          color:
                            duration === String(d) ? "#7c3aed" : "#71717a",
                        }}
                      >
                        {d >= 60 ? `${d / 60}h` : `${d}m`}
                      </button>
                    ))}
                  </div>
                  <Input
                    type="number"
                    placeholder="Custom minutes…"
                    value={customDuration}
                    onChange={(e) => {
                      setCustomDuration(e.target.value);
                      setDuration("");
                    }}
                    className="bg-[#09090b] border-zinc-800 mt-1 text-sm"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <CalendarDays size={11} /> Date
                  </Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-[#09090b] border-zinc-800 text-sm"
                  />
                </div>

                {/* Note */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <FileText size={11} /> Note (optional)
                  </Label>
                  <Textarea
                    placeholder="What did you work on?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="resize-none bg-[#09090b] border-zinc-800 text-sm"
                    rows={2}
                  />
                </div>

                <Button
                  onClick={handleAddLog}
                  className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-semibold"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save Session"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── filters ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {["all", ...SUBJECTS].map((s) => (
          <button
            key={s}
            onClick={() => setFilterSubject(s)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
            style={{
              borderColor:
                filterSubject === s
                  ? SUBJECT_COLORS[s] || "#7c3aed"
                  : "#27272a",
              background:
                filterSubject === s
                  ? `${SUBJECT_COLORS[s] || "#7c3aed"}15`
                  : "transparent",
              color:
                filterSubject === s
                  ? SUBJECT_COLORS[s] || "#7c3aed"
                  : "#52525b",
            }}
          >
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {/* ── grid ─────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState onOpen={() => setOpen(true)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((log) => (
            <SessionCard
              key={log.id}
              log={log}
              onDelete={(id) => setDeleteId(id)}
            />
          ))}
        </div>
      )}

      {/* ── delete confirm ────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#18181b] border-zinc-800 text-zinc-100 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-zinc-700 hover:bg-zinc-800 text-zinc-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}