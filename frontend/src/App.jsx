import { useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuth } from "./hooks/useAuth";
import {
  LayoutDashboard,
  BookOpen,
  Target,
  CalendarDays,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Utensils,
  Wallet,
  Scale,
} from "lucide-react";

import Dashboard from "./pages/Dashboard";
import StudyLog from "./pages/StudyLog";
import Schedule from "./pages/Schedule";
import Goals from "./pages/Goals";
import NotFound from "./pages/NotFound";
import GymLog from "./pages/GymLog";
import FoodLog from "./pages/FoodLog";
import BudgetLog from "./pages/BudgetLog";
import WeightTracker from "./pages/WeightTracker";
import PomodoroTimer from "./components/PomodoroTimer";

// ─── NAV ITEMS ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { path: "/",        label: "Dashboard",      icon: LayoutDashboard },
  { path: "/study",   label: "Study Log",      icon: BookOpen },
  { path: "/schedule",label: "Schedule",       icon: CalendarDays },
  { path: "/goals",   label: "Goals",          icon: Target },
  { path: "/gym",     label: "Gym Log",        icon: Dumbbell },
  { path: "/food",    label: "Food Log",       icon: Utensils },
  { path: "/budget",  label: "Budget Log",     icon: Wallet },
  { path: "/weight",  label: "Weight Tracker", icon: Scale },
];

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ login }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white">
      <div className="bg-[#18181b] p-8 rounded-2xl border border-zinc-800 text-center space-y-6 shadow-2xl w-full max-w-sm mx-4">
        <div className="w-16 h-16 bg-[#7c3aed] rounded-2xl mx-auto flex items-center justify-center shadow-[0_0_24px_rgba(124,58,237,0.4)]">
          <span className="text-2xl font-bold">S</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Smart OS</h1>
          <p className="text-zinc-400 text-sm mt-2">
            Your unified student life dashboard
          </p>
        </div>
        <button
          onClick={login}
          className="w-full bg-[#7c3aed] px-6 py-3 rounded-xl font-semibold hover:bg-[#6d28d9] transition-all shadow-lg shadow-purple-500/20"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { user, loading, login, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-[#7c3aed] rounded-xl animate-pulse" />
          <p className="text-zinc-600 text-sm">Loading Smart OS…</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen login={login} />;

  const currentPage =
    NAV_ITEMS.find((i) => i.path === location.pathname)?.label || "Overview";

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50 flex overflow-hidden font-sans">
      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside
        className={`${
          isCollapsed ? "w-[68px]" : "w-60"
        } bg-[#18181b] border-r border-zinc-800 flex flex-col transition-all duration-300 relative shrink-0`}
      >
        {/* collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-5 z-20 bg-[#18181b] border border-zinc-800 text-zinc-500 hover:text-zinc-100 rounded-full p-1 transition-colors shadow-sm"
        >
          {isCollapsed ? (
            <ChevronRight size={14} />
          ) : (
            <ChevronLeft size={14} />
          )}
        </button>

        {/* logo */}
        <div className="h-14 flex items-center px-4 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white text-sm font-bold shadow-[0_0_12px_rgba(124,58,237,0.4)]">
              S
            </div>
            {!isCollapsed && (
              <span className="font-bold text-zinc-100 tracking-wide whitespace-nowrap">
                Smart OS
              </span>
            )}
          </div>
        </div>

        {/* nav */}
        <nav className="flex-1 py-4 px-2.5 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  isActive
                    ? "bg-[#7c3aed]/12 text-[#7c3aed]"
                    : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-100"
                }`}
              >
                <item.icon
                  className={`h-[18px] w-[18px] shrink-0 ${
                    isActive ? "text-[#7c3aed]" : ""
                  }`}
                />
                {!isCollapsed && (
                  <span
                    className={`text-sm font-medium whitespace-nowrap ${
                      isActive ? "text-[#7c3aed]" : ""
                    }`}
                  >
                    {item.label}
                  </span>
                )}
                {isActive && (
                  <div className="ml-auto w-1 h-1 rounded-full bg-[#7c3aed] shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* user footer */}
        <div className="p-3 border-t border-zinc-800/60 shrink-0">
          <div
            className={`flex items-center ${
              isCollapsed ? "justify-center" : "gap-3"
            } overflow-hidden`}
          >
            <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[#7c3aed] text-xs font-bold">
              {user.email?.charAt(0).toUpperCase() || "U"}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-zinc-200 truncate">
                  {user.displayName || "User"}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">
                  {user.email}
                </div>
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={logout}
                title="Logout"
                className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#09090b]">
        {/* header bar */}
        <header className="h-14 shrink-0 flex items-center px-6 border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="text-sm text-zinc-600 flex items-center gap-2">
            <span className="text-zinc-500 font-medium">Smart OS</span>
            <span className="text-zinc-700">/</span>
            <span className="text-zinc-300 font-semibold">{currentPage}</span>
          </div>
        </header>

        {/* page content */}
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/"        element={<Dashboard />} />
            <Route path="/study"   element={<StudyLog />} />
            <Route path="/schedule"element={<Schedule />} />
            <Route path="/goals"   element={<Goals />} />
            <Route path="/gym"     element={<GymLog />} />
            <Route path="/food"    element={<FoodLog />} />
            <Route path="/budget"  element={<BudgetLog />} />
            <Route path="/weight"  element={<WeightTracker />} />
            <Route path="*"        element={<NotFound />} />
          </Routes>
        </div>
      </main>

      {/* ── GLOBAL FLOATING WIDGETS ─────────────────────────────────────── */}
      <PomodoroTimer />

      {/* ── TOAST NOTIFICATIONS ─────────────────────────────────────────── */}
      <Toaster
        position="bottom-left"
        toastOptions={{
          style: {
            background: "#18181b",
            border: "1px solid #27272a",
            color: "#f4f4f5",
            borderRadius: "12px",
            fontSize: "13px",
          },
        }}
      />
    </div>
  );
}