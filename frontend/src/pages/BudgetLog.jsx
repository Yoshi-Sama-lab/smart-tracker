import { Wallet } from "lucide-react";
import LifeLogDiary from "@/components/LifeLogDiary";

const SPINE_COLORS = [
  "#0ea5e9","#0284c7","#0369a1","#075985","#0c4a6e","#082f49",
  "#2563eb","#1d4ed8","#1e40af","#1e3a8a","#172554","#0284c7",
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

const BUDGET_CONFIG = {
  logType:   "budget",
  accent:    "#0ea5e9",
  icon:      Wallet,
  title:     "Budget Log",
  spineColors: SPINE_COLORS,
  archiveTitle:    "Budget Archive",
  archiveSubtitle: "Select a year to browse monthly ledgers",
  synthesisLabel:  "Financial",
  entryLabel:      "Ledger Entry",

  editorTemplate: (date) =>
    `<h2>Expense Log: ${date.toLocaleDateString()}</h2>` +
    `<h3>Transactions</h3>` +
    `<ul><li><strong>Food / Groceries:</strong> ₹</li>` +
    `<li><strong>Transport:</strong> ₹</li>` +
    `<li><strong>Other:</strong> ₹</li></ul>` +
    `<h3>Notes</h3>` +
    `<p><em>Justification / observations:</em> </p>`,

  renderMetrics: (metrics) => [
    <MetricBox
      key="spent"
      label="Spent Today"
      value={metrics ? `₹${metrics.foodSpendToday || 0}` : "—"}
      accent="#0ea5e9"
      valueColor="#f87171"
    />,
    <MetricBox
      key="remaining"
      label="Remaining"
      value={metrics ? `₹${(metrics.remainingBudget ?? 5000).toLocaleString()}` : "—"}
      accent="#0ea5e9"
      valueColor="#34d399"
    />,
  ],

  renderArchiveMetrics: (metrics) => [
    <MetricBox
      key="spent"
      label="Spent"
      value={metrics ? `₹${metrics.foodSpendToday || 0}` : "—"}
      accent="#0ea5e9"
      valueColor="#f87171"
    />,
    <MetricBox
      key="remaining"
      label="Remaining"
      value={metrics ? `₹${(metrics.remainingBudget ?? 5000).toLocaleString()}` : "—"}
      accent="#0ea5e9"
      valueColor="#34d399"
    />,
  ],
};

export default function BudgetLog() {
  return <LifeLogDiary config={BUDGET_CONFIG} />;
}