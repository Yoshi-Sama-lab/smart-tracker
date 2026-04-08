import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, RotateCcw, Timer, Coffee, Minus, Check,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const MODES = {
  work: { label: "Focus", seconds: 25 * 60, color: "#7c3aed" },
  break: { label: "Break", seconds: 5 * 60, color: "#4ade80" },
  longbreak: { label: "Long Break", seconds: 15 * 60, color: "#0ea5e9" },
};

const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Computer Science",
  "Literature",
  "Chemistry",
  "General Study",
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmtTime = (secs) =>
  `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(
    secs % 60
  ).padStart(2, "0")}`;

const playChime = () => {
  try {
    const ctx = new AudioContext();
    [880, 1100, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.05);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + i * 0.18 + 0.4
      );
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.4);
    });
  } catch (_) {}
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function PomodoroTimer() {
  const { token } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [modeKey, setModeKey] = useState("work");
  const [timeLeft, setTimeLeft] = useState(MODES.work.seconds);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0); // completed work sessions
  const [subject, setSubject] = useState("General Study");
  const [toast, setToast] = useState(null); // { msg, type }

  const intervalRef = useRef(null);
  const mode = MODES[modeKey];

  // ── SVG ring ──────────────────────────────────────────────────────────────
  const RADIUS = 52;
  const CIRC = 2 * Math.PI * RADIUS;
  const progress = ((mode.seconds - timeLeft) / mode.seconds) * 100;
  const dashOffset = CIRC - (progress / 100) * CIRC;

  // ── toast helper ──────────────────────────────────────────────────────────
  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── log session to backend ─────────────────────────────────────────────────
  const logSession = useCallback(async () => {
    if (!token) return;
    try {
      await api.addLog(token, {
        subject,
        durationMinutes: 25,
        note: "Pomodoro ✓",
        date: new Date().toISOString(),
      });
      showToast(`✓ 25m of "${subject}" logged`, "success");
    } catch (_) {
      showToast("Session finished — log it manually", "warn");
    }
  }, [token, subject]);

  // ── session complete ───────────────────────────────────────────────────────
  const handleComplete = useCallback(() => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    playChime();

    if (modeKey === "work") {
      const newCount = sessions + 1;
      setSessions(newCount);
      logSession();
      const next = newCount % 4 === 0 ? "longbreak" : "break";
      setModeKey(next);
      setTimeLeft(MODES[next].seconds);
      showToast(
        newCount % 4 === 0
          ? "4 sessions done! Take a long break 🎉"
          : "Time for a short break ☕",
        "info"
      );
    } else {
      setModeKey("work");
      setTimeLeft(MODES.work.seconds);
      showToast("Break over — let's focus! 💪", "info");
    }
  }, [modeKey, sessions, logSession]);

  // ── countdown tick ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, handleComplete]);

  // ── update tab title ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isRunning) {
      document.title = `${fmtTime(timeLeft)} · ${mode.label}`;
    } else {
      document.title = "Smart OS";
    }
    return () => {
      document.title = "Smart OS";
    };
  }, [isRunning, timeLeft, mode.label]);

  // ── reset ──────────────────────────────────────────────────────────────────
  const reset = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setTimeLeft(mode.seconds);
  };

  // ── switch mode ────────────────────────────────────────────────────────────
  const switchMode = (key) => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setModeKey(key);
    setTimeLeft(MODES[key].seconds);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: collapsed floating button
  // ─────────────────────────────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 select-none"
        style={{
          background: mode.color,
          boxShadow: `0 8px 32px ${mode.color}55`,
        }}
        title={`Pomodoro — ${fmtTime(timeLeft)}`}
      >
        <Timer size={20} color="white" />
        {isRunning && (
          <span
            className="absolute -top-1 -right-1 text-[9px] font-mono font-bold text-white bg-black/50 px-1.5 py-0.5 rounded-full pointer-events-none"
          >
            {fmtTime(timeLeft)}
          </span>
        )}
      </button>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: expanded panel
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-72 rounded-2xl overflow-hidden shadow-2xl border"
      style={{
        background: "#18181b",
        borderColor: `${mode.color}30`,
        boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px ${mode.color}20`,
      }}
    >
      {/* ── header ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-zinc-800"
      >
        <div className="flex items-center gap-2">
          <Timer size={13} style={{ color: mode.color }} />
          <span className="text-sm font-semibold text-zinc-200">
            {mode.label}
          </span>
          {sessions > 0 && (
            <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
              {sessions} done
            </span>
          )}
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-zinc-600 hover:text-zinc-300 transition-colors"
          title="Minimise"
        >
          <Minus size={14} />
        </button>
      </div>

      {/* ── body ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center px-4 py-5">

        {/* SVG ring */}
        <div className="relative w-36 h-36 mb-3">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            {/* track */}
            <circle
              cx="60" cy="60" r={RADIUS}
              fill="none" stroke="#27272a" strokeWidth="7"
            />
            {/* progress */}
            <circle
              cx="60" cy="60" r={RADIUS}
              fill="none"
              stroke={mode.color}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              className="transition-all duration-1000"
              style={{ filter: `drop-shadow(0 0 6px ${mode.color}66)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className="text-3xl font-mono font-bold text-zinc-100 tabular-nums leading-none">
              {fmtTime(timeLeft)}
            </span>
            <span
              className="text-[9px] uppercase tracking-widest font-semibold"
              style={{ color: mode.color }}
            >
              {mode.label}
            </span>
          </div>
        </div>

        {/* session dots */}
        <div className="flex gap-2 mb-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                background:
                  i < sessions % 4
                    ? mode.color
                    : i === sessions % 4 && modeKey === "work" && isRunning
                    ? `${mode.color}50`
                    : "#27272a",
              }}
            />
          ))}
        </div>

        {/* Subject selector — only in work mode when paused */}
        {modeKey === "work" && !isRunning && (
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full text-xs bg-[#09090b] border border-zinc-800 text-zinc-300 px-3 py-2 rounded-lg mb-3 focus:outline-none focus:border-[#7c3aed] transition-colors"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}

        {/* inline toast */}
        {toast && (
          <div
            className="w-full mb-3 px-3 py-2 rounded-lg text-center"
            style={{
              background:
                toast.type === "success"
                  ? "rgba(124,58,237,0.12)"
                  : "rgba(161,161,170,0.08)",
              border: `1px solid ${
                toast.type === "success"
                  ? "rgba(124,58,237,0.25)"
                  : "rgba(63,63,70,0.8)"
              }`,
            }}
          >
            <p className="text-xs text-zinc-300 font-medium flex items-center justify-center gap-1.5">
              {toast.type === "success" && (
                <Check size={11} className="text-[#7c3aed]" />
              )}
              {toast.msg}
            </p>
          </div>
        )}

        {/* controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
            title="Reset"
          >
            <RotateCcw size={14} className="text-zinc-400" />
          </button>

          {/* main play/pause */}
          <button
            onClick={() => setIsRunning((r) => !r)}
            className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{
              background: mode.color,
              boxShadow: `0 6px 20px ${mode.color}50`,
            }}
          >
            {isRunning ? (
              <Pause size={22} color="white" />
            ) : (
              <Play size={22} color="white" className="ml-0.5" />
            )}
          </button>

          <button
            onClick={() =>
              switchMode(modeKey === "work" ? "break" : "work")
            }
            className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
            title="Switch mode"
          >
            <Coffee size={14} className="text-zinc-400" />
          </button>
        </div>
      </div>

      {/* ── mode tab bar ───────────────────────────────────────────────── */}
      <div className="flex border-t border-zinc-800">
        {Object.entries(MODES).map(([key, m]) => (
          <button
            key={key}
            onClick={() => switchMode(key)}
            className="flex-1 py-2.5 text-xs font-semibold transition-all"
            style={{
              color: modeKey === key ? m.color : "#52525b",
              background:
                modeKey === key ? `${m.color}10` : "transparent",
              borderTop:
                modeKey === key
                  ? `2px solid ${m.color}`
                  : "2px solid transparent",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}