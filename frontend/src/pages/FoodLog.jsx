import { Utensils } from "lucide-react";
import LifeLogDiary from "@/components/LifeLogDiary";

const SPINE_COLORS = [
  "#16a34a","#15803d","#166534","#14532d","#064e3b","#065f46",
  "#047857","#059669","#10b981","#34d399","#6ee7b7","#a7f3d0",
];

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
      <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#71717a", textTransform: "uppercase", marginBottom: 4, fontWeight: "700" }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: "bold", color: valueColor || "#f4f4f5" }}>{value}</div>
    </div>
  );
}

const FOOD_CONFIG = {
  logType:   "food",
  accent:    "#4ade80",
  icon:      Utensils,
  title:     "Nutrition Log",
  spineColors: SPINE_COLORS,
  archiveTitle:    "Nutrition Archive",
  archiveSubtitle: "Select a year to browse monthly meal diaries",
  synthesisLabel:  "Nutritional",
  entryLabel:      "Meal Log",

  editorTemplate: (date) =>
    `<h2>Nutrition Log: ${date.toLocaleDateString()}</h2>` +
    `<h3>Macros</h3>` +
    `<ul><li><strong>Protein:</strong> g</li>` +
    `<li><strong>Estimated Calories:</strong> kcal</li></ul>` +
    `<h3>Meals</h3>` +
    `<ul><li><strong>Breakfast:</strong> </li>` +
    `<li><strong>Lunch:</strong> </li>` +
    `<li><strong>Dinner:</strong> </li>` +
    `<li><strong>Snacks:</strong> </li></ul>`,

  renderMetrics: (metrics) => [
    <MetricBox key="protein"  label="Protein"  value={metrics ? `${metrics.proteinGrams || 0}g`     : "—"} accent="#4ade80" />,
    <MetricBox key="calories" label="Calories" value={metrics ? `${metrics.calories || 0} kcal`     : "—"} accent="#4ade80" />,
  ],

  renderArchiveMetrics: (metrics) => [
    <MetricBox key="protein"  label="Protein"  value={metrics ? `${metrics.proteinGrams || 0}g`  : "—"} accent="#4ade80" />,
    <MetricBox key="calories" label="Calories" value={metrics ? `${metrics.calories || 0} kcal`  : "—"} accent="#4ade80" />,
  ],
};

export default function FoodLog() {
  return <LifeLogDiary config={FOOD_CONFIG} />;
}