import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  Percent, 
  RefreshCw, 
  Plus 
} from "lucide-react";
import { api } from "@/lib/api"; 
import { auth } from "@/lib/firebase"; 
// If you use direct Firestore calls instead of api.js, uncomment the line below:
// import { getFirestore, collection, getDocs, query } from "firebase/firestore"; 

// --- VTOP Sync Modal Component ---
function VTOPSyncModal({ onSyncComplete }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [sessionId, setSessionId] = useState("");
  const [captchaImg, setCaptchaImg] = useState("");
  const [captchaRequired, setCaptchaRequired] = useState(true);

  const [regNo, setRegNo] = useState("");
  const [password, setPassword] = useState("");
  const [captchaText, setCaptchaText] = useState("");

  const startSync = async () => {
    setLoading(true);
    setStep(0);

    try {
      const freshToken = await auth.currentUser.getIdToken(true);
      const data = await api.initVtopSync(freshToken);

      setSessionId(data.sessionId);
      setCaptchaImg(data.captchaImage);
      setCaptchaRequired(data.captchaRequired);

      setStep(1);
      setOpen(true);   

    } catch (e) {
      console.error(e);
      alert("Failed to connect to VTOP CC. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitSync = async () => {
    setLoading(true);

    try {
      const freshToken = await auth.currentUser.getIdToken(true);
      const data = await api.submitVtopSync(freshToken, {
        sessionId,
        regNo,
        password,
        captcha: captchaText,
      });

      if (data.success) {
        // Pass the new, scraped data to the Schedule component to overwrite the old view
        if (typeof onSyncComplete === 'function') {
          onSyncComplete(data.events);
        }

        setOpen(false);
        setStep(0);
        setCaptchaText("");
        setPassword("");

      } else {
        alert(data.error || "Sync failed");
      }

    } catch (e) {
      console.error(e);
      alert("Sync failed. Please verify credentials.");
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
        className="gap-1.5 bg-[#18181b] border-[#7c3aed]/50 text-[#7c3aed] hover:bg-[#7c3aed]/10 transition-all"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        Sync VTOP
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby={undefined} className="bg-[#18181b] border-zinc-800 text-zinc-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Sync VTOP Timetable
            </DialogTitle>
          </DialogHeader>

          {step === 0 ? (
            <div className="py-8 text-center text-zinc-400 flex flex-col items-center">
              <RefreshCw className="h-8 w-8 animate-spin mb-4 text-[#7c3aed]" />
              <p>Establishing Secure Session...</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-zinc-400">Registration Number</Label>
                <Input
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  className="bg-[#09090b] border-zinc-800 focus-visible:ring-[#7c3aed]"
                  placeholder="Ex: 23BCE0001"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#09090b] border-zinc-800 focus-visible:ring-[#7c3aed]"
                />
              </div>

              {captchaRequired ? (
                <div className="space-y-2">
                  <Label className="text-zinc-400">CAPTCHA</Label>
                  <div className="flex gap-3">
                    <div className="h-10 w-32 shrink-0 rounded border border-zinc-800 overflow-hidden bg-white flex items-center justify-center">
                      <img src={captchaImg} alt="captcha" className="h-full object-contain"/>
                    </div>
                    <Input
                      value={captchaText}
                      onChange={(e) => setCaptchaText(e.target.value)}
                      className="bg-[#09090b] border-zinc-800 uppercase focus-visible:ring-[#7c3aed]"
                      placeholder="Type here"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#7c3aed]/10 border border-[#7c3aed]/20 rounded-md text-center">
                  <p className="text-sm text-[#7c3aed] font-medium">
                    ✨ IP Trusted: No CAPTCHA Required
                  </p>
                </div>
              )}

              <Button
                onClick={submitSync}
                disabled={loading}
                className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] mt-2 shadow-lg shadow-purple-500/20"
              >
                {loading ? "Fetching Timetable..." : "Start Global Sync"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- Main Schedule Component ---
export default function Schedule() {
  const [events, setEvents] = useState([]); 
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('weekly'); 
  const [selectedEvent, setSelectedEvent] = useState(null);

  // 1️⃣ AUTO-LOAD FIX: Fetch data from Firebase when the page loads
  useEffect(() => {
    const fetchSavedSchedule = async (user) => {
      try {
        const token = await user.getIdToken(true);
        
        // 🚨 Note: If you fetch data via your backend, use this:
        const data = await api.getSchedule(token); 
        if (data && data.events) {
          setEvents(data.events);
        } else if (Array.isArray(data)) {
          setEvents(data);
        }

        // 🚨 Note: If you fetch DIRECTLY from Firebase Firestore instead, swap the above lines with this:
        // const db = getFirestore();
        // const q = query(collection(db, "users", user.uid, "schedule"));
        // const snapshot = await getDocs(q);
        // setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
      } catch (error) {
        console.error("Failed to load saved schedule:", error);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchSavedSchedule(user);
    });

    return () => unsubscribe();
  }, []);

  // Catches the new data from VTOPSyncModal and overwrites the calendar
  const handleSyncComplete = (syncedEvents) => {
    console.log("Sync complete! Overwriting old timetable...");
    setEvents(syncedEvents);
  };

  // 2️⃣ TIMEZONE FIX: Helper to get local YYYY-MM-DD correctly in IST
  const getLocalDateString = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // --- HELPERS ---
  const isEventPast = (dateStr, endTimeStr) => {
    const now = new Date();
    const [hours, minutes] = endTimeStr.split(':').map(Number);
    const eventDate = new Date(dateStr);
    eventDate.setHours(hours, minutes, 0, 0);
    return now > eventDate;
  };

  const calculateTotalHours = (dayEvents) => {
    let totalMinutes = 0;
    dayEvents.forEach(e => {
      const [startH, startM] = e.startTime.split(':').map(Number);
      const [endH, endM] = e.endTime.split(':').map(Number);
      totalMinutes += (endH * 60 + endM) - (startH * 60 + startM);
    });
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}h ${mins > 0 ? mins + 'm' : ''}`;
  };

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'daily') newDate.setDate(newDate.getDate() - 1);
    if (viewMode === 'weekly') newDate.setDate(newDate.getDate() - 7);
    if (viewMode === 'monthly') newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'daily') newDate.setDate(newDate.getDate() + 1);
    if (viewMode === 'weekly') newDate.setDate(newDate.getDate() + 7);
    if (viewMode === 'monthly') newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const renderEventCard = (event) => {
    const isPast = isEventPast(event.day, event.endTime) && event.source === 'vtop';

    // 🔥 Pulls straight from database. Fallback for manual events.
    const name = event.courseName || event.subject; 
    const slot = event.slot || "";

    return (
      <div 
        key={event.id}
        onClick={() => setSelectedEvent(event)}
        className={`p-3 rounded-lg border border-zinc-800 cursor-pointer transition-all mb-2 shadow-sm
          ${isPast ? 'opacity-40 line-through grayscale bg-[#18181b]/50' : 'bg-[#18181b] hover:border-[#7c3aed]/50 hover:shadow-[#7c3aed]/10'}
        `}
      >
        <p className={`text-sm font-semibold truncate ${isPast ? 'text-zinc-500' : 'text-zinc-200'}`} title={name}>
          {name}
        </p>
        
        {slot && (
          <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1 font-mono tracking-tight">
            {slot}
          </p>
        )}
        
        <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
          <Clock className="h-3 w-3" /> {event.startTime} - {event.endTime}
        </p>
      </div>
    );
  };

  // --- VIEWS ---
  const renderDailyView = () => {
    const dateStr = getLocalDateString(currentDate); 
    const dayEvents = events
      .filter(e => e.day === dateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    const totalTime = calculateTotalHours(dayEvents);

    return (
      <div className="flex flex-col gap-4 max-w-2xl mx-auto mt-6">
        <div className="flex justify-between items-end border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-3xl font-bold text-white">
              {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
            <p className="text-zinc-400 mt-1">{dayEvents.length} classes scheduled</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Total Class Time</span>
            <p className="text-xl font-bold text-[#7c3aed]">{totalTime || "0h"}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-4">
          {dayEvents.length === 0 ? (
            <p className="text-zinc-500 text-center py-10">No classes today! Take a break. 🌴</p>
          ) : dayEvents.map(renderEventCard)}
        </div>
      </div>
    );
  };

  const renderWeeklyView = () => {
    const currentDay = currentDate.getDay() === 0 ? 7 : currentDate.getDay(); 
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - currentDay + 1);
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });

    return (
      <div className="grid grid-cols-7 gap-4 mt-6 h-full min-h-[500px]">
        {days.map(day => {
          const dateStr = getLocalDateString(day); 
          const dayEvents = events
            .filter(e => e.day === dateStr)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          const isToday = getLocalDateString(new Date()) === dateStr; 

          return (
            <div key={dateStr} className={`flex flex-col border border-zinc-800 rounded-xl overflow-hidden ${isToday ? 'bg-[#7c3aed]/5 border-[#7c3aed]/30' : 'bg-[#09090b]'}`}>
              <div className={`p-3 text-sm font-bold border-b border-zinc-800 ${isToday ? 'text-[#7c3aed]' : 'text-zinc-400'}`}>
                <div className="uppercase text-xs">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className="text-xl text-white">{day.getDate()}</div>
              </div>
              <div className="p-2 flex-1 overflow-y-auto">
                {dayEvents.map(renderEventCard)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthlyView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; 
    const calendarCells = Array.from({ length: 42 }).map((_, i) => {
      const dayNum = i - startOffset + 1;
      if (dayNum > 0 && dayNum <= daysInMonth) {
        const dStr = getLocalDateString(new Date(year, month, dayNum)); 
        const dayEvents = events.filter(e => e.day === dStr);
        return { dayNum, dateStr: dStr, events: dayEvents };
      }
      return null;
    });

    return (
      <div className="mt-6 border border-zinc-800 rounded-xl overflow-hidden bg-[#09090b]">
        <div className="grid grid-cols-7 bg-[#18181b] border-b border-zinc-800 text-xs font-bold text-zinc-400 uppercase text-center p-3">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr">
          {calendarCells.map((cell, i) => (
            <div key={i} className="min-h-[110px] border-b border-r border-zinc-800/50 p-1 flex flex-col hover:bg-zinc-900/50 transition-colors">
              {cell && (
                <>
                  <div className={`text-right text-xs font-bold p-1 ${getLocalDateString(new Date()) === cell.dateStr ? 'text-[#7c3aed]' : 'text-zinc-500'}`}>
                    {cell.dayNum}
                  </div>
                  <div className="flex flex-col gap-1 overflow-y-auto max-h-[85px]">
                    {cell.events.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(e => (
                      <div key={e.id} onClick={() => setSelectedEvent(e)} className="text-[9px] truncate bg-[#18181b] border border-zinc-800 rounded px-1 py-0.5 text-zinc-300 cursor-pointer hover:border-[#7c3aed]">
                        {e.startTime} {e.subject.split('-')[0]}
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
      {/* HEADER */}
      <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Academic Schedule</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {viewMode === 'monthly' 
              ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : viewMode === 'daily'
                ? currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
                : `Semester Week Overview`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Passed handleSyncComplete to Modal */}
          <VTOPSyncModal onSyncComplete={handleSyncComplete} />
          
          <Button className="bg-[#7c3aed] hover:bg-[#6d28d9] gap-1.5 shadow-lg shadow-purple-500/20" size="sm">
            <Plus className="h-4 w-4" /> Plan Session
          </Button>

          <div className="h-8 w-px bg-zinc-800 mx-1" />

          {/* View Toggle */}
          <div className="flex bg-[#18181b] border border-zinc-800 rounded-lg p-1">
            {['daily', 'weekly', 'monthly'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-xs rounded-md capitalize font-semibold transition-all ${
                  viewMode === mode ? 'bg-[#7c3aed] text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1 bg-[#18181b] border border-zinc-800 rounded-lg p-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-zinc-800" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" className="h-7 px-3 text-xs hover:bg-zinc-800 font-bold" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-zinc-800" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {viewMode === 'daily' && renderDailyView()}
        {viewMode === 'weekly' && renderWeeklyView()}
        {viewMode === 'monthly' && renderMonthlyView()}
      </div>

      {/* DETAIL DIALOG */}
      {/* DETAIL DIALOG */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
  <DialogContent aria-describedby={undefined} className="bg-[#09090b] border-zinc-800 text-zinc-100 sm:max-w-md shadow-2xl">
    {selectedEvent && (
      <>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2 pr-4 leading-tight">
            <div className="h-3 w-3 rounded-full bg-[#7c3aed] shrink-0"></div>
            {selectedEvent.courseName || selectedEvent.subject}
          </DialogTitle>
        </DialogHeader>

        {selectedEvent.source === 'vtop' ? (
          <div className="space-y-3 pt-4">
            
            {/* Course Code & Slot Tags */}
            <div className="flex gap-2 mb-2">
              {selectedEvent.courseCode && (
                <span className="px-2 py-1 bg-[#7c3aed]/20 text-[#7c3aed] text-xs font-bold rounded border border-[#7c3aed]/30">
                  {selectedEvent.courseCode}
                </span>
              )}
              {selectedEvent.slot && (
                <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs font-bold rounded border border-zinc-700">
                  {selectedEvent.slot}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-[#18181b] rounded-lg border border-zinc-800/50">
              <div className="flex items-center gap-2 text-zinc-400">
                <Clock className="h-4 w-4" /> <span className="text-sm">Class Timing</span>
              </div>
              <span className="font-mono text-zinc-200 font-medium">{selectedEvent.startTime} - {selectedEvent.endTime}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-[#18181b] rounded-lg border border-zinc-800/50">
              <div className="flex items-center gap-2 text-zinc-400">
                <User className="h-4 w-4" /> <span className="text-sm">Faculty</span>
              </div>
              <span className="text-zinc-200 font-medium text-sm text-right max-w-[150px] truncate" title={selectedEvent.teacher}>
                {selectedEvent.teacher || 'Unknown Faculty'}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-[#18181b] rounded-lg border border-zinc-800/50">
              <div className="flex items-center gap-2 text-zinc-400">
                <Percent className="h-4 w-4" /> <span className="text-sm">Attendance</span>
              </div>
              <div className="text-right">
                <span className={`font-bold text-lg ${
                  parseFloat(selectedEvent.attendance) >= 75 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {selectedEvent.attendance || '0'}%
                </span>
                <p className="text-[10px] text-zinc-500 font-mono">
                  {selectedEvent.attended}/{selectedEvent.total} Classes
                </p>
              </div>
            </div>

            {/* --- BUNK MASTER SECTION --- */}
            {selectedEvent.attended !== undefined && selectedEvent.total !== undefined && (
              <div className={`mt-2 p-4 rounded-xl border flex flex-col gap-1 ${
                parseFloat(selectedEvent.attendance) >= 75 
                ? 'bg-emerald-500/5 border-emerald-500/10' 
                : 'bg-rose-500/5 border-rose-500/10'
              }`}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Bunk Master Analysis
                </span>
                <p className={`text-sm font-medium ${
                  parseFloat(selectedEvent.attendance) >= 75 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {parseFloat(selectedEvent.attendance) >= 75 ? (
                    <>
                      You can safely bunk <span className="text-lg font-bold underline">
                        {Math.floor((selectedEvent.attended / 0.75) - selectedEvent.total)}
                      </span> more classes.
                    </>
                  ) : (
                    <>
                      You must attend <span className="text-lg font-bold underline">
                        {Math.ceil(((0.75 * selectedEvent.total) - selectedEvent.attended) / 0.25)}
                      </span> classes to reach 75%.
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="pt-4 text-zinc-400 text-sm text-center bg-[#18181b] p-6 rounded-xl border border-zinc-800">
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