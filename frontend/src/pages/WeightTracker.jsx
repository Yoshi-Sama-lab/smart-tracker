import React, { useState, useEffect, useCallback } from "react";
import { Scale, ArrowLeft, BarChart2, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const TARGET_WEIGHT = 90.0;
const START_WEIGHT = 98.0;

const groupLogsByMonth = (logs) => {
  const map = {};
  logs.forEach(log => {
    const d = new Date(log.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!map[key]) map[key] = { year: d.getFullYear(), month: d.getMonth(), logs: [] };
    map[key].logs.push(log);
  });
  return map;
};

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const card = (extra = {}) => ({
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: "24px",
  ...extra
});

const labelStyle = { fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#71717a", fontWeight: "600" };
const valStyle = (color = "#f4f4f5") => ({ fontSize: 32, fontWeight: "bold", color, marginTop: 4 });

const NavBtn = ({ onClick, children, active }) => (
  <button onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 5,
    background: active ? "rgba(124,58,237,0.1)" : "transparent",
    color: active ? "#7c3aed" : "#a1a1aa",
    border: `1px solid ${active ? "#7c3aed" : "#27272a"}`,
    borderRadius: 8, padding: "6px 14px", cursor: "pointer",
    fontSize: 13, fontWeight: "500", transition: "all 0.2s"
  }}>{children}</button>
);

// ─── FOCUS MODE: Day View ─────────────────────────────────────────────────────
const DayView = ({ monthLabel, onBack, onSaved }) => {
  const { user } = useAuth();
  const [weight, setWeight] = useState("");
  const [status, setStatus] = useState("idle");

  const handleLog = async () => {
    if (!weight || !user) return;
    setStatus("saving");
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("http://localhost:5000/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ weight: parseFloat(weight), date: new Date().toISOString() })
      });
      const data = await res.json();
      if (data.success) { 
        setStatus("saved"); 
        setWeight(""); 
        onSaved?.(); 
      }
    } catch { setStatus("error"); }
    finally { setTimeout(() => setStatus("idle"), 2000); }
  };

  return (
    <div style={{ 
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
      background: "rgba(9, 9, 11, 0.85)", backdropFilter: "blur(12px)", 
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" 
    }}>
      <div style={{ width: "100%", maxWidth: 600, marginBottom: 20, display: "flex", justifyContent: "space-between" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "#27272a", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", color: "#fff" }}>
          <ArrowLeft size={18} /> Close
        </button>
        <h2 style={{ color: "#fff", margin: 0 }}>{monthLabel}</h2>
      </div>

      <div style={{ ...card({ width: "100%", maxWidth: 600, background: "#18181b" }) }}>
        <p style={labelStyle}>Current Reading</p>
        <div style={{ display: "flex", gap: 12, margin: "20px 0" }}>
          <input 
            type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)}
            style={{ flex: 1, background: "#09090b", border: "1px solid #27272a", padding: "16px", borderRadius: 12, color: "#fff", fontSize: 24 }}
            placeholder="00.0"
          />
          <button 
            onPointerDown={handleLog}
            style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 12, padding: "0 24px", fontWeight: "bold", cursor: "pointer" }}
          >
            {status === "saving" ? "..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const WeightTracker = () => {
  const { user } = useAuth();
  const [view, setView] = useState("year");
  const [selectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [allLogs, setAllLogs] = useState([]);

  const fetchHistory = useCallback(async (isMounted) => {
    if (!user) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("http://localhost:5000/api/weight", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && isMounted) {
        setAllLogs(data.logs);
      }
    } catch (err) { 
      console.error(err); 
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      await fetchHistory(isMounted);
    };

    if (user) {
      loadData();
    }
    return () => { isMounted = false; };
  }, [user, fetchHistory]);

  const monthMap = groupLogsByMonth(allLogs);
  const latestWeight = allLogs[0]?.weight || START_WEIGHT;

  return (
    <div style={{ minHeight: "100%", background: "#09090b", padding: "40px 20px", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 40 }}>
           <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: "rgba(124,58,237,0.1)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Scale size={20} color="#7c3aed" />
            </div>
            <span style={{ color: "#fff", fontSize: 20, fontWeight: "bold" }}>Weight Evolution</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <NavBtn onClick={() => setView("year")} active={view === "year"}><BarChart2 size={14} /> Archive</NavBtn>
            <NavBtn onClick={() => setView("day")} active={view === "day"}><BookOpen size={14} /> Log Now</NavBtn>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
          <div style={card()}><p style={labelStyle}>Current</p><p style={valStyle("#7c3aed")}>{latestWeight}kg</p></div>
          <div style={card()}><p style={labelStyle}>Target</p><p style={valStyle("#4ade80")}>{TARGET_WEIGHT}kg</p></div>
          <div style={card()}><p style={labelStyle}>Left</p><p style={valStyle("#fbbf24")}>{(latestWeight - TARGET_WEIGHT).toFixed(1)}kg</p></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
          {MONTHS.map((name, i) => {
            const hasData = !!monthMap[`${selectedYear}-${i}`];
            return (
              <div 
                key={i} 
                onClick={() => { setSelectedMonth(i); setView("day"); }}
                style={{ ...card(), opacity: hasData ? 1 : 0.4, cursor: "pointer", textAlign: "center" }}
              >
                <p style={{ ...labelStyle, color: hasData ? "#7c3aed" : "#71717a" }}>{name.slice(0,3)}</p>
              </div>
            );
          })}
        </div>

        {view === "day" && (
          <DayView 
            monthLabel={`${MONTHS[selectedMonth ?? new Date().getMonth()]} ${selectedYear}`}
            onBack={() => setView("year")}
            onSaved={() => fetchHistory(true)}
          />
        )}
      </div>
    </div>
  );
};

export default WeightTracker;