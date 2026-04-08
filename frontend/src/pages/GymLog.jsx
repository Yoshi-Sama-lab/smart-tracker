import { Dumbbell } from "lucide-react";
import LifeLogDiary from "@/components/LifeLogDiary";

const SPINE_COLORS = [
  "#7c3aed","#6d28d9","#5b21b6","#4c1d95","#3b0764","#2e1065",
  "#be185d","#9d174d","#831843","#0f766e","#115e59","#134e4a",
];

const GYM_CONFIG = {
  logType:   "gym",
  accent:    "#7c3aed",
  icon:      Dumbbell,
  title:     "Training Log",
  spineColors: SPINE_COLORS,
  archiveTitle:    "Training Archive",
  archiveSubtitle: "Select a year to browse monthly volumes",
  synthesisLabel:  "Coaching",
  entryLabel:      "Session",

  editorTemplate: (date) =>
    `<h2>Training Log: ${date.toLocaleDateString()}</h2>` +
    `<h3>Workout</h3>` +
    `<ul><li><strong>Exercise (sets × reps @ weight):</strong> </li>` +
    `<li><strong>Drop Sets / Volume:</strong> </li></ul>` +
    `<h3>Activity</h3>` +
    `<ul><li><strong>Daily Steps:</strong> </li></ul>` +
    `<p><em>Fatigue / notes:</em> </p>`,

  renderMetrics: (metrics) =>
    metrics
      ? [
          <MetricBox key="steps"  label="Steps"     value={(metrics.steps || 0).toLocaleString()} accent="#7c3aed" />,
          <MetricBox key="sets"   label="Sets"       value={metrics.setsCompleted || 0}            accent="#7c3aed" />,
          <MetricBox key="drops"  label="Drop Sets"  value={metrics.dropSets || 0}                 accent="#7c3aed" />,
        ]
      : [
          <MetricBox key="steps" label="Steps"    value="—" accent="#7c3aed" />,
          <MetricBox key="sets"  label="Sets"     value="—" accent="#7c3aed" />,
          <MetricBox key="drops" label="Drop Sets" value="—" accent="#7c3aed" />,
        ],

  renderArchiveMetrics: (metrics) =>
    metrics
      ? [
          <MetricBox key="steps" label="Steps"    value={(metrics.steps || 0).toLocaleString()} accent="#7c3aed" />,
          <MetricBox key="sets"  label="Sets"     value={metrics.setsCompleted || "—"}          accent="#7c3aed" />,
          <MetricBox key="drops" label="Drop Sets" value={metrics.dropSets || "—"}              accent="#7c3aed" />,
        ]
      : [],
};

// Inline MetricBox (same shape as LifeLogDiary's, duplicated here for config closure)
function MetricBox({ label, value, accent }) {
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
      <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#71717a", textTransform: "uppercase", marginBottom: 4, fontWeight: "700" }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: "bold", color: "#f4f4f5" }}>{value}</div>
    </div>
  );
}

export default function GymLog() {
  return <LifeLogDiary config={GYM_CONFIG} />;
}