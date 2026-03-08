import { useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { 
  LayoutDashboard, 
  BookOpen, 
  Target, 
  CalendarDays, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Dumbbell,    // Correct icon for Gym
  Utensils,    // Correct icon for Food
  Wallet,      // Correct icon for Budget
  Scale        // Correct icon for Weight
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

export default function App() {
  const { user, loading, login, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400">
        Loading Smart OS...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white">
        <div className="bg-[#18181b] p-8 rounded-xl border border-zinc-800 text-center space-y-6 shadow-2xl max-sm w-full mx-4">
          <div className="w-16 h-16 bg-[#7c3aed] rounded-2xl mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)]">
             <span className="text-2xl font-bold">S</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Smart OS</h1>
            <p className="text-zinc-400 text-sm mt-2">Log in to sync your study data</p>
          </div>
          <button
            onClick={login}
            className="w-full bg-[#7c3aed] px-6 py-3 rounded-lg font-medium hover:bg-[#6d28d9] transition-all shadow-lg shadow-purple-500/20"
          >
            Login with Google
          </button>
        </div>
      </div>
    );
  }

  // Updated navItems with correct icons
  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/study", label: "Study Log", icon: BookOpen },
    { path: "/schedule", label: "Schedule", icon: CalendarDays },
    { path: "/goals", label: "Goals", icon: Target },
    { path: "/gym", label: "Gym Log", icon: Dumbbell },
    { path: "/food", label: "Food Log", icon: Utensils },
    { path: "/budget", label: "Budget Log", icon: Wallet },
    { path: "/weight", label: "Weight Tracker", icon: Scale }
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50 flex overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside 
        className={`${
          isCollapsed ? "w-20" : "w-64"
        } bg-[#18181b] border-r border-zinc-800 flex flex-col transition-all duration-300 relative shrink-0`}
      >
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 bg-[#18181b] border border-zinc-800 text-zinc-400 hover:text-white rounded-full p-1 z-20 transition-colors shadow-sm"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className="h-16 flex items-center px-6 border-b border-zinc-800/50 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white text-sm font-bold shadow-[0_0_12px_rgba(124,58,237,0.4)]">
              S
            </div>
            {!isCollapsed && (
              <span className="font-bold text-zinc-100 tracking-wide whitespace-nowrap transition-opacity duration-300">
                Smart OS
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path}
                to={item.path} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? "bg-[#7c3aed]/10 text-[#7c3aed]" 
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && (
                  <span className={`font-medium whitespace-nowrap ${isActive ? 'text-[#7c3aed]' : ''}`}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800/50 shrink-0">
          <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-4' : 'gap-3'} overflow-hidden`}>
            <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-800 flex items-center justify-center text-[#7c3aed] text-xs font-bold border border-zinc-700">
               {user.email?.charAt(0).toUpperCase() || "U"}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-zinc-200 truncate">{user.displayName || "User"}</div>
                <div className="text-[10px] text-zinc-500 truncate">{user.email}</div>
              </div>
            )}
            <button
              onClick={logout}
              title="Logout"
              className="text-zinc-500 hover:text-red-400 transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#09090b]">
        <header className="h-16 shrink-0 flex items-center px-8 border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="text-sm font-medium text-zinc-500 flex items-center gap-2">
            Smart OS 
            <span className="text-zinc-700">/</span> 
            <span className="text-zinc-300">
              {navItems.find(i => i.path === location.pathname)?.label || "Overview"}
            </span>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/study" element={<StudyLog />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/gym" element={<GymLog />} />
            <Route path="/food" element={<FoodLog />} />
            <Route path="/budget" element={<BudgetLog />} />
            <Route path="/weight" element={<WeightTracker />} />
            {/* Wildcard MUST be last */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}