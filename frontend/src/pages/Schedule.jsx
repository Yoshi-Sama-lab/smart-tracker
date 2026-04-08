import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft, ChevronRight, Clock, User, Percent,
  RefreshCw, Plus, CalendarDays, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebase";

// ─── VTOP SYNC MODAL ──────────────────────────────────────────────────────────
function VTOPSyncModal({ onSyncComplete }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0); // 0=init, 1=form
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [captchaImg, setCaptchaImg] = useState("");
  const [captchaRequired, setCaptchaRequired] = useState(true);
  const [regNo, setRegNo] = useState("");
  const [password, setPassword] = useState("");
  const [captchaText, setCaptchaText] = useState("");

  const startSync = async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser.getIdToken(true);
      const data = await api.initVtopSync(token);
      setSessionId(data.sessionId);
      setCaptchaImg(data.captchaImage);
      setCaptchaRequired(data.captchaRequired);
      setStep(1);
      setOpen(true);
    } catch (e) {
      toast.error("Failed to connect to VTOP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitSync = async () => {
    if (!regNo.trim()) { toast.warning("Enter your registration number"); return; }
    if (!password.trim()) { toast.warning("Enter your password"); return; }
    if (captchaRequired && !captchaText.trim()) { toast.warning("Enter the CAPTCHA"); return; }

    setLoading(true);
    const toastId = toast.loading("Syncing timetable & attendance…");
    try {
      const token = await auth.currentUser.getIdToken(true);
      const data = await api.submitVtopSync(token, {
        sessionId, regNo, password, captcha: captchaText,
      });
      if (data.success) {
        toast.dismiss(toastId);
        toast.success(`Synced ${data.events?.length || 0} classes ✓`);
        onSyncComplete?.(data.events);
        setOpen(false);
        setStep(0);
        setCaptchaText("");
        setPassword("");
      } else {
        throw new Error(data.error || "Sync failed");
      }
    } catch (e) {
      toast.dismiss(toastId);
      toast.error(e.message || "Sync failed — check credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={startSync}
        variant="outline"
        size="sm"
        disabled={loading}
        className="gap-1.5 bg-[#18181b] border-[#7c3aed]/40 text-[#7c3aed] hover:bg-[#7c3aed]/10 transition-all"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Connecting…" : "Sync VTOP"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="bg-[#18181b] border-zinc-800 text-zinc-100 shadow-2xl rounded-2xl"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Sync VTOP Timetable
            </DialogTitle>
          </DialogHeader>

          {step === 0 ? (
            <div className="py-8 text-center text-zinc-500 flex flex-col items-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-[#7c3aed]" />
              <p className="text-sm">Establishing secure session…</p>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                  Registration Number
                </Label>
                <Input
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  className="bg-[#09090b] border-zinc-800 focus-visible:ring-[#7c3aed]"
                  placeholder="e.g. 23BCE0001"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                  Password
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#09090b] border-zinc-800 focus-visible:ring-[#7c3aed]"
                />
              </div>

              {captchaRequired ? (
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                    CAPTCHA
                  </Label>
                  <div className="flex gap-3 items-center">
                    <div className="h-10 w-28 shrink-0 rounded-lg border border-zinc-700 overflow-hidden bg-white flex items-center justify-center">
                      <img src={captchaImg} alt="captcha" className="h-full object-contain" />
                    </div>
                    <Input
                      value={captchaText}
                      onChange={(e) => setCaptchaText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitSync()}
                      className="bg-[#09090b] border-zinc-800 uppercase tracking-widest focus-visible:ring-[#7c3aed]"
                      placeholder="Type here"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 p-3 bg-[#7c3aed]/08 border border-[#7c3aed]/20 rounded-xl">
                  <AlertCircle size={14} className="text-[#7c3aed] shrink-0" />
                  <p className="text-xs text-[#7c3aed] font-medium">
                    IP trusted — no CAPTCHA required
                  </p>
                </div>
              )}

              <Button
                onClick={submitSync}
                disabled={loading}
                className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-semibold shadow-lg shadow-purple-500/20"
              >
                {loading ? "Syncing…" : "Start Global Sync"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── EVENT CARD ───────────────────────────────────────────────────────────────
function EventCard({ event, onClick }) {
  const now = new Date();
  const [sh, sm] = event.startTime.split(":").map(Number);
  const [eh, em] = event.endTime.split(":").map(Number);
  
  // 1. Extract the exact year, month, and day from the event
  const [year, month, day] = event.day.split("-").map(Number);

  // 2. Apply both the date AND time to our start/end objects
  // Note: Month is 0-indexed in JS Dates, so we do month - 1
  const start = new Date(year, month - 1, day, sh, sm, 0);
  const end = new Date(year, month - 1, day, eh, em, 0);
  
  const isNow = now >= start && now <= end;
  const isPast = now > end && event.source === "vtop";
  const name = event.courseName || event.subject;

  return (
    <div
      onClick={() => onClick(event)}
      className={`p-3 rounded-xl border cursor-pointer transition-all mb-2 ${
        isNow
          ? "bg-[#7c3aed]/10 border-[#7c3aed]/30"
          : isPast
          ? "opacity-30 border-zinc-800/40 bg-transparent"
          : "bg-[#18181b] hover:border-zinc-700 border-zinc-800"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-semibold truncate ${isPast ? "text-zinc-500" : "text-zinc-200"}`}
           title={name}>
          {name}
        </p>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isNow && (
            <span className="text-[9px] font-bold text-[#7c3aed] bg-[#7c3aed]/15 px-1.5 py-0.5 rounded-full">
              NOW
            </span>
          )}
          {event.attendance && (
            <span
              className="text-[10px] font-mono font-bold"
              style={{
                color: parseFloat(event.attendance) >= 75 ? "#34d399" : "#f87171",
              }}
            >
              {event.attendance}%
            </span>
          )}
        </div>
      </div>
      {event.slot && (
        <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">{event.slot}</p>
      )}
      <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
        <Clock size={10} /> {event.startTime} – {event.endTime}
      </p>
    </div>
  );
}

// ─── BUNK ANALYSIS ────────────────────────────────────────────────────────────
function BunkAnalysis({ attended, total, attendance }) {
  const pct = parseFloat(attendance || 0);
  const isGood = pct >= 75;

  let msg;
  if (isGood) {
    const canBunk = Math.floor(attended / 0.75 - total);
    msg = canBunk > 0
      ? `You can bunk ${canBunk} more class${canBunk > 1 ? "es" : ""}.`
      : "You're just above 75% — don't push it.";
  } else {
    const need = Math.ceil((0.75 * total - attended) / 0.25);
    msg = `Attend ${need} consecutive class${need > 1 ? "es" : ""} to reach 75%.`;
  }

  return (
    <div
      className={`p-4 rounded-xl border ${
        isGood
          ? "bg-emerald-500/05 border-emerald-500/15"
          : "bg-rose-500/05 border-rose-500/15"
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
        Bunk Master
      </span>
      <p className={`text-sm font-medium ${isGood ? "text-emerald-400" : "text-rose-400"}`}>
        {msg}
      </p>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Schedule() {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("weekly");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const getLocalDateStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // ── load schedule ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async (user) => {
      try {
        const token = await user.getIdToken(true);
        const data = await api.getSchedule(token);
        setEvents(Array.isArray(data) ? data : data.events || []);
      } catch {
        toast.error("Failed to load schedule");
      } finally {
        setIsLoading(false);
      }
    };
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) load(user);
      else setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSyncComplete = (syncedEvents) => {
    setEvents(syncedEvents || []);
  };

  // ── nav ────────────────────────────────────────────────────────────────────
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === "daily") d.setDate(d.getDate() - 1);
    if (viewMode === "weekly") d.setDate(d.getDate() - 7);
    if (viewMode === "monthly") d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };
  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === "daily") d.setDate(d.getDate() + 1);
    if (viewMode === "weekly") d.setDate(d.getDate() + 7);
    if (viewMode === "monthly") d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const todayStr = getLocalDateStr(new Date());

  // ── DAILY VIEW ─────────────────────────────────────────────────────────────
  const renderDailyView = () => {
    const dateStr = getLocalDateStr(currentDate);
    const dayEvents = events
      .filter((e) => e.day === dateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    let totalMins = 0;
    dayEvents.forEach((e) => {
      const [sh, sm] = e.startTime.split(":").map(Number);
      const [eh, em] = e.endTime.split(":").map(Number);
      totalMins += eh * 60 + em - (sh * 60 + sm);
    });

    return (
      <div className="max-w-2xl mx-auto mt-6 flex flex-col gap-4">
        <div className="flex justify-between items-end pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              {dayEvents.length} class{dayEvents.length !== 1 ? "es" : ""} scheduled
            </p>
          </div>
          {totalMins > 0 && (
            <div className="text-right">
              <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Class Time</p>
              <p className="text-xl font-bold text-[#7c3aed]">
                {Math.floor(totalMins / 60)}h {totalMins % 60}m
              </p>
            </div>
          )}
        </div>
        {dayEvents.length === 0 ? (
          <div className="py-16 text-center text-zinc-600 flex flex-col items-center gap-2">
            <CalendarDays size={32} className="opacity-30" />
            <p className="text-sm">No classes today — take a breather 🌴</p>
          </div>
        ) : (
          dayEvents.map((e) => (
            <EventCard key={e.id} event={e} onClick={setSelectedEvent} />
          ))
        )}
      </div>
    );
  };

  // ── WEEKLY VIEW ────────────────────────────────────────────────────────────
  const renderWeeklyView = () => {
    const dow = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - dow + 1);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });

    return (
      <div className="grid grid-cols-7 gap-3 mt-6 min-h-[520px]">
        {days.map((day) => {
          const dateStr = getLocalDateStr(day);
          const dayEvents = events
            .filter((e) => e.day === dateStr)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          const isToday = todayStr === dateStr;

          return (
            <div
              key={dateStr}
              className={`flex flex-col border rounded-2xl overflow-hidden ${
                isToday
                  ? "bg-[#7c3aed]/05 border-[#7c3aed]/25"
                  : "bg-[#09090b] border-zinc-800"
              }`}
            >
              <div
                className={`p-3 border-b ${
                  isToday ? "border-[#7c3aed]/20" : "border-zinc-800"
                }`}
              >
                <div
                  className={`text-[10px] uppercase font-bold tracking-wider ${
                    isToday ? "text-[#7c3aed]" : "text-zinc-500"
                  }`}
                >
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div
                  className={`text-lg font-bold mt-0.5 ${
                    isToday ? "text-[#7c3aed]" : "text-zinc-300"
                  }`}
                >
                  {day.getDate()}
                </div>
                {dayEvents.length > 0 && (
                  <div className="text-[9px] text-zinc-600 mt-0.5">
                    {dayEvents.length} class{dayEvents.length !== 1 ? "es" : ""}
                  </div>
                )}
              </div>
              <div className="p-1.5 flex-1 overflow-y-auto">
                {dayEvents.map((e) => (
                  <EventCard key={e.id} event={e} onClick={setSelectedEvent} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── MONTHLY VIEW ───────────────────────────────────────────────────────────
  const renderMonthlyView = () => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const offset = firstDow === 0 ? 6 : firstDow - 1;
    const cells = Array.from({ length: 42 }, (_, i) => {
      const dayNum = i - offset + 1;
      if (dayNum < 1 || dayNum > daysInMonth) return null;
      const dStr = getLocalDateStr(new Date(y, m, dayNum));
      return { dayNum, dateStr: dStr, events: events.filter((e) => e.day === dStr) };
    });

    return (
      <div className="mt-6 border border-zinc-800 rounded-2xl overflow-hidden bg-[#09090b]">
        <div className="grid grid-cols-7 bg-[#18181b] border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase text-center py-3">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr">
          {cells.map((cell, i) => (
            <div
              key={i}
              className="min-h-[100px] border-b border-r border-zinc-800/50 p-1.5 hover:bg-zinc-900/40 transition-colors"
            >
              {cell && (
                <>
                  <div
                    className={`text-right text-xs font-bold p-1 ${
                      todayStr === cell.dateStr ? "text-[#7c3aed]" : "text-zinc-600"
                    }`}
                  >
                    {cell.dayNum}
                  </div>
                  <div className="space-y-0.5 overflow-y-auto max-h-20">
                    {cell.events
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map((e) => (
                        <div
                          key={e.id}
                          onClick={() => setSelectedEvent(e)}
                          className="text-[9px] truncate bg-[#18181b] border border-zinc-800 rounded px-1 py-0.5 text-zinc-400 cursor-pointer hover:border-[#7c3aed]/50 transition-colors"
                        >
                          {e.startTime} {(e.courseName || e.subject).split(" ")[0]}
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full text-zinc-100 flex flex-col h-full p-6">
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-5 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Academic Schedule
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {viewMode === "monthly"
              ? currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
              : viewMode === "daily"
              ? currentDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
              : "Weekly overview"}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          <VTOPSyncModal onSyncComplete={handleSyncComplete} />

          <Button
            size="sm"
            className="bg-[#7c3aed] hover:bg-[#6d28d9] gap-1.5 shadow-lg shadow-purple-500/20 rounded-xl"
          >
            <Plus size={13} /> Plan Session
          </Button>

          <div className="h-7 w-px bg-zinc-800" />

          {/* view toggle */}
          <div className="flex bg-[#18181b] border border-zinc-800 rounded-xl p-1 gap-0.5">
            {["daily", "weekly", "monthly"].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-3 py-1 text-xs rounded-lg capitalize font-semibold transition-all"
                style={{
                  background: viewMode === mode ? "#7c3aed" : "transparent",
                  color: viewMode === mode ? "#fff" : "#52525b",
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* nav arrows */}
          <div className="flex items-center gap-0.5 bg-[#18181b] border border-zinc-800 rounded-xl p-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-zinc-800 rounded-lg" onClick={handlePrev}>
              <ChevronLeft size={14} />
            </Button>
            <Button
              variant="ghost"
              className="h-7 px-3 text-xs hover:bg-zinc-800 rounded-lg font-semibold"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-zinc-800 rounded-lg" onClick={handleNext}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* ── LOADING ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-600 text-sm">Loading schedule…</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0">
          {viewMode === "daily" && renderDailyView()}
          {viewMode === "weekly" && renderWeeklyView()}
          {viewMode === "monthly" && renderMonthlyView()}
        </div>
      )}

      {/* ── EVENT DETAIL DIALOG ───────────────────────────────────────────── */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent
          aria-describedby={undefined}
          className="bg-[#09090b] border-zinc-800 text-zinc-100 sm:max-w-md shadow-2xl rounded-2xl"
        >
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2.5 pr-4">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#7c3aed] shrink-0" />
                  {selectedEvent.courseName || selectedEvent.subject}
                </DialogTitle>
              </DialogHeader>

              {selectedEvent.source === "vtop" ? (
                <div className="space-y-3 pt-3">
                  {/* tags */}
                  <div className="flex gap-2">
                    {selectedEvent.courseCode && (
                      <span className="px-2 py-1 bg-[#7c3aed]/15 text-[#7c3aed] text-xs font-bold rounded-lg border border-[#7c3aed]/25">
                        {selectedEvent.courseCode}
                      </span>
                    )}
                    {selectedEvent.slot && (
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs font-bold rounded-lg border border-zinc-700">
                        {selectedEvent.slot}
                      </span>
                    )}
                  </div>

                  {/* info rows */}
                  {[
                    { icon: Clock, label: "Timing", value: `${selectedEvent.startTime} – ${selectedEvent.endTime}` },
                    { icon: User, label: "Faculty", value: selectedEvent.teacher || "Unknown" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between p-3 bg-[#18181b] rounded-xl border border-zinc-800/50"
                    >
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Icon size={13} />
                        <span className="text-sm">{label}</span>
                      </div>
                      <span className="text-zinc-200 font-medium text-sm text-right max-w-[160px] truncate">
                        {value}
                      </span>
                    </div>
                  ))}

                  {/* attendance */}
                  <div className="flex items-center justify-between p-3 bg-[#18181b] rounded-xl border border-zinc-800/50">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Percent size={13} />
                      <span className="text-sm">Attendance</span>
                    </div>
                    <div className="text-right">
                      <span
                        className="font-bold text-lg"
                        style={{
                          color:
                            parseFloat(selectedEvent.attendance) >= 75
                              ? "#34d399"
                              : "#f87171",
                        }}
                      >
                        {selectedEvent.attendance || "0"}%
                      </span>
                      <p className="text-[10px] text-zinc-600 font-mono">
                        {selectedEvent.attended}/{selectedEvent.total} classes
                      </p>
                    </div>
                  </div>

                  {/* bunk analysis */}
                  {selectedEvent.attended != null && (
                    <BunkAnalysis
                      attended={selectedEvent.attended}
                      total={selectedEvent.total}
                      attendance={selectedEvent.attendance}
                    />
                  )}
                </div>
              ) : (
                <div className="pt-3 text-zinc-500 text-sm text-center bg-[#18181b] p-6 rounded-xl border border-zinc-800">
                  Personal Study Session
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}