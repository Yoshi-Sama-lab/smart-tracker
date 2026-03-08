import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Plus, BookOpen, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const subjects = ["Mathematics", "Physics", "Computer Science", "Literature", "Chemistry"];

export default function StudyLogPage() {
  const { token, loading } = useAuth();

  // Data States
  const [logs, setLogs] = useState([]);
  const [filterSubject, setFilterSubject] = useState("all");
  
  // Form States
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  
  // Status States
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const filtered = filterSubject === "all" ? logs : logs.filter((l) => l.subject === filterSubject);

  const loadLogs = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getLogs(token);
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr("Failed to load logs");
    }
  }, [token]);

  useEffect(() => {
    if (!loading && token) {
      loadLogs();
    }
  }, [loading, token, loadLogs]);

  const handleAddLog = async () => {
    if (!subject || !duration || !token) {
      setErr("Subject and duration are required");
      return;
    }

    try {
      setSaving(true);
      setErr("");
      await api.addLog(token, {
        subject,
        durationMinutes: Number(duration),
        note,
        date: new Date(date).toISOString(),
      });

      setSubject("");
      setDuration("");
      setNote("");
      setOpen(false);
      await loadLogs();
    } catch (e) {
      console.error(e);
      setErr("Failed to add log");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLog = async (id) => {
    if (!confirm("Delete this session?")) return;
    try {
      await api.deleteLog(token, id);
      await loadLogs();
    } catch (e) {
      console.error(e);
      alert("Failed to delete log");
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading study data...</div>;
  }

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#09090b] text-zinc-50">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Study Log</h1>
          <p className="text-sm text-zinc-400">{logs.length} sessions recorded</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-4 py-2 rounded-lg gap-2 shadow-lg shadow-purple-500/20 transition-all">
              <Plus className="h-4 w-4" /> Add Session
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#18181b] border-zinc-800 text-zinc-100">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Log Study Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-zinc-400">Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="bg-[#09090b] border-zinc-800"><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent className="bg-[#18181b] border-zinc-800">
                    {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400">Duration (min)</Label>
                  <Input type="number" className="bg-[#09090b] border-zinc-800" placeholder="45" value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Date</Label>
                  <Input type="date" className="bg-[#09090b] border-zinc-800" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Note (optional)</Label>
                <Textarea 
                  placeholder="What did you study?" 
                  value={note} 
                  onChange={(e) => setNote(e.target.value)} 
                  className="resize-none bg-[#09090b] border-zinc-800" 
                  rows={2} 
                />
              </div>
              {err && <p className="text-xs text-red-400 font-medium">{err}</p>}
              <Button onClick={handleAddLog} className="w-full bg-[#7c3aed] hover:bg-[#6d28d9]" disabled={saving}>
                {saving ? "Saving..." : "Save Session"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Section */}
      <div className="flex items-center gap-2">
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-48 bg-[#18181b] border-zinc-800 text-zinc-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#18181b] border-zinc-800">
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((log) => (
          <Card key={log.id} className="group bg-[#18181b] border-zinc-800 hover:border-zinc-700 transition-all duration-200 relative overflow-hidden rounded-xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-400">
                  <BookOpen className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium tracking-wide uppercase">{log.subject}</span>
                </div>
                <div className="flex items-center gap-3">
                   <span className="text-xs text-zinc-500 font-medium">
                    {format(new Date(log.date), "MMM d")}
                  </span>
                  <button 
                    onClick={() => handleDeleteLog(log.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-3xl font-bold text-zinc-100">{log.durationMinutes} min</p>
                {log.note && (
                  <p className="text-sm text-zinc-500 font-normal leading-relaxed line-clamp-2">
                    {log.note}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-zinc-500 text-sm border-2 border-dashed border-zinc-800 rounded-2xl">
          No sessions found. Start studying! 📚
        </div>
      )}
    </div>
  );
}
