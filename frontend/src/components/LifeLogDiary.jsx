import React, { useState, useEffect, useRef, useCallback } from "react";
import HTMLFlipBook from "react-pageflip";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Save, ChevronLeft, ChevronRight, Calendar, BookOpen,
  BarChart2, ArrowLeft, Library,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const groupLogsByMonth = (logs) => {
  const map = {};
  const now = new Date();
  const curKey = `${now.getFullYear()}-${now.getMonth()}`;
  map[curKey] = { year: now.getFullYear(), month: now.getMonth(), logs: [] };
  logs.forEach((log) => {
    const d = new Date(log.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!map[key]) map[key] = { year: d.getFullYear(), month: d.getMonth(), logs: [] };
    if (!map[key].logs.find((l) => l.id === log.id)) map[key].logs.push(log);
  });
  return map;
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
const Page = React.forwardRef(({ children, isLeft, accent }, ref) => (
  <div
    ref={ref}
    data-density="soft"
    style={{
      background: isLeft
        ? "linear-gradient(to right, #18181b, #111113)"
        : "linear-gradient(to left, #18181b, #111113)",
      borderRight: isLeft ? "1px solid #27272a" : "none",
      borderLeft: !isLeft ? "1px solid #27272a" : "none",
      boxShadow: isLeft
        ? "inset -6px 0 16px rgba(0,0,0,0.6)"
        : "inset 6px 0 16px rgba(0,0,0,0.6)",
      display: "flex",
      flexDirection: "column",
      padding: "36px 28px",
      height: "100%",
      boxSizing: "border-box",
      overflow: "hidden",
      fontFamily: "'DM Sans', Inter, sans-serif",
      position: "relative",
    }}
  >
    {/* ruled lines */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, ${accent}14 31px, ${accent}14 32px)`,
        backgroundPositionY: "36px",
      }}
    />
    {/* left margin line */}
    <div
      style={{
        position: "absolute",
        left: 52,
        top: 0,
        bottom: 0,
        width: 1,
        background: `${accent}20`,
        pointerEvents: "none",
      }}
    />
    <div
      style={{
        position: "relative",
        zIndex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  </div>
));
Page.displayName = "Page";

// ─── METRIC BOX ───────────────────────────────────────────────────────────────
function MetricBox({ label, value, accent, valueColor }) {
  return (
    <div
      style={{
        background: `${accent}08`,
        borderRadius: 10,
        padding: "10px 8px",
        textAlign: "center",
        border: `1px solid ${accent}22`,
        flex: 1,
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: 1.5,
          color: "#71717a",
          textTransform: "uppercase",
          marginBottom: 4,
          fontWeight: "700",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: "bold",
          color: valueColor || "#f4f4f5",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── BOOK SPINE ───────────────────────────────────────────────────────────────
function BookSpine({ month, color, logCount, onClick, disabled }) {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      style={{
        width: 48,
        height: 200,
        background: disabled
          ? "#18181b"
          : `linear-gradient(160deg, ${color} 0%, ${color}88 50%, #09090b 100%)`,
        borderRadius: "3px 5px 5px 3px",
        cursor: disabled ? "default" : "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        boxShadow: disabled
          ? "none"
          : `3px 0 12px rgba(0,0,0,0.6), inset -2px 0 6px rgba(255,255,255,0.05)`,
        transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s",
        position: "relative",
        userSelect: "none",
        opacity: disabled ? 0.25 : 1,
        border: disabled ? "1px solid #27272a" : `1px solid ${color}30`,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = "translateY(-10px) rotate(-1.5deg)";
          e.currentTarget.style.boxShadow = `0 12px 30px ${color}55, inset -2px 0 6px rgba(255,255,255,0.1)`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = disabled
          ? "none"
          : `3px 0 12px rgba(0,0,0,0.6), inset -2px 0 6px rgba(255,255,255,0.05)`;
      }}
    >
      <span
        style={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          color: "#fff",
          fontWeight: "700",
          fontSize: 11,
          letterSpacing: 2.5,
          textShadow: disabled ? "none" : `0 0 8px ${color}`,
        }}
      >
        {MONTHS[month].toUpperCase()}
      </span>
      {logCount > 0 && (
        <span
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 9,
            fontFamily: "monospace",
          }}
        >
          {logCount}
        </span>
      )}
      {[18, 52, 148, 182].map((top) => (
        <div
          key={top}
          style={{
            position: "absolute",
            top,
            left: 0,
            right: 0,
            height: 1,
            background: "rgba(255,255,255,0.08)",
          }}
        />
      ))}
    </div>
  );
}

// ─── YEAR BOOK ────────────────────────────────────────────────────────────────
function YearBook({ year, logCount, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 64,
        height: 240,
        background: "linear-gradient(160deg, #1c1c1f 0%, #09090b 100%)",
        borderRadius: "4px 7px 7px 4px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        boxShadow: `4px 0 16px rgba(0,0,0,0.8), inset -3px 0 8px ${color}18`,
        transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s",
        border: `1px solid ${color}28`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-12px)";
        e.currentTarget.style.boxShadow = `0 20px 40px ${color}35, inset -3px 0 8px ${color}35`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = `4px 0 16px rgba(0,0,0,0.8), inset -3px 0 8px ${color}18`;
      }}
    >
      <span
        style={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          color,
          fontWeight: "800",
          fontSize: 16,
          letterSpacing: 4,
          textShadow: `0 0 12px ${color}66`,
        }}
      >
        {year}
      </span>
      <span style={{ color: `${color}80`, fontSize: 10, fontFamily: "monospace" }}>
        {logCount} logs
      </span>
    </div>
  );
}

// ─── NAV BTN ──────────────────────────────────────────────────────────────────
function NavBtn({ onClick, children, active, accent }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        background: active ? `${accent}14` : "transparent",
        color: active ? accent : "#71717a",
        border: `1px solid ${active ? `${accent}50` : "#27272a"}`,
        borderRadius: 8,
        padding: "6px 14px",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: "600",
        transition: "all 0.15s",
        letterSpacing: 0.3,
      }}
    >
      {children}
    </button>
  );
}

// ─── DIARY VIEW ───────────────────────────────────────────────────────────────
function DiaryView({ config, logs, month, year, onBack, onSaved }) {
  const { accent, logType, editorTemplate, renderMetrics, renderArchiveMetrics } = config;
  const bookRef = useRef();
  const { token } = useAuth();
  const [currentSpread, setCurrentSpread] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [aiData, setAiData] = useState(null);

  const currentDate = new Date();
  const isCurrentMonth =
    month === currentDate.getMonth() && year === currentDate.getFullYear();
  const totalSpreads = (isCurrentMonth ? 1 : 0) + logs.length;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing your log…" }),
    ],
    content: editorTemplate(currentDate),
    editorProps: { attributes: { class: "diary-editor focus:outline-none" } },
  });

  const handleSave = async () => {
    if (!editor || !token) return;
    setIsSaving(true);
    try {
      const text = editor.getText();
      if (!text.trim()) {
        toast.warning("Write something first!");
        return;
      }
      const data = await api.addLifeLog(
        token,
        logType,
        text,
        new Date().toISOString()
      );
      if (data.success) {
        setAiData(data);
        toast.success("Log saved & analysed ✓");
        onSaved?.();
      }
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const stopProp = {
    onMouseDown: (e) => e.stopPropagation(),
    onMouseUp: (e) => e.stopPropagation(),
    onTouchStart: (e) => e.stopPropagation(),
    onTouchEnd: (e) => e.stopPropagation(),
    onPointerDown: (e) => e.stopPropagation(),
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(9,9,11,0.88)",
        backdropFilter: "blur(16px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        overflowY: "auto",
      }}
    >
      <style>{`
        .diary-editor h1,.diary-editor h2{font-size:15px;font-weight:700;line-height:32px;margin:0;letter-spacing:0.5px;color:#f4f4f5}
        .diary-editor h3{font-size:13px;font-weight:600;line-height:32px;margin:0;color:${accent}}
        .diary-editor p{font-size:13px;line-height:32px;margin:0;color:#d4d4d8}
        .diary-editor ul{margin:0;padding-left:18px;list-style-type:square;color:#d4d4d8}
        .diary-editor li{font-size:13px;line-height:32px;margin:0}
        .diary-editor strong{color:#f4f4f5;font-weight:600}
        .diary-editor .is-editor-empty:first-child::before{color:#52525b;content:attr(data-placeholder);float:left;height:0;pointer-events:none}
        .diary-synthesis h3{font-size:12px;font-weight:700;line-height:32px;margin:0;color:${accent};text-transform:uppercase;letter-spacing:1px}
        .diary-synthesis p{font-size:12px;line-height:32px;margin:0;color:#a1a1aa}
        .diary-synthesis ul{margin:0;padding-left:14px;color:#a1a1aa}
        .diary-synthesis li{font-size:12px;line-height:32px;margin:0}
        .diary-synthesis strong{color:#f4f4f5;font-weight:600}
        .diary-archive{font-size:12px;line-height:32px;white-space:pre-wrap;margin:0;color:#d4d4d8}
      `}</style>

      {/* ── toolbar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          width: "100%",
          maxWidth: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#27272a",
            border: "none",
            borderRadius: 10,
            padding: "8px 16px",
            cursor: "pointer",
            color: "#e4e4e7",
            fontSize: 13,
            fontWeight: "500",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#3f3f46")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#27272a")}
        >
          <ArrowLeft size={15} /> Close
        </button>

        <h2
          style={{
            color: "#f4f4f5",
            fontSize: 20,
            margin: 0,
            fontWeight: "700",
            letterSpacing: 0.5,
          }}
        >
          {MONTHS[month]} {year}
        </h2>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              color: "#52525b",
            }}
          >
            {currentSpread + 1}/{totalSpreads || 1}
          </span>
          <button
            onClick={() => bookRef.current?.pageFlip()?.flipPrev()}
            style={{
              background: "#27272a",
              border: "none",
              borderRadius: 8,
              padding: "7px 11px",
              cursor: "pointer",
              color: "#e4e4e7",
            }}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => bookRef.current?.pageFlip()?.flipNext()}
            style={{
              background: "#27272a",
              border: "none",
              borderRadius: 8,
              padding: "7px 11px",
              cursor: "pointer",
              color: "#e4e4e7",
            }}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* ── book ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "#0d0d0f",
          borderRadius: 16,
          padding: "20px 24px",
          boxShadow: "0 40px 80px rgba(0,0,0,0.95)",
          border: "1px solid #27272a",
        }}
      >
        <HTMLFlipBook
          key={`book-${totalSpreads}-${month}-${year}`}
          ref={bookRef}
          width={460}
          height={620}
          size="fixed"
          maxShadowOpacity={0.7}
          showCover={false}
          mobileScrollSupport={false}
          onFlip={(e) => setCurrentSpread(Math.floor(e.data / 2))}
          style={{ margin: "0 auto" }}
        >
          {[
            ...(isCurrentMonth
              ? [
                  // ── LEFT: editor ──────────────────────────────────────
                  <Page key="today-l" isLeft accent={accent}>
                    <div
                      style={{
                        borderBottom: `2px solid ${accent}`,
                        marginBottom: 10,
                        paddingBottom: 6,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        height: 30,
                        boxSizing: "border-box",
                      }}
                    >
                      <span
                        style={{
                          color: accent,
                          fontSize: 9,
                          letterSpacing: 2.5,
                          textTransform: "uppercase",
                          fontWeight: "700",
                        }}
                      >
                        Today
                      </span>
                      <span
                        style={{
                          fontWeight: "600",
                          color: "#a1a1aa",
                          fontSize: 11,
                        }}
                      >
                        {currentDate.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <div
                      style={{ flex: 1, overflowY: "auto", cursor: "text" }}
                      onClick={() => editor?.chain().focus().run()}
                      {...stopProp}
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
                        marginTop: 10,
                        alignSelf: "flex-end",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: accent,
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "8px 16px",
                        cursor: isSaving ? "default" : "pointer",
                        fontSize: 12,
                        fontWeight: "700",
                        boxShadow: `0 4px 14px ${accent}40`,
                        opacity: isSaving ? 0.6 : 1,
                        transition: "opacity 0.15s",
                        position: "relative",
                        zIndex: 50,
                        letterSpacing: 0.5,
                      }}
                    >
                      <Save size={13} />
                      {isSaving ? "Saving…" : "Ink & Save"}
                    </button>
                  </Page>,

                  // ── RIGHT: AI synthesis ───────────────────────────────
                  <Page key="today-r" accent={accent}>
                    <div
                      style={{
                        borderBottom: "1px solid #27272a",
                        marginBottom: 14,
                        paddingBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          color: "#52525b",
                          fontSize: 9,
                          letterSpacing: 2.5,
                          textTransform: "uppercase",
                          fontWeight: "700",
                        }}
                      >
                        AI Synthesis
                      </span>
                    </div>

                    <div
                      className="diary-synthesis"
                      style={{ flex: 1, overflowY: "auto" }}
                      {...stopProp}
                    >
                      <ReactMarkdown>
                        {aiData?.aiSummary ||
                          `_Save your log to get your ${config.synthesisLabel} synthesis._`}
                      </ReactMarkdown>
                    </div>

                    <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
                      {renderMetrics(aiData?.metrics)}
                    </div>

                    {logs.length > 0 && (
                      <div
                        style={{
                          marginTop: 10,
                          textAlign: "center",
                          fontSize: 9,
                          color: "#3f3f46",
                          letterSpacing: 1,
                        }}
                      >
                        ← TURN PAGE FOR PAST ENTRIES →
                      </div>
                    )}
                  </Page>,
                ]
              : []),

            // ── ARCHIVE PAGES ─────────────────────────────────────────────
            ...logs.flatMap((log) => [
              <Page key={`${log.id}-L`} isLeft accent={accent}>
                <div
                  style={{
                    borderBottom: "1px solid #27272a",
                    marginBottom: 10,
                    paddingBottom: 6,
                    display: "flex",
                    justifyContent: "space-between",
                    height: 30,
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      color: "#52525b",
                      fontSize: 9,
                      letterSpacing: 2.5,
                      textTransform: "uppercase",
                      fontWeight: "700",
                    }}
                  >
                    {config.entryLabel}
                  </span>
                  <span
                    style={{ fontWeight: "600", color: "#71717a", fontSize: 11 }}
                  >
                    {new Date(log.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div
                  className="diary-archive"
                  style={{ flex: 1, overflowY: "auto" }}
                  {...stopProp}
                >
                  {log.textContent}
                </div>
              </Page>,

              <Page key={`${log.id}-R`} accent={accent}>
                <div
                  style={{
                    borderBottom: "1px solid #27272a",
                    marginBottom: 14,
                    paddingBottom: 6,
                  }}
                >
                  <span
                    style={{
                      color: "#52525b",
                      fontSize: 9,
                      letterSpacing: 2.5,
                      textTransform: "uppercase",
                      fontWeight: "700",
                    }}
                  >
                    Archived Synthesis
                  </span>
                </div>

                <div
                  className="diary-synthesis"
                  style={{ flex: 1, overflowY: "auto" }}
                  {...stopProp}
                >
                  <ReactMarkdown>
                    {log.aiSummary || "_No synthesis available._"}
                  </ReactMarkdown>
                </div>

                <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
                  {renderArchiveMetrics(log.metrics)}
                </div>
              </Page>,
            ]),
          ]}
        </HTMLFlipBook>
      </div>
    </div>
  );
}

// ─── MONTH SHELF ──────────────────────────────────────────────────────────────
function MonthShelf({ year, monthMap, accent, spineColors, onSelectMonth, onBack }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#71717a",
            fontSize: 13,
            fontWeight: "500",
          }}
        >
          <ArrowLeft size={15} /> All Years
        </button>
        <h2
          style={{ color: "#f4f4f5", fontSize: 22, margin: 0, fontWeight: "700" }}
        >
          {year}
        </h2>
        <div style={{ width: 80 }} />
      </div>

      <div
        style={{
          background: "#111113",
          borderRadius: 20,
          padding: "36px 44px 16px",
          boxShadow: "0 24px 48px rgba(0,0,0,0.7)",
          width: "100%",
          maxWidth: 900,
          position: "relative",
          border: "1px solid #27272a",
        }}
      >
        {/* shelf plank */}
        <div
          style={{
            position: "absolute",
            bottom: 44,
            left: 0,
            right: 0,
            height: 10,
            background: "#09090b",
            borderTop: `1px solid ${accent}25`,
            borderBottom: "1px solid #1a1a1c",
          }}
        />
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {MONTHS.map((name, i) => {
            const key = `${year}-${i}`;
            const data = monthMap[key];
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <BookSpine
                  month={i}
                  color={spineColors[i]}
                  logCount={data ? data.logs.length : 0}
                  onClick={() => onSelectMonth(i)}
                  disabled={!data}
                />
                <span
                  style={{
                    fontSize: 8,
                    color: data ? accent : "#3f3f46",
                    fontFamily: "monospace",
                    letterSpacing: 1,
                    fontWeight: "700",
                  }}
                >
                  {name.slice(0, 3).toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p style={{ color: "#3f3f46", fontSize: 11, marginTop: 14, letterSpacing: 0.5 }}>
        Click a volume to open it
      </p>
    </div>
  );
}

// ─── YEAR SHELF ───────────────────────────────────────────────────────────────
function YearShelf({ years, accent, archiveTitle, archiveSubtitle, onSelectYear }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <h2
          style={{
            color: "#f4f4f5",
            fontSize: 26,
            margin: 0,
            fontWeight: "800",
            letterSpacing: 0.5,
          }}
        >
          {archiveTitle}
        </h2>
        <p style={{ color: "#52525b", fontSize: 13, marginTop: 6 }}>
          {archiveSubtitle}
        </p>
      </div>

      <div
        style={{
          background: "#111113",
          borderRadius: 20,
          padding: "44px 60px 24px",
          boxShadow: "0 28px 56px rgba(0,0,0,0.8)",
          position: "relative",
          minWidth: 360,
          border: "1px solid #27272a",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: 0,
            right: 0,
            height: 10,
            background: "#09090b",
            borderTop: `1px solid ${accent}20`,
          }}
        />
        <div
          style={{
            display: "flex",
            gap: 20,
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          {years.map(({ year, count }) => (
            <div
              key={year}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <YearBook
                year={year}
                logCount={count}
                color={accent}
                onClick={() => onSelectYear(year)}
              />
              <span
                style={{ fontSize: 9, color: "#52525b", fontFamily: "monospace" }}
              >
                {year}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN LifeLogDiary ────────────────────────────────────────────────────────
export default function LifeLogDiary({ config }) {
  const {
    accent,
    spineColors,
    icon: Icon,
    title,
    logType,
    archiveTitle,
    archiveSubtitle,
  } = config;

 const { token } = useAuth();
  const [view, setView] = useState("year-shelf");
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [allLogs, setAllLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentDate = new Date();

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getLifeLogs(token, logType);
      if (data.success) setAllLogs(data.logs);
    } catch (err) {
      toast.error(`Failed to load ${logType} logs`);
      console.error(`Error loading ${logType}:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [token, logType]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const monthMap = groupLogsByMonth(allLogs);

  const yearCounts = allLogs.reduce((acc, log) => {
    const y = new Date(log.date).getFullYear();
    acc[y] = (acc[y] || 0) + 1;
    return acc;
  }, {});
  if (!yearCounts[currentDate.getFullYear()])
    yearCounts[currentDate.getFullYear()] = 0;

  const years = Object.entries(yearCounts)
    .map(([year, count]) => ({ year: parseInt(year), count }))
    .sort((a, b) => b.year - a.year);

  const currentViewLogs =
    selectedYear != null && selectedMonth != null
      ? allLogs.filter((log) => {
          const d = new Date(log.date);
          return (
            d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
          );
        })
      : [];

  const tabs = [
    { icon: <BarChart2 size={13} />, label: "Archive", v: "year-shelf", disabled: false },
    { icon: <Calendar size={13} />, label: "Month", v: "month-shelf", disabled: !selectedYear },
    { icon: <BookOpen size={13} />, label: "Entry", v: "diary", disabled: selectedMonth == null },
  ];

  return (
    <div
      style={{
        minHeight: "100%",
        background: "#09090b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "36px 20px",
        fontFamily: "'DM Sans', Inter, sans-serif",
      }}
    >
      {/* ── header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 36,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              background: `${accent}12`,
              border: `1px solid ${accent}28`,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={18} color={accent} />
          </div>
          <div>
            <span
              style={{ color: "#f4f4f5", fontSize: 18, fontWeight: "800", letterSpacing: 0.3 }}
            >
              {title}
            </span>
            <p style={{ color: "#52525b", fontSize: 11, margin: 0 }}>
              {isLoading ? "Loading…" : `${allLogs.length} entries`}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {tabs.map((tab) => (
            <NavBtn
              key={tab.v}
              accent={accent}
              active={view === tab.v || (tab.v === "month-shelf" && view === "diary")}
              onClick={() => !tab.disabled && setView(tab.v)}
            >
              {tab.icon} {tab.label}
            </NavBtn>
          ))}
        </div>
      </div>

      {/* ── views ───────────────────────────────────────────────────────── */}
      {view === "year-shelf" && (
        <YearShelf
          years={years}
          accent={accent}
          archiveTitle={archiveTitle}
          archiveSubtitle={archiveSubtitle}
          onSelectYear={(y) => {
            setSelectedYear(y);
            setView("month-shelf");
          }}
        />
      )}

      {(view === "month-shelf" || view === "diary") && selectedYear && (
        <MonthShelf
          year={selectedYear}
          monthMap={monthMap}
          accent={accent}
          spineColors={spineColors}
          onSelectMonth={(m) => {
            setSelectedMonth(m);
            setView("diary");
          }}
          onBack={() => setView("year-shelf")}
        />
      )}

      {view === "diary" && selectedMonth != null && (
        <DiaryView
          config={config}
          logs={currentViewLogs}
          month={selectedMonth}
          year={selectedYear}
          onBack={() => setView("month-shelf")}
          onSaved={fetchHistory}
        />
      )}
    </div>
  );
}