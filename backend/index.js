require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const crypto = require('crypto');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const rateLimit = require("express-rate-limit");
const helmet   = require("helmet");
const morgan   = require("morgan");

// ── Active scraping sessions ──────────────────────────────────────────────────
const activeSessions = new Map();

// ── 1. Initialize Firebase Admin ──────────────────────────────────────────────
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ── 2. Express setup ──────────────────────────────────────────────────────────
const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

// ── 3. Rate limiters ──────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — slow down." },
});
app.use(globalLimiter);

const vtopLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: { error: "VTOP sync limited to 3 attempts per 5 minutes." },
});
app.use("/api/vtop", vtopLimiter);

app.get("/", (req, res) => res.send("Student OS Backend is running 🚀"));

// ================================
// 4. AUTH MIDDLEWARE
// ================================
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ error: "Invalid Auth" });

  const idToken = authHeader.split("Bearer ")[1];
  if (!idToken || idToken === "undefined")
    return res.status(401).json({ error: "Invalid Token" });

  try {
    req.user = await admin.auth().verifyIdToken(idToken);
    next();
  } catch {
    return res.status(401).json({ error: "Expired token" });
  }
};

// ================================
// 5. STUDY LOGS
// ================================
app.post("/api/study", verifyToken, async (req, res) => {
  const { subject, durationMinutes, note, date } = req.body;
  if (!subject || !durationMinutes)
    return res.status(400).json({ error: "subject and durationMinutes are required" });

  try {
    const docRef = await db.collection("study_logs").add({
      uid: req.user.uid,
      subject,
      durationMinutes: Number(durationMinutes),
      note: note || "",
      date: date || new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true, id: docRef.id });
  } catch (err) {
    console.error("❌ Study log error:", err.message);
    res.status(500).json({ error: "Failed to save study log" });
  }
});

app.get("/api/study", verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection("study_logs")
      .where("uid", "==", req.user.uid)
      .orderBy("createdAt", "desc")
      .get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (err) {
    console.error("❌ Fetch study logs error:", err.message);
    res.status(500).json({ error: "Failed to fetch study logs" });
  }
});

app.delete("/api/study/:id", verifyToken, async (req, res) => {
  try {
    const doc = await db.collection("study_logs").doc(req.params.id).get();
    if (!doc.exists || doc.data().uid !== req.user.uid)
      return res.status(403).json({ error: "Forbidden" });
    await db.collection("study_logs").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Delete study log error:", err.message);
    res.status(500).json({ error: "Failed to delete study log" });
  }
});

// ================================
// 6. GOALS
// ================================
app.get("/api/goals", verifyToken, async (req, res) => {
  try {
    const doc = await db.collection("goals").doc(req.user.uid).get();
    res.json(doc.exists ? doc.data() : { dailyMinutes: 120 });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch goal" });
  }
});

app.post("/api/goals", verifyToken, async (req, res) => {
  const { dailyMinutes } = req.body;
  if (!dailyMinutes || isNaN(Number(dailyMinutes)))
    return res.status(400).json({ error: "dailyMinutes is required" });

  try {
    await db.collection("goals").doc(req.user.uid).set({
      dailyMinutes: Number(dailyMinutes),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save goal" });
  }
});

// ================================
// 7. SCHEDULE
// ================================
app.post("/api/schedule", verifyToken, async (req, res) => {
  const { subject, day, startTime, endTime } = req.body;
  if (!subject || !day || !startTime || !endTime)
    return res.status(400).json({ error: "subject, day, startTime, endTime are required" });

  try {
    const docRef = await db.collection("schedule").add({
      uid: req.user.uid,
      subject,
      day,
      startTime,
      endTime,
      source: "manual",
      completed: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ id: docRef.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to add schedule event" });
  }
});

app.get("/api/schedule", verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection("schedule")
      .where("uid", "==", req.user.uid)
      .orderBy("day", "asc")
      .get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});

app.patch("/api/schedule/:id", verifyToken, async (req, res) => {
  try {
    const doc = await db.collection("schedule").doc(req.params.id).get();
    if (!doc.exists || doc.data().uid !== req.user.uid)
      return res.status(403).json({ error: "Forbidden" });
    await db.collection("schedule").doc(req.params.id).update({
      completed: !!req.body.completed,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update schedule event" });
  }
});

app.delete("/api/schedule/:id", verifyToken, async (req, res) => {
  try {
    const doc = await db.collection("schedule").doc(req.params.id).get();
    if (!doc.exists || doc.data().uid !== req.user.uid)
      return res.status(403).json({ error: "Forbidden" });
    await db.collection("schedule").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete schedule event" });
  }
});

// ================================
// 8. LIFE LOGS (Gym / Food / Budget)
// ================================
const VALID_LOG_TYPES = ["gym", "food", "budget"];

app.post("/api/lifelog", verifyToken, async (req, res) => {
  const { textContent, date, logType } = req.body;

  if (!textContent)
    return res.status(400).json({ error: "No text content provided" });
  if (!VALID_LOG_TYPES.includes(logType))
    return res.status(400).json({ error: "Invalid logType" });

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    let prompt = "";

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
    "steps": 0,
    "setsCompleted": 0,
    "dropSets": 0
  }
}`;
    } else if (logType === "food") {
      prompt = `
You are a highly analytical, strict sports nutritionist reviewing a client's daily food log.
Tone: clinical, practical, and direct. No fluff. Focus on macro composition and fuel quality.
Use emojis only in section headers. Use short paragraphs and bullet points.

Analyze the following journal entry: "${textContent}"

You MUST respond using this exact JSON schema:
{
  "aiSummary": "A detailed markdown nutrition report structured exactly into:\\n\\n### 🍳 Macros & Fuel\\n(Breakdown of the protein, carbs, and fats consumed. Comment on quality.)\\n\\n### 🧠 Nutritional Takeaways\\n(Actionable bullets on nutrient timing, hydration, what was good, what to improve.)",
  "metrics": {
    "proteinGrams": 0,
    "calories": 0
  }
}`;
    } else if (logType === "budget") {
      prompt = `
You are a strict financial advisor reviewing a client's daily expense log.
Assume a ₹5000 monthly budget. Tone: practical, analytical, and direct. Use emojis only in section headers.

Analyze the following journal entry: "${textContent}"

You MUST respond using this exact JSON schema:
{
  "aiSummary": "A detailed markdown financial report structured exactly into:\\n\\n### 💸 Expense Breakdown\\n(Analysis of what was spent today and if it was necessary.)\\n\\n### 🧠 Financial Takeaways\\n(Actionable bullets on saving habits and budget pacing.)",
  "metrics": {
    "foodSpendToday": 0,
    "remainingBudget": 5000
  }
}`;
    }

    const result = await model.generateContent(prompt);
    const parsedMetrics = JSON.parse(result.response.text());

    // ── Cumulative budget calculation ─────────────────────────────────────
    if (logType === "budget") {
      const existingSnapshot = await db.collection("budget_logs")
        .where("uid", "==", req.user.uid)
        .get();
      const totalPreviouslySpent = existingSnapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().metrics?.foodSpendToday || 0), 0
      );
      parsedMetrics.metrics.remainingBudget =
        5000 - totalPreviouslySpent - (parsedMetrics.metrics.foodSpendToday || 0);
    }

    await db.collection(`${logType}_logs`).add({
      uid: req.user.uid,
      textContent,
      aiSummary: parsedMetrics.aiSummary,
      metrics: parsedMetrics.metrics,
      date: date || new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, ...parsedMetrics });
  } catch (err) {
    console.error(`❌ ${logType} Save Error:`, err.message);
    res.status(500).json({ error: "Failed to process log" });
  }
});

app.get("/api/lifelog/:logType", verifyToken, async (req, res) => {
  const { logType } = req.params;
  if (!VALID_LOG_TYPES.includes(logType))
    return res.status(400).json({ error: "Invalid logType" });

  try {
    const snapshot = await db.collection(`${logType}_logs`)
      .where("uid", "==", req.user.uid)
      .orderBy("date", "desc")
      .get();

    let logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // ── Recalculate cumulative budget remaining ────────────────────────────
    if (logType === "budget") {
      const BASE_BUDGET = 5000;
      const sorted = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
      let runningSpent = 0;
      const withRunning = sorted.map(log => {
        runningSpent += log.metrics?.foodSpendToday || 0;
        return {
          ...log,
          metrics: { ...log.metrics, remainingBudget: BASE_BUDGET - runningSpent },
        };
      });
      logs = withRunning.reverse();
    }

    res.json({ success: true, logs });
  } catch (err) {
    console.error(`❌ Fetch ${logType} logs error:`, err.message);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// ================================
// 9. WEIGHT TRACKER
// ================================
app.post("/api/weight", verifyToken, async (req, res) => {
  const { weight, date } = req.body;
  if (!weight || isNaN(parseFloat(weight)))
    return res.status(400).json({ error: "Valid weight is required" });

  try {
    const docRef = await db.collection("weight_logs").add({
      uid: req.user.uid,
      weight: parseFloat(weight),
      date: date || new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true, id: docRef.id });
  } catch (err) {
    console.error("❌ Weight Save Error:", err.message);
    res.status(500).json({ error: "Failed to save weight" });
  }
});

app.get("/api/weight", verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection("weight_logs")
      .where("uid", "==", req.user.uid)
      .orderBy("date", "desc")
      .limit(90)
      .get();
    res.json({
      success: true,
      logs: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    });
  } catch (err) {
    console.error("❌ Fetch Weight Logs Error:", err.message);
    res.status(500).json({ error: "Failed to fetch weight logs" });
  }
});

// ================================
// 10. DASHBOARD ANALYTICS (single batched request)
// ================================
app.get("/api/analytics/dashboard", verifyToken, async (req, res) => {
  const uid = req.user.uid;
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  try {
    const [
      studySnap, schedSnap, weightSnap,
      budgetSnap, gymSnap, foodSnap, goalDoc,
    ] = await Promise.all([
      db.collection("study_logs")
        .where("uid", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(90)
        .get(),
      db.collection("schedule")
        .where("uid", "==", uid)
        .where("day", "==", todayStr)
        .get(),
      db.collection("weight_logs")
        .where("uid", "==", uid)
        .orderBy("date", "desc")
        .limit(1)
        .get(),
      db.collection("budget_logs")
        .where("uid", "==", uid)
        .orderBy("date", "desc")
        .limit(1)
        .get(),
      db.collection("gym_logs")
        .where("uid", "==", uid)
        .orderBy("date", "desc")
        .limit(1)
        .get(),
      db.collection("food_logs")
        .where("uid", "==", uid)
        .orderBy("date", "desc")
        .limit(1)
        .get(),
      db.collection("goals").doc(uid).get(),
    ]);

    const studyLogs = studySnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Today's study minutes
    const todayMinutes = studyLogs
      .filter(l => l.date?.startsWith(todayStr))
      .reduce((s, l) => s + (l.durationMinutes || 0), 0);

    // Streak
    const logsDateSet = new Set(
      studyLogs
        .filter(l => l.durationMinutes > 0)
        .map(l => l.date?.split("T")[0])
        .filter(Boolean)
    );
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(now - i * 86400000).toISOString().split("T")[0];
      if (logsDateSet.has(d)) streak++;
      else break;
    }

    // Weekly chart
    const subjects = [...new Set(studyLogs.map(l => l.subject).filter(Boolean))];
    const weeklyChart = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now - (6 - i) * 86400000).toISOString().split("T")[0];
      const row = {
        day: new Date(d).toLocaleDateString("en-US", { weekday: "short" }),
      };
      subjects.forEach(sub => {
        row[sub] = studyLogs
          .filter(l => l.subject === sub && l.date?.startsWith(d))
          .reduce((s, l) => s + (l.durationMinutes || 0), 0);
      });
      return row;
    });

    const weeklyTotal = studyLogs
      .filter(l => new Date(l.date) > new Date(now - 7 * 86400000))
      .reduce((s, l) => s + (l.durationMinutes || 0), 0);

    res.json({
      study: { todayMinutes, streak, weeklyChart, subjects, weeklyTotal },
      schedule: {
        todayClasses: schedSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      },
      weight:  weightSnap.docs[0]  ? { id: weightSnap.docs[0].id,  ...weightSnap.docs[0].data()  } : null,
      budget:  budgetSnap.docs[0]  ? { id: budgetSnap.docs[0].id,  ...budgetSnap.docs[0].data()  } : null,
      gym:     gymSnap.docs[0]     ? { id: gymSnap.docs[0].id,     ...gymSnap.docs[0].data()     } : null,
      food:    foodSnap.docs[0]    ? { id: foodSnap.docs[0].id,    ...foodSnap.docs[0].data()    } : null,
      goals:   goalDoc.exists      ? goalDoc.data() : { dailyMinutes: 120 },
    });
  } catch (err) {
    console.error("❌ Dashboard analytics error:", err.message);
    res.status(500).json({ error: "Failed to load dashboard analytics" });
  }
});

// ================================
// 11. VTOP INIT (Forced CAPTCHA)
// ================================
app.get('/api/vtop/init', async (req, res) => {
  console.log("--> Starting VTOP CC Init Sequence...");
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: process.env.NODE_ENV === "production" ? true : false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
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

    while (!captchaSrc && attempts < maxAttempts) {
      attempts++;
      console.log(`\n--- [Attempt ${attempts}/${maxAttempts}] Loading VTOP ---`);

      await page.goto('https://vtopcc.vit.ac.in/', { waitUntil: 'networkidle2', timeout: 30000 });

      await page.waitForSelector('#stdForm', { timeout: 10000 });
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.evaluate(() => document.getElementById('stdForm').submit()),
      ]);

      captchaSrc = await page.evaluate(() => {
        const img = document.querySelector('#captchaBlock img');
        return (img && img.src && img.src.includes('data:image')) ? img.src : null;
      });

      if (captchaSrc) {
        console.log("✅ CAPTCHA found.");
        break;
      } else {
        console.log("⚠️ No CAPTCHA — retrying in 2s...");
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!captchaSrc) {
      throw new Error("Failed to force CAPTCHA after 5 attempts.");
    }

    const sessionId = crypto.randomUUID();
    activeSessions.set(sessionId, { browser, page, getAlert: () => lastAlert });

    // Auto-cleanup after 5 minutes
    setTimeout(() => {
      if (activeSessions.has(sessionId)) {
        console.log(`Cleaning up abandoned session: ${sessionId}`);
        activeSessions.get(sessionId).browser.close().catch(() => {});
        activeSessions.delete(sessionId);
      }
    }, 5 * 60 * 1000);

    res.json({ sessionId, captchaImage: captchaSrc, captchaRequired: true });
  } catch (err) {
    console.error("❌ VTOP Init Error:", err.message);
    if (browser) await browser.close().catch(() => {});
    res.status(500).json({ error: "Failed to initialize VTOP session" });
  }
});

// ================================
// 12. VTOP SYNC (Attendance + Timetable)
// ================================
app.post('/api/vtop/sync', verifyToken, async (req, res) => {
  const uid = req.user.uid;
  const { sessionId, regNo, password, captcha } = req.body;

  if (!sessionId || !regNo || !password)
    return res.status(400).json({ error: "sessionId, regNo and password are required" });
  if (!activeSessions.has(sessionId))
    return res.status(400).json({ error: "Session expired. Please start a new sync." });

  const { browser, page, getAlert } = activeSessions.get(sessionId);

  try {
    // ── Step 4: Inject credentials ──────────────────────────────────────────
    console.log("4. Injecting Credentials...");
    await page.waitForSelector('#username', { visible: true, timeout: 15000 });
    await page.type('#username', regNo);
    await page.type('#password', password);
    if (await page.$('#captchaStr') && captcha) await page.type('#captchaStr', captcha);

    console.log("5. Submitting Login...");
    await Promise.all([
      page.click('#submitBtn'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => null),
    ]);

    const isDashboard = await page.waitForSelector('.SideBarMenuBtn', { timeout: 15000 }).catch(() => null);
    if (!isDashboard)
      throw new Error(getAlert() ? `VTOP Error: ${getAlert()}` : "Login failed. Check credentials or CAPTCHA.");

    // ── Step 5: Attendance scrape ────────────────────────────────────────────
    console.log("6. Navigating to Attendance...");
    await page.evaluate(() => document.querySelector('.SideBarMenuBtn')?.click());
    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() =>
      document.querySelector('a[data-url="academics/common/StudentAttendance"]')?.click()
    );

    await page.waitForSelector('#semesterSubId', { visible: true, timeout: 15000 });

    const targetAttValue = await page.evaluate(() => {
      const sel = document.getElementById('semesterSubId');
      if (!sel) return null;
      const opt = Array.from(sel.options).find(o =>
        o.value !== "" &&
        !o.innerText.includes('Industry') &&
        !o.innerText.includes('LLM') &&
        !o.innerText.includes('LAW')
      );
      return opt ? opt.value : (sel.options.length > 1 ? sel.options[1].value : null);
    });

    if (targetAttValue) await page.select('#semesterSubId', targetAttValue);
    await new Promise(r => setTimeout(r, 1500));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const viewBtn = btns.find(b => b.innerText.trim() === 'View' || b.innerText.includes('View'));
      if (viewBtn) viewBtn.click();
      else document.querySelector('button[type="submit"]')?.click();
    });

    try {
      await page.waitForSelector('table.table tbody tr:nth-child(2)', { visible: true, timeout: 20000 });
    } catch {
      await page.screenshot({ path: 'attendance-failed.png', fullPage: true });
      throw new Error("Attendance table missing. Check attendance-failed.png.");
    }

    const bunkData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table.table tbody tr'));
      const map = {};
      const tMap = {
        "Embedded Theory": "ETH", "Embedded Lab": "ELA",
        "Theory Only": "TH", "Lab Only": "LO", "Soft Skill": "SS",
      };
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 12) {
          const code = cells[1]?.innerText.trim().replace(/[^A-Z0-9]/gi, '');
          const name = cells[2]?.innerText.trim();
          const rawType = cells[3]?.innerText.trim() || "";
          let shortType = "TH";
          for (const [k, v] of Object.entries(tMap)) if (rawType.includes(k)) shortType = v;
          map[`${code}-${shortType}`] = {
            name,
            attended: parseInt(cells[9]?.innerText.trim()) || 0,
            total: parseInt(cells[10]?.innerText.trim()) || 0,
            percent: cells[11]?.innerText.trim() || "0",
          };
        }
      });
      return map;
    });

    // ── Step 6: Timetable scrape ─────────────────────────────────────────────
    console.log("7. Navigating to Time Table...");
    await page.evaluate(() => document.querySelector('.SideBarMenuBtn')?.click());
    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() =>
      document.querySelector('a[data-url="academics/common/StudentTimeTableChn"]')?.click()
    );

    await new Promise(r => setTimeout(r, 4000));

    await page.waitForFunction(() => {
      const sel = document.getElementById('semesterSubId');
      return sel && sel.options && sel.options.length > 1;
    }, { timeout: 15000 });

    const { targetTtValue, semesterName } = await page.evaluate(() => {
      const sel = document.getElementById('semesterSubId');
      const opt = Array.from(sel.options).find(o =>
        o.value !== "" &&
        !o.innerText.includes('Industry') &&
        !o.innerText.includes('LLM') &&
        !o.innerText.includes('LAW')
      );
      return {
        targetTtValue: opt ? opt.value : sel.options[1].value,
        semesterName: opt ? opt.innerText : sel.options[1].innerText,
      };
    });

    console.log(`7.2. Semester: ${targetTtValue} (${semesterName})`);

    let gridLoaded = false;
    for (let i = 1; i <= 3; i++) {
      await page.evaluate(val => {
        const sel = document.getElementById('semesterSubId');
        if (sel) {
          sel.value = val;
          if (typeof sel.onchange === 'function') sel.onchange();
          else if (typeof processViewTimeTable === 'function') processViewTimeTable();
          else sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, targetTtValue);

      await new Promise(r => setTimeout(r, 4000));

      if (await page.$('#timeTableStyle')) {
        gridLoaded = true;
        console.log("✅ Timetable grid loaded!");
        break;
      }
      console.log(`⚠️ Grid missing. Retry ${i}/3...`);
    }

    if (!gridLoaded) {
      await page.screenshot({ path: 'timetable-failed.png', fullPage: true });
      throw new Error("Timetable grid missing. Check timetable-failed.png.");
    }

    const teacherData = await page.evaluate(() => {
      const rows = document.querySelectorAll('table.table tbody tr');
      const map = {};
      const tMap = {
        "Embedded Theory": "ETH", "Embedded Lab": "ELA",
        "Theory Only": "TH", "Lab Only": "LO", "Soft Skill": "SS",
      };
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
        for (let i = 2; i < s.length; i++)
          if (s[i] !== 'Lunch' && s[i] !== '') m[i] = { start: s[i], end: e[i - 1] };
        return m;
      };

      const tT = getT(rows[0], rows[1]);
      const lT = getT(rows[2], rows[3]);
      const dM = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 };
      let curD = 0;

      for (let r = 4; r < rows.length; r++) {
        const cells = Array.from(rows[r].querySelectorAll('td'));
        if (!cells.length) continue;

        let isT = false, off = 0;
        if (cells[0].rowSpan > 1) { curD = dM[cells[0].innerText.trim()]; isT = true; off = 0; }
        else { isT = false; off = 1; }

        const times = isT ? tT : lT;
        for (let c = 0; c < cells.length; c++) {
          if (cells[c].getAttribute('bgcolor') === '#CCFF33') {
            const p = cells[c].innerText.trim().split('-');
            if (p.length >= 5 && times[c + off]) {
              events.push({
                code: p[1],
                slot: `${p[0]} (${p[3]}-${p[4]})`,
                type: p[2],
                dayOff: curD,
                start: times[c + off].start,
                end: times[c + off].end,
              });
            }
          }
        }
      }
      return events;
    });

    await browser.close();
    activeSessions.delete(sessionId);

    // ── Step 7: Assemble semester calendar ───────────────────────────────────
    console.log("10. Assembling semester calendar...");
    const yearMatch = semesterName.match(/\d{4}/);
    const baseYear = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
    const startDate = new Date(Date.UTC(baseYear, 11, 1));
    const endDate   = new Date(Date.UTC(baseYear + 1, 3, 30));
    const jsDayMap  = [1, 2, 3, 4, 5, 6, 0];

    const mappedEvents = [];
    rawSchedule.forEach(c => {
      const key      = `${c.code}-${c.type}`;
      const bunk     = bunkData[key]    || {};
      const teacher  = teacherData[key] || "Unknown Faculty";
      const finalName = bunk.name || c.code;

      let cur = new Date(startDate);
      while (cur.getUTCDay() !== jsDayMap[c.dayOff]) cur.setUTCDate(cur.getUTCDate() + 1);

      while (cur <= endDate) {
        mappedEvents.push({
          subject:    finalName,
          courseCode: c.code,
          courseName: finalName,
          slot:       c.slot,
          teacher,
          attendance: bunk.percent  || "0",
          attended:   bunk.attended || 0,
          total:      bunk.total    || 0,
          day:        cur.toISOString().split('T')[0],
          startTime:  c.start,
          endTime:    c.end,
        });
        cur.setUTCDate(cur.getUTCDate() + 7);
      }
    });

    // ── Step 8: Firebase batch write ─────────────────────────────────────────
    const chunk = (arr, size) =>
      Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
        arr.slice(i * size, i * size + size)
      );

    console.log("11. Removing old VTOP entries...");
    const old = await db.collection("schedule")
      .where("uid", "==", uid)
      .where("source", "==", "vtop")
      .get();
    for (const c of chunk(old.docs, 400)) {
      const b = db.batch();
      c.forEach(d => b.delete(d.ref));
      await b.commit();
    }

    console.log(`12. Writing ${mappedEvents.length} classes...`);
    const saved = [];
    for (const c of chunk(mappedEvents, 400)) {
      const b = db.batch();
      c.forEach(e => {
        const ref = db.collection("schedule").doc();
        const data = {
          ...e,
          uid,
          completed: false,
          source: "vtop",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        b.set(ref, data);
        saved.push({ id: ref.id, ...data });
      });
      await b.commit();
    }

    console.log("✅ VTOP Sync complete!");
    res.json({ success: true, events: saved });

  } catch (err) {
    console.error("❌ VTOP Sync Error:", err.message);
    if (activeSessions.has(sessionId)) {
      const s = activeSessions.get(sessionId);
      if (s.browser) await s.browser.close().catch(() => {});
      activeSessions.delete(sessionId);
    }
    res.status(500).json({ error: err.message });
  }
});

// ================================
// 13. START SERVER
// ================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
