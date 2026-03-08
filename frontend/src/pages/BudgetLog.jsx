import React, { useState, useEffect, useRef, useCallback } from "react";
import HTMLFlipBook from "react-pageflip";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Save, ChevronLeft, ChevronRight, Calendar, BookOpen, BarChart2, ArrowLeft, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import ReactMarkdown from "react-markdown";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const SPINE_COLORS = [
  "#0ea5e9", "#0284c7", "#0369a1", "#075985", "#0c4a6e", "#082f49",
  "#2563eb", "#1d4ed8", "#1e40af", "#1e3a8a", "#172554", "#0284c7"
];

const groupLogsByMonth = (logs) => {
  const map = {};
  const now = new Date();
  
  const currentKey = `${now.getFullYear()}-${now.getMonth()}`;
  map[currentKey] = { year: now.getFullYear(), month: now.getMonth(), logs: [] };

  logs.forEach(log => {
    const d = new Date(log.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!map[key]) map[key] = { year: d.getFullYear(), month: d.getMonth(), logs: [] };
    if (!map[key].logs.find(l => l.id === log.id)) {
      map[key].logs.push(log);
    }
  });
  return map;
};

// ─── PAGE COMPONENT (DARK THEME) ──────────────────────────────────────────────
const Page = React.forwardRef(({ children, isLeft }, ref) => (
  <div ref={ref} data-density="soft" style={{
    background: isLeft ? "linear-gradient(to right, #18181b, #121214)" : "linear-gradient(to left, #18181b, #121214)",
    borderRight: isLeft ? "1px solid #27272a" : "none",
    borderLeft: !isLeft ? "1px solid #27272a" : "none",
    boxShadow: isLeft ? "inset -4px 0 12px rgba(0,0,0,0.5)" : "inset 4px 0 12px rgba(0,0,0,0.5)",
    display: "flex", flexDirection: "column", padding: "40px 32px",
    height: "100%", boxSizing: "border-box", overflow: "hidden",
    fontFamily: "Inter, sans-serif", position: "relative"
  }}>
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      backgroundImage: "repeating-linear-gradient(transparent, transparent 31px, rgba(14, 165, 233, 0.1) 31px, rgba(14, 165, 233, 0.1) 32px)",
      backgroundPositionY: "40px",
      opacity: 1
    }} />
    <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column" }}>
      {children}
    </div>
  </div>
));

// ─── BOOK SPINE ───────────────────────────────────────────────────────────────
const BookSpine = ({ month, color, logCount, onClick, disabled }) => (
  <div
    onClick={!disabled ? onClick : undefined}
    style={{
      width: 52, height: 220,
      background: disabled ? "#18181b" : `linear-gradient(135deg, ${color}, #09090b)`,
      borderRadius: "3px 6px 6px 3px", cursor: disabled ? "default" : "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
      boxShadow: "3px 3px 10px rgba(0,0,0,0.5), inset -2px 0 6px rgba(255,255,255,0.1)",
      transition: "transform 0.2s, box-shadow 0.2s", position: "relative", userSelect: "none",
      opacity: disabled ? 0.3 : 1,
      border: disabled ? "1px solid #27272a" : "1px solid rgba(255,255,255,0.1)"
    }}
    onMouseEnter={e => { if (!disabled) { e.currentTarget.style.transform = "translateY(-8px) rotate(-2deg)"; e.currentTarget.style.boxShadow = `0 0 20px ${color}88, inset -2px 0 6px rgba(255,255,255,0.2)`; }}}
    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "3px 3px 10px rgba(0,0,0,0.5), inset -2px 0 6px rgba(255,255,255,0.1)"; }}
  >
    <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", color: "#fff", fontWeight: "bold", fontSize: 13, letterSpacing: 2 }}>
      {MONTHS[month].toUpperCase()}
    </span>
    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: "monospace" }}>{logCount}</span>
    {[20,60,160,200].map(top => <div key={top} style={{ position: "absolute", top, left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.1)" }} />)}
  </div>
);

const YearBook = ({ year, logCount, onClick }) => (
  <div onClick={onClick} style={{
    width: 70, height: 260,
    background: "linear-gradient(135deg, #18181b, #09090b)",
    borderRadius: "4px 8px 8px 4px", cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
    boxShadow: "4px 4px 14px rgba(0,0,0,0.8), inset -3px 0 8px rgba(14,165,233,0.2)",
    transition: "transform 0.2s, box-shadow 0.2s", border: "1px solid rgba(14,165,233,0.3)"
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-10px)"; e.currentTarget.style.boxShadow = "0 0 25px rgba(14,165,233,0.4), inset -3px 0 8px rgba(14,165,233,0.4)"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "4px 4px 14px rgba(0,0,0,0.8), inset -3px 0 8px rgba(14,165,233,0.2)"; }}
  >
    <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", color: "#0ea5e9", fontWeight: "bold", fontSize: 18, letterSpacing: 4, textShadow: "0 0 10px rgba(14,165,233,0.5)" }}>{year}</span>
    <span style={{ color: "rgba(14,165,233,0.6)", fontSize: 11, fontFamily: "monospace" }}>{logCount} logs</span>
  </div>
);

// ─── NAV BUTTON ───────────────────────────────────────────────────────────────
const NavBtn = ({ onClick, children, active }) => (
  <button onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 5,
    background: active ? "rgba(14,165,233,0.1)" : "transparent",
    color: active ? "#0ea5e9" : "#a1a1aa",
    border: `1px solid ${active ? "#0ea5e9" : "#27272a"}`,
    borderRadius: 8, padding: "6px 14px", cursor: "pointer",
    fontSize: 13, fontWeight: "500", transition: "all 0.2s"
  }}>{children}</button>
);

// ─── DIARY VIEW (MODAL) ───────────────────────────────────────────────────────
const DiaryView = ({ logs, month, year, onBack, currentDate, onSaved }) => {
  const bookRef = useRef();
  const { user } = useAuth();
  const [currentSpread, setCurrentSpread] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  const [aiData, setAiData] = useState({ 
    summary: "Save your log to get your Financial Synthesis.", 
    metrics: { foodSpendToday: 0, remainingBudget: 5000 } 
  });

  const isCurrentMonth = month === currentDate.getMonth() && year === currentDate.getFullYear();
  const totalSpreads = (isCurrentMonth ? 1 : 0) + logs.length;

  const editor = useEditor({
    extensions: [StarterKit],
    content: `<h2>Expense Log: ${currentDate.toLocaleDateString()}</h2><h3>Transactions</h3><ul><li><strong>Food Spend:</strong> ₹[ ]</li><li><strong>Other:</strong> ₹[ ]</li></ul><h3>Notes</h3><p><em>Justification for extra spends:</em> </p>`,
    editorProps: { attributes: { class: "notebook-editor focus:outline-none" } }
  });

  const handleSave = async () => {
    if (!editor || !user) return;
    setIsSaving(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("http://localhost:5000/api/lifelog", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ textContent: editor.getText(), date: new Date().toISOString(), logType: "budget" })
      });
      const data = await response.json();
      if (data.success) {
        setAiData({ summary: data.aiSummary, metrics: data.metrics });
        onSaved?.(); 
      }
    } catch (err) { console.error(err); }
    finally { setIsSaving(false); }
  };

  const metricBox = (label, val, textColor) => (
    <div key={label} style={{ background: "rgba(14,165,233,0.05)", borderRadius: 8, padding: "12px 8px", textAlign: "center", border: "1px solid rgba(14,165,233,0.2)" }}>
      <div style={{ fontSize: 10, letterSpacing: 1, color: "#a1a1aa", textTransform: "uppercase", marginBottom: 4, fontWeight: "600" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: "bold", color: textColor || "#f4f4f5" }}>{val}</div>
    </div>
  );

  return (
    <div style={{ 
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
      background: "rgba(9, 9, 11, 0.85)", backdropFilter: "blur(12px)", 
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", 
      padding: "20px" 
    }}>
      
      <style>{`
        .notebook-editor h2 { font-size: 16px; font-weight: 700; line-height: 32px; margin: 0; text-transform: uppercase; letter-spacing: 1px; color: #f4f4f5; }
        .notebook-editor h3 { font-size: 14px; font-weight: 600; line-height: 32px; margin: 0; color: #0ea5e9; }
        .notebook-editor p { font-size: 14px; line-height: 32px; margin: 0; color: #d4d4d8; }
        .notebook-editor ul { margin: 0; padding-left: 20px; list-style-type: square; color: #d4d4d8; }
        .notebook-editor li { font-size: 14px; line-height: 32px; margin: 0; }
        .notebook-editor strong { color: #f4f4f5; font-weight: 600; }
        
        .ai-synthesis-content h3 { font-size: 14px; font-weight: 700; line-height: 32px; margin: 0; color: #0ea5e9; text-transform: uppercase; letter-spacing: 1px; }
        .ai-synthesis-content p { font-size: 13px; line-height: 32px; margin: 0; color: #a1a1aa; }
        .ai-synthesis-content ul { margin: 0; padding-left: 16px; list-style-type: disc; color: #a1a1aa; }
        .ai-synthesis-content li { font-size: 13px; line-height: 32px; margin: 0; }
        .ai-synthesis-content strong { color: #f4f4f5; font-weight: 600; }
        .archive-content { font-size: 14px; line-height: 32px; white-space: pre-wrap; margin: 0; color: #d4d4d8; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 1000, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(39, 39, 42, 0.8)", border: "1px solid #3f3f46", borderRadius: 8, padding: "8px 16px", cursor: "pointer", color: "#e4e4e7", fontSize: 14, fontWeight: "500", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#3f3f46"} onMouseLeave={(e) => e.currentTarget.style.background = "rgba(39, 39, 42, 0.8)"}>
          <ArrowLeft size={16} /> Close & Return
        </button>
        <h2 style={{ color: "#f4f4f5", fontSize: 24, margin: 0, fontWeight: "700", letterSpacing: 1 }}>{MONTHS[month]} {year}</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontFamily: "monospace", fontSize: 13, color: "#a1a1aa", marginRight: 8 }}>{currentSpread + 1} / {totalSpreads || 1}</span>
          <button onClick={() => bookRef.current?.pageFlip()?.flipPrev()} style={{ background: "rgba(39, 39, 42, 0.8)", border: "1px solid #3f3f46", borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: "#e4e4e7" }}><ChevronLeft size={16} /></button>
          <button onClick={() => bookRef.current?.pageFlip()?.flipNext()} style={{ background: "rgba(39, 39, 42, 0.8)", border: "1px solid #3f3f46", borderRadius: 8, padding: "8px 12px", cursor: "pointer", color: "#e4e4e7" }}><ChevronRight size={16} /></button>
        </div>
      </div>

      <div style={{ background: "#09090b", borderRadius: 16, padding: "24px 28px", boxShadow: "0 30px 60px rgba(0,0,0,0.9)", display: "inline-block", border: "1px solid #27272a" }}>
        <HTMLFlipBook 
          key={`book-${totalSpreads}`} 
          ref={bookRef} 
          width={480} 
          height={640} 
          size="fixed" 
          maxShadowOpacity={0.8} 
          showCover={false} 
          mobileScrollSupport={false} 
          onFlip={e => setCurrentSpread(Math.floor(e.data / 2))}
        >
          {[
            ...(isCurrentMonth ? [
              <Page key="today-l" isLeft>
                <div style={{ borderBottom: "2px solid #0ea5e9", marginBottom: 12, paddingBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", height: "32px", boxSizing: "border-box" }}>
                  <span style={{ color: "#0ea5e9", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontWeight: "600", lineHeight: "16px" }}>Today</span>
                  <span style={{ fontWeight: "600", color: "#f4f4f5", fontSize: 13, lineHeight: "16px" }}>{currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
                </div>
                
                <div 
                  style={{ flex: 1, overflowY: "auto", userSelect: "text", cursor: "text" }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => editor?.chain().focus().run()}
                >
                  <EditorContent editor={editor} />
                </div>

                <button 
                  onPointerDown={(e) => {
                    e.stopPropagation(); 
                    if (!isSaving) handleSave(); 
                  }}
                  disabled={isSaving} 
                  style={{ 
                    marginTop: 12, alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 6, 
                    background: "#0ea5e9", color: "#ffffff", border: "none", borderRadius: 8, padding: "8px 16px", 
                    cursor: "pointer", fontSize: 13, fontWeight: "600", boxShadow: "0 4px 12px rgba(14,165,233,0.3)",
                    position: "relative", zIndex: 50
                  }}
                >
                  <Save size={14} /> {isSaving ? "Saving…" : "Ink & Save"}
                </button>
              </Page>,
              <Page key="today-r">
                <div style={{ borderBottom: "2px solid #27272a", marginBottom: 16, paddingBottom: 8 }}><span style={{ color: "#71717a", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontWeight: "600" }}>AI Synthesis</span></div>
                
                <div className="ai-synthesis-content" style={{ flex: 1, overflowY: "auto", userSelect: "text" }} onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
                  <ReactMarkdown>{aiData.summary}</ReactMarkdown>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: "auto" }}>
                  {metricBox("Spent", `₹${aiData.metrics?.foodSpendToday || 0}`, "#f87171")}
                  {metricBox("Remaining", `₹${aiData.metrics?.remainingBudget || 5000}`, "#34d399")}
                </div>
                {logs.length > 0 && (
                   <div style={{ marginTop: 16, textAlign: "center", fontSize: 11, color: "#52525b" }}>← Turn page for past entries →</div>
                )}
              </Page>
            ] : []),

            ...logs.flatMap(log => [
              <Page key={`${log.id}-L`} isLeft>
                <div style={{ borderBottom: "2px solid #27272a", marginBottom: 12, paddingBottom: 8, display: "flex", justifyContent: "space-between", height: "32px", boxSizing: "border-box" }}>
                  <span style={{ color: "#71717a", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontWeight: "600", lineHeight: "16px" }}>Ledger Entry</span>
                  <span style={{ fontWeight: "600", color: "#e4e4e7", fontSize: 13, lineHeight: "16px" }}>{new Date(log.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                </div>
                <div className="archive-content" style={{ flex: 1, overflowY: "auto", userSelect: "text" }}
                     onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
                  {log.textContent}
                </div>
              </Page>,
              <Page key={`${log.id}-R`}>
                <div style={{ borderBottom: "2px solid #27272a", marginBottom: 16, paddingBottom: 8 }}><span style={{ color: "#71717a", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontWeight: "600" }}>Archived Synthesis</span></div>
                
                <div className="ai-synthesis-content" style={{ flex: 1, overflowY: "auto", userSelect: "text" }} onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
                  <ReactMarkdown>{log.aiSummary || log.coach_analysis_report || "No synthesis available."}</ReactMarkdown>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: "auto" }}>
                  {metricBox("Spent", `₹${log.metrics?.foodSpendToday || 0}`, "#f87171")}
                  {metricBox("Remaining", `₹${log.metrics?.remainingBudget || 5000}`, "#34d399")}
                </div>
              </Page>
            ])
          ]}
        </HTMLFlipBook>
      </div>
    </div>
  );
};

// ─── MONTH SHELF ──────────────────────────────────────────────────────────────
const MonthShelf = ({ year, monthMap, onSelectMonth, onBack }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
    <div style={{ width: "100%", maxWidth: 900, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#a1a1aa", fontSize: 14, fontWeight: "500" }}>
        <ArrowLeft size={16} /> All Years
      </button>
      <h2 style={{ color: "#f4f4f5", fontSize: 24, margin: 0, fontWeight: "700", letterSpacing: 1 }}>{year}</h2>
      <div style={{ width: 80 }} />
    </div>
    <div style={{ background: "#18181b", borderRadius: 16, padding: "40px 48px 20px", boxShadow: "0 20px 40px rgba(0,0,0,0.5)", width: "100%", maxWidth: 900, position: "relative", border: "1px solid #27272a" }}>
      <div style={{ position: "absolute", bottom: 50, left: 0, right: 0, height: 8, background: "#09090b", borderTop: "1px solid #27272a", borderBottom: "1px solid #27272a" }} />
      <div style={{ display: "flex", gap: 14, alignItems: "flex-end", justifyContent: "center", flexWrap: "wrap" }}>
        {MONTHS.map((name, i) => {
          const key = `${year}-${i}`;
          const data = monthMap[key];
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <BookSpine month={i} color={SPINE_COLORS[i]} logCount={data ? data.logs.length : 0} onClick={() => onSelectMonth(i)} disabled={!data} />
              <span style={{ fontSize: 9, color: data ? "#0ea5e9" : "#52525b", fontFamily: "monospace", letterSpacing: 1 }}>{name.slice(0,3).toUpperCase()}</span>
            </div>
          );
        })}
      </div>
    </div>
    <p style={{ color: "#71717a", fontSize: 12, marginTop: 16 }}>Click a book to open that month's ledger</p>
  </div>
);

// ─── YEAR SHELF ───────────────────────────────────────────────────────────────
const YearShelf = ({ years, onSelectYear }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
    <div style={{ marginBottom: 32, textAlign: "center" }}>
      <h2 style={{ color: "#f4f4f5", fontSize: 28, margin: 0, letterSpacing: 1, fontWeight: "700" }}>Budget Archive</h2>
      <p style={{ color: "#a1a1aa", fontSize: 14, marginTop: 6 }}>Select a year to browse monthly ledgers</p>
    </div>
    <div style={{ background: "#18181b", borderRadius: 16, padding: "48px 64px 28px", boxShadow: "0 24px 50px rgba(0,0,0,0.6)", position: "relative", minWidth: 400, border: "1px solid #27272a" }}>
      <div style={{ position: "absolute", bottom: 54, left: 0, right: 0, height: 10, background: "#09090b", borderTop: "1px solid #27272a" }} />
      <div style={{ display: "flex", gap: 20, alignItems: "flex-end", justifyContent: "center" }}>
        {years.map(({ year, count }) => (
          <div key={year} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <YearBook year={year} logCount={count} onClick={() => onSelectYear(year)} />
            <span style={{ fontSize: 10, color: "#71717a", fontFamily: "monospace" }}>{year}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const BudgetLog = () => {
  const { user } = useAuth();
  const [view, setView] = useState("year-shelf");
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [allLogs, setAllLogs] = useState([]);
  const currentDate = new Date();

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    try {
      const token = await auth.currentUser.getIdToken();
      
      const response = await fetch("http://localhost:5000/api/lifelog/budget", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setAllLogs(data.logs);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  }, [user]);

  useEffect(() => {
    const load = async () => {
      await fetchHistory();
    };
    load();
  }, [fetchHistory]);

  const monthMap = groupLogsByMonth(allLogs);
  
  const yearCounts = allLogs.reduce((acc, log) => { 
    const y = new Date(log.date).getFullYear(); 
    acc[y] = (acc[y] || 0) + 1; 
    return acc; 
  }, {});
  
  if (yearCounts[currentDate.getFullYear()] === undefined) {
    yearCounts[currentDate.getFullYear()] = 0;
  }

  const years = Object.entries(yearCounts)
    .map(([year, count]) => ({ year: parseInt(year), count }))
    .sort((a, b) => b.year - a.year);

  const tabs = [
    { icon: <BarChart2 size={14} />, label: "Year", v: "year-shelf", disabled: false },
    { icon: <Calendar size={14} />, label: "Month", v: "month-shelf", disabled: !selectedYear },
    { icon: <BookOpen size={14} />, label: "Day", v: "diary", disabled: !selectedMonth }
  ];

  const currentViewLogs = selectedYear !== null && selectedMonth !== null
    ? allLogs.filter(log => {
        const d = new Date(log.date);
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      })
    : [];

  return (
    <div style={{ minHeight: "100%", background: "#09090b", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", fontFamily: "Inter, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 900, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.3)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={20} color="#0ea5e9" />
          </div>
          <span style={{ color: "#f4f4f5", fontSize: 20, fontWeight: "700", letterSpacing: 1 }}>Budget Log</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {tabs.map(tab => (
            <NavBtn key={tab.v} onClick={() => !tab.disabled && setView(tab.v)} active={view === tab.v}>{tab.icon} {tab.label}</NavBtn>
          ))}
        </div>
      </div>

      {view === "year-shelf" && <YearShelf years={years} onSelectYear={y => { setSelectedYear(y); setView("month-shelf"); }} />}
      
      {(view === "month-shelf" || view === "diary") && selectedYear && (
        <MonthShelf year={selectedYear} monthMap={monthMap}
          onSelectMonth={(m) => { setSelectedMonth(m); setView("diary"); }}
          onBack={() => setView("year-shelf")} />
      )}
      
      {view === "diary" && (
        <DiaryView 
          logs={currentViewLogs} 
          month={selectedMonth} 
          year={selectedYear}
          onBack={() => setView("month-shelf")} 
          currentDate={currentDate} 
          onSaved={fetchHistory} 
        />
      )}
    </div>
  );
};

export default BudgetLog;