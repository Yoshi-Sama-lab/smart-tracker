require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const crypto = require('crypto');
const { GoogleGenerativeAI } = require("@google/generative-ai");
// Store active scraping sessions
const activeSessions = new Map();

// 1. Initialize Firebase Admin
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("Student OS Backend is running 🚀"));

// ================================
// 2. AUTH MIDDLEWARE
// ================================
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Invalid Auth" });
  
  const idToken = authHeader.split("Bearer ")[1];
  if (!idToken || idToken === "undefined") return res.status(401).json({ error: "Invalid Token" });

  try {
    req.user = await admin.auth().verifyIdToken(idToken);
    next();
  } catch (error) {
    return res.status(401).json({ error: "Expired token" });
  }
};

// ================================
// 3. STUDY LOGS & GOALS & SCHEDULE (CRUD)
// ================================
app.post("/api/study", verifyToken, async (req, res) => {
  const { subject, durationMinutes, note, date } = req.body;
  const docRef = await db.collection("study_logs").add({
    uid: req.user.uid, subject, durationMinutes, note: note || "",
    date: date || new Date().toISOString(), createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  res.json({ success: true, id: docRef.id });
});

app.get("/api/study", verifyToken, async (req, res) => {
  const snapshot = await db.collection("study_logs").where("uid", "==", req.user.uid).orderBy("createdAt", "desc").get();
  res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});

app.delete("/api/study/:id", verifyToken, async (req, res) => {
  await db.collection("study_logs").doc(req.params.id).delete();
  res.json({ success: true });
});

app.get("/api/goals", verifyToken, async (req, res) => {
  const doc = await db.collection("goals").doc(req.user.uid).get();
  res.json(doc.exists ? doc.data() : { dailyMinutes: 120 }); 
});

app.post("/api/goals", verifyToken, async (req, res) => {
  await db.collection("goals").doc(req.user.uid).set({ dailyMinutes: req.body.dailyMinutes, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  res.json({ success: true });
});

app.post("/api/schedule", verifyToken, async (req, res) => {
  const { subject, day, startTime, endTime } = req.body;
  const docRef = await db.collection("schedule").add({
    uid: req.user.uid, subject, day, startTime, endTime, source: "manual", completed: false, createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  res.json({ id: docRef.id });
});

app.get("/api/schedule", verifyToken, async (req, res) => {
  const snapshot = await db.collection("schedule").where("uid", "==", req.user.uid).orderBy("day", "asc").get();
  res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});

app.patch("/api/schedule/:id", verifyToken, async (req, res) => {
  await db.collection("schedule").doc(req.params.id).update({ completed: !!req.body.completed, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  res.json({ success: true });
});
// ================================
// 3.5 LIFE LOGS & AI PARSING
// ================================
app.post("/api/lifelog", verifyToken, async (req, res) => {
  const { textContent, date, logType } = req.body;

  if (!textContent) return res.status(400).json({ error: "No text content provided" });

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    let prompt = "";

    // 🏋️‍♂️ GYM PROMPT
    if (logType === "gym") {
      prompt = `
      You are a serious strength and nutrition coach analyzing a client's daily training log.
      Tone: clear, practical, analytical, and encouraging but not hype. No generic motivation.
      Use emojis only in section headers. Use short paragraphs and blank lines for readability.

      Analyze the following journal entry: "${textContent}"

      You MUST respond using this exact JSON schema:
      {
        "aiSummary": "A detailed markdown coaching report structured exactly into:\\n\\n### 🏋️‍♂️ Workout Review\\n(Use a bulleted list. Bold the exercise name. Comment on strength, volume, and give progression advice.)\\n\\n### 🧠 Big Picture Takeaways\\n(Actionable bullets on what they did right, and what to aim for next.)",
        "metrics": {
          "steps": 0, // Extract total steps logged. Default to 0.
          "setsCompleted": 0, // Estimate total working sets based on the text. Default to 0.
          "dropSets": 0 // Extract number of drop sets. Default to 0.
        }
      }`;
    } 
    // 🍳 FOOD PROMPT
    else if (logType === "food") {
      prompt = `
      You are a highly analytical, strict sports nutritionist reviewing a client's daily food log.
      Tone: clinical, practical, and direct. No fluff. Focus on macro composition and fuel quality.
      Use emojis only in section headers. Use short paragraphs and bullet points.

      Analyze the following journal entry: "${textContent}"

      You MUST respond using this exact JSON schema:
      {
        "aiSummary": "A detailed markdown nutrition report structured exactly into:\\n\\n### 🍳 Macros & Fuel\\n(Breakdown of the protein, carbs, and fats consumed. Comment on the quality of the food choices.)\\n\\n### 🧠 Nutritional Takeaways\\n(Actionable bullets on nutrient timing, hydration, what was good, and what to improve tomorrow.)",
        "metrics": {
          "proteinGrams": 0, // Estimate total protein in grams based on the foods listed. Default 0.
          "calories": 0 // Estimate total calories based on the foods listed. Default 0.
        }
      }`;
    } 
    // 💸 BUDGET PROMPT (Setting this up for your next module!)
    else if (logType === "budget") {
      prompt = `
      You are a strict financial advisor reviewing a client's daily expense log.
      Assume a 5000 monthly budget. Tone: practical, analytical, and direct. Use emojis only in section headers.

      Analyze the following journal entry: "${textContent}"

      You MUST respond using this exact JSON schema:
      {
        "aiSummary": "A detailed markdown financial report structured exactly into:\\n\\n### 💸 Expense Breakdown\\n(Analysis of what was spent today and if it was necessary.)\\n\\n### 🧠 Financial Takeaways\\n(Actionable bullets on saving habits and budget pacing.)",
        "metrics": {
          "foodSpendToday": 0, // Total money spent on food/groceries today. Default 0.
          "remainingBudget": 5000 // Estimate remaining budget. Default 5000.
        }
      }`;
    }

    const result = await model.generateContent(prompt);
    const parsedMetrics = JSON.parse(result.response.text());

    // Save to Firestore with the specific logType
    const docRef = await db.collection(`${logType}_logs`).add({
      uid: req.user.uid,
      textContent,
      aiSummary: parsedMetrics.aiSummary,
      metrics: parsedMetrics.metrics,
      date: date || new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, ...parsedMetrics });

  } catch (error) {
    console.error(`❌ ${logType} Save Error:`, error);
    res.status(500).json({ error: "Failed to process log" });
  }
});
app.get("/api/lifelog/:logType", verifyToken, async (req, res) => {
  const { logType } = req.params;
  try {
    const snapshot = await db.collection(`${logType}_logs`)
      .where("uid", "==", req.user.uid)
      .orderBy("date", "desc")
      .get();

    let logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 🔥 FIX: Cumulative Budget Logic
    if (logType === "budget") {
      const BASE_BUDGET = 5000;
      // Sort logs chronologically to calculate the running total
      const sortedChronologically = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      let runningTotalSpent = 0;
      const logsWithRunningBudget = sortedChronologically.map(log => {
        const spentToday = log.metrics?.foodSpendToday || 0;
        runningTotalSpent += spentToday;
        return {
          ...log,
          metrics: {
            ...log.metrics,
            remainingBudget: BASE_BUDGET - runningTotalSpent
          }
        };
      });
      // Reverse back to newest-first for the UI
      logs = logsWithRunningBudget.reverse();
    }

    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});
// ================================
// 3.6 WEIGHT TRACKER
// ================================
app.post("/api/weight", verifyToken, async (req, res) => {
  const { weight, date } = req.body;
  
  if (!weight) return res.status(400).json({ error: "Weight is required" });

  try {
    const docRef = await db.collection("weight_logs").add({
      uid: req.user.uid,
      weight: parseFloat(weight),
      date: date || new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    res.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error("❌ Weight Save Error:", error);
    res.status(500).json({ error: "Failed to save weight" });
  }
});

app.get("/api/weight", verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection("weight_logs")
      .where("uid", "==", req.user.uid)
      .orderBy("date", "desc") // Newest first
      .limit(30)
      .get();

    const logs = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));

    res.json({ success: true, logs });
  } catch (error) {
    console.error("❌ Fetch Weight Logs Error:", error);
    res.status(500).json({ error: "Failed to fetch weight logs" });
  }
});
// ================================
// 4. VTOP INIT (Landing Page)
// ================================
// ================================
// 6. VTOP SCRAPING INIT (Landing Page - FORCED CAPTCHA)
// ================================
app.get('/api/vtop/init', async (req, res) => {
  console.log("--> Starting VTOP CC Init Sequence...");
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false, 
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'] 
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    let lastAlert = ""; 
    page.on('dialog', async dialog => {
      lastAlert = dialog.message();
      console.log("VTOP Alert:", lastAlert);
      await dialog.accept();
    });

    let captchaSrc = null;
    let attempts = 0;
    const maxAttempts = 5;

    // 🔥 FIX: Loop until a CAPTCHA is forced onto the screen
    while (!captchaSrc && attempts < maxAttempts) {
      attempts++;
      console.log(`\n--- [Attempt ${attempts}/${maxAttempts}] Loading VTOP ---`);
      
      console.log("1. Navigating to VTOP CC...");
      await page.goto('https://vtopcc.vit.ac.in/', { waitUntil: 'networkidle2', timeout: 30000 });
      
      console.log("2. Clicking 'Student'...");
      await page.waitForSelector('#stdForm', { timeout: 10000 });
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.evaluate(() => document.getElementById('stdForm').submit())
      ]);

      console.log("3. Checking CAPTCHA...");
      captchaSrc = await page.evaluate(() => {
        let img = document.querySelector('#captchaBlock img');
        return (img && img.src && img.src.includes('data:image')) ? img.src : null;
      });

      if (captchaSrc) {
        console.log("✅ CAPTCHA found and captured.");
        break; // Exit the loop, we got what we need!
      } else {
        console.log("⚠️ IP Trusted (No CAPTCHA). Reloading to force CAPTCHA generation...");
        await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds before hammering the server again
      }
    }

    if (!captchaSrc) {
      throw new Error("Failed to force CAPTCHA generation after 5 attempts. VTOP might be experiencing issues.");
    }

    const sessionId = crypto.randomUUID();
    activeSessions.set(sessionId, { browser, page, getAlert: () => lastAlert });
    
    setTimeout(() => {
      if (activeSessions.has(sessionId)) {
        console.log(`Cleaning up abandoned session: ${sessionId}`);
        activeSessions.get(sessionId).browser.close();
        activeSessions.delete(sessionId);
      }
    }, 5 * 60 * 1000);

    // Since we forced it, captchaRequired is always true now
    res.json({ sessionId, captchaImage: captchaSrc, captchaRequired: true });
  } catch (error) {
    console.error("❌ VTOP Init Error:", error.message);
    if (browser) await browser.close();
    res.status(500).json({ error: "Failed to initialize VTOP CC session" });
  }
});
// ================================
// 5. VTOP SYNC (Attendance + Timetable)
// ================================
app.post('/api/vtop/sync', verifyToken, async (req, res) => {
  if (!req.user || !req.user.uid) return res.status(401).json({ error: "Unauthorized" });
  
  const uid = req.user.uid; 
  const { sessionId, regNo, password, captcha } = req.body;
  if (!activeSessions.has(sessionId)) return res.status(400).json({ error: "Session expired. Try again." });

  const { browser, page, getAlert } = activeSessions.get(sessionId);

  try {
    console.log("4. Injecting Credentials...");
    await page.waitForSelector('#username', { visible: true, timeout: 15000 }); 
    await page.type('#username', regNo);        
    await page.type('#password', password);      
    if (await page.$('#captchaStr') && captcha) await page.type('#captchaStr', captcha);   
    
    console.log("5. Submitting Login...");
    await Promise.all([
      page.click('#submitBtn'),                  
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => null)
    ]);

    const isDashboard = await page.waitForSelector('.SideBarMenuBtn', { timeout: 15000 }).catch(() => null);
    if (!isDashboard) throw new Error(getAlert() ? `VTOP Error: ${getAlert()}` : "Login failed. Check Credentials or CAPTCHA.");

    // --- STEP 1: DETAILED ATTENDANCE SCRAPE ---
    console.log("6. Navigating to Attendance...");
    await page.evaluate(() => document.querySelector('.SideBarMenuBtn')?.click());
    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() => document.querySelector('a[data-url="academics/common/StudentAttendance"]')?.click());
    
    await page.waitForSelector('#semesterSubId', { visible: true, timeout: 15000 });
    
    console.log("6.1. Selecting Semester & Fetching...");
    
    // 1. Find the correct internal value (e.g., 'CH20252605')
    const targetAttValue = await page.evaluate(() => {
      const sel = document.getElementById('semesterSubId');
      if (!sel) return null;
      const targetOpt = Array.from(sel.options).find(opt => 
        opt.value !== "" && 
        !opt.innerText.includes('Industry') && 
        !opt.innerText.includes('LLM') && 
        !opt.innerText.includes('LAW')
      );
      return targetOpt ? targetOpt.value : (sel.options.length > 1 ? sel.options[1].value : null);
    });

    // 2. NATIVELY select the option like a human
    if (targetAttValue) {
      await page.select('#semesterSubId', targetAttValue);
    }
    
    await new Promise(r => setTimeout(r, 1500)); 
    
    // Click the specific "View" button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const viewBtn = btns.find(b => b.innerText.trim() === 'View' || b.innerText.includes('View'));
      if (viewBtn) viewBtn.click();
      else document.querySelector('button[type="submit"]')?.click();
    });

    console.log("6.2. Reading Bunk Manager Stats...");
    try {
      await page.waitForSelector('table.table tbody tr:nth-child(2)', { visible: true, timeout: 20000 });
    } catch (err) {
      console.log("❌ CRITICAL: Attendance table didn't load! Taking screenshot...");
      await page.screenshot({ path: 'attendance-failed.png', fullPage: true });
      throw new Error("Attendance table missing. Check attendance-failed.png in backend folder.");
    }
    
    const bunkData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table.table tbody tr'));
      const map = {};
      const tMap = { "Embedded Theory": "ETH", "Embedded Lab": "ELA", "Theory Only": "TH", "Lab Only": "LO", "Soft Skill": "SS" };
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        // Match the layout from your screenshot exactly
        if (cells.length >= 12) {
          const code = cells[1]?.innerText.trim().replace(/[^A-Z0-9]/gi, '');
          const name = cells[2]?.innerText.trim();
          const rawType = cells[3]?.innerText.trim() || "";
          
          let shortType = "TH";
          for (const [k, v] of Object.entries(tMap)) if (rawType.includes(k)) shortType = v;

          map[`${code}-${shortType}`] = {
            name: name,
            attended: parseInt(cells[9]?.innerText.trim()) || 0,
            total: parseInt(cells[10]?.innerText.trim()) || 0,
            percent: cells[11]?.innerText.trim() || "0"
          };
        }
      });
      return map;
    });

    // --- STEP 2: TIMETABLE SCRAPE ---
    console.log("7. Navigating to Time Table...");
    await page.evaluate(() => document.querySelector('.SideBarMenuBtn')?.click());
    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() => document.querySelector('a[data-url="academics/common/StudentTimeTableChn"]')?.click());

    console.log("7.1. Waiting for VTOP background scripts to settle...");
    await new Promise(r => setTimeout(r, 4000)); // Hard wait to let VTOP finish its own loading

    await page.waitForFunction(() => {
      const sel = document.getElementById('semesterSubId');
      return sel && sel.options && sel.options.length > 1;
    }, { timeout: 15000 });
    
    // 🔥 FIX: Extract BOTH the value (for clicking) AND the text (for the calendar dates)
    const { targetTtValue, semesterName } = await page.evaluate(() => {
      const sel = document.getElementById('semesterSubId');
      const targetOpt = Array.from(sel.options).find(opt => 
        opt.value !== "" && 
        !opt.innerText.includes('Industry') && 
        !opt.innerText.includes('LLM') && 
        !opt.innerText.includes('LAW')
      );
      return {
        targetTtValue: targetOpt ? targetOpt.value : sel.options[1].value,
        semesterName: targetOpt ? targetOpt.innerText : sel.options[1].innerText
      };
    });

    console.log(`7.2. Target Semester ID identified: ${targetTtValue} (${semesterName})`);

    console.log("7.3. Force-Triggering Dropdown (Defeating DOM Resets)...");
    let gridLoaded = false;
    
    // 🔥 THE FIX: A retry loop. If VTOP resets the dropdown, we hit it again!
    for (let i = 1; i <= 3; i++) {
        await page.evaluate((val) => {
            const sel = document.getElementById('semesterSubId');
            if (sel) {
                sel.value = val;
                // VTOP uses inline onchange, this is the most aggressive way to trigger it natively
                if (typeof sel.onchange === 'function') {
                    sel.onchange();
                } else if (typeof processViewTimeTable === 'function') {
                    processViewTimeTable();
                } else {
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }, targetTtValue);

        // Wait 4 seconds for the VTOP server to send the timetable grid back
        await new Promise(r => setTimeout(r, 4000));

        const tableExists = await page.$('#timeTableStyle');
        if (tableExists) {
            gridLoaded = true;
            console.log("✅ Timetable grid loaded successfully!");
            break;
        } else {
            console.log(`⚠️ Grid missing. VTOP reset the dropdown. Retrying punch (${i}/3)...`);
        }
    }

    if (!gridLoaded) {
      console.log("❌ CRITICAL: Timetable grid failed to load after 3 attempts.");
      await page.screenshot({ path: 'timetable-failed.png', fullPage: true });
      throw new Error("Timetable grid missing. Check timetable-failed.png in backend folder.");
    }

    console.log("8. Scraping Teachers...");
    const teacherData = await page.evaluate(() => {
      const rows = document.querySelectorAll('table.table tbody tr');
      const map = {};
      const tMap = { "Embedded Theory": "ETH", "Embedded Lab": "ELA", "Theory Only": "TH", "Lab Only": "LO", "Soft Skill": "SS" };
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 10) {
          const raw = cells[2].innerText.trim();
          const code = raw.split('-')[0].trim();
          let type = "TH"; 
          for (const [k, v] of Object.entries(tMap)) if (raw.includes(k)) type = v;
          map[`${code}-${type}`] = cells[8].innerText.trim().split('-')[0].trim();
        }
      });
      return map;
    });

    console.log("9. Extracting Time Slots...");
    const rawSchedule = await page.evaluate(() => {
      const events = [];
      const table = document.getElementById('timeTableStyle');
      if (!table) return []; 
      const rows = table.querySelectorAll('tbody tr');
      if (rows.length < 4) return [];

      const getT = (sR, eR) => {
        const s = Array.from(sR.querySelectorAll('td')).map(t => t.innerText.trim());
        const e = Array.from(eR.querySelectorAll('td')).map(t => t.innerText.trim());
        const m = {};
        for(let i = 2; i < s.length; i++) if(s[i] !== 'Lunch' && s[i] !== '') m[i] = { start: s[i], end: e[i-1] };
        return m;
      };
      
      const tT = getT(rows[0], rows[1]);
      const lT = getT(rows[2], rows[3]);
      const dM = { 'MON':0, 'TUE':1, 'WED':2, 'THU':3, 'FRI':4, 'SAT':5, 'SUN':6 };
      let curD = 0;

      for(let r = 4; r < rows.length; r++) {
        const cells = Array.from(rows[r].querySelectorAll('td'));
        if(cells.length === 0) continue;
        
        let isT = false, off = 0;
        if (cells[0].rowSpan > 1) { curD = dM[cells[0].innerText.trim()]; isT = true; off = 0; } 
        else { isT = false; off = 1; }
        
        const times = isT ? tT : lT;
        for(let c = 0; c < cells.length; c++) {
          if(cells[c].getAttribute('bgcolor') === '#CCFF33') {
            const p = cells[c].innerText.trim().split('-');
            if(p.length >= 5 && times[c + off]) {
              events.push({ code: p[1], slot: `${p[0]} (${p[3]}-${p[4]})`, type: p[2], dayOff: curD, start: times[c+off].start, end: times[c+off].end });
            }
          }
        }
      }
      return events;
    });

    await browser.close();
    activeSessions.delete(sessionId);

    // --- STEP 3: ASSEMBLE ALL DATA ---
    console.log("10. Assembling Semester Calendar...");
    const yearMatch = semesterName.match(/\d{4}/);
    const baseYear = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
    let startDate = new Date(Date.UTC(baseYear, 11, 1)); 
    let endDate = new Date(Date.UTC(baseYear + 1, 3, 30)); 

    const mappedEvents = [];
    const jsDayMap = [1, 2, 3, 4, 5, 6, 0]; 

    rawSchedule.forEach(c => {
      const key = `${c.code}-${c.type}`;
      const bunk = bunkData[key] || {};
      const teacher = teacherData[key] || "Unknown Faculty";
      
      const finalName = bunk.name || c.code; // Extracted directly from Attendance!
      
      let cur = new Date(startDate);
      while (cur.getUTCDay() !== jsDayMap[c.dayOff]) cur.setUTCDate(cur.getUTCDate() + 1);
      
      while (cur <= endDate) {
        mappedEvents.push({
          subject: finalName,
          courseCode: c.code,          
          courseName: finalName, 
          slot: c.slot,                
          teacher: teacher, 
          attendance: bunk.percent || "0",
          attended: bunk.attended || 0,
          total: bunk.total || 0,
          day: cur.toISOString().split('T')[0], 
          startTime: c.start, 
          endTime: c.end
        });
        cur.setUTCDate(cur.getUTCDate() + 7);
      }
    });

    // --- STEP 4: FIREBASE BATCHING ---
    const chunk = (a, s) => Array.from({ length: Math.ceil(a.length / s) }, (v, i) => a.slice(i * s, i * s + s));
    
    console.log(`11. Cleaning old VTOP entries...`);
    const old = await db.collection("schedule").where("uid", "==", uid).where("source", "==", "vtop").get();
    for (const c of chunk(old.docs, 400)) {
      const b = db.batch();
      c.forEach(d => b.delete(d.ref));
      await b.commit();
    }

    console.log(`12. Saving ${mappedEvents.length} scheduled classes...`);
    const saved = [];
    for (const c of chunk(mappedEvents, 400)) {
      const b = db.batch();
      c.forEach(e => {
        const ref = db.collection("schedule").doc();
        const data = { ...e, uid, completed: false, source: "vtop", createdAt: admin.firestore.FieldValue.serverTimestamp() };
        b.set(ref, data);
        saved.push({ id: ref.id, ...data });
      });
      await b.commit();
    }

    console.log("✅ Sync Successfully Finished!");
    res.json({ success: true, events: saved });

  } catch (error) {
    console.error("❌ VTOP Sync Error:", error.message);
    if (activeSessions.has(sessionId)) {
      const s = activeSessions.get(sessionId);
      if (s.browser) await s.browser.close();
      activeSessions.delete(sessionId);
    }
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));