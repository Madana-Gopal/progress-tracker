// Simple Express + JSON-file backed sync server for the progress tracker.
// No auth — a random "sync code" is the shared secret that links devices.
// Swap the file-storage functions below for a real database (Postgres, etc.)
// if you need multi-instance / serverless deployment; a single persistent
// disk (Render, Railway, Fly.io, a VPS, ...) works fine as-is.

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "progress.json");

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ---------- storage helpers ----------

function ensureDataFile() {
  if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}), "utf8");
  }
}

function readAll() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw || "{}");
  } catch (err) {
    console.error("Failed to read data file, starting fresh:", err);
    return {};
  }
}

function writeAll(db) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
}

function generateCode() {
  const groups = [];
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
  for (let g = 0; g < 3; g++) {
    let part = "";
    for (let i = 0; i < 4; i++) {
      part += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    groups.push(part);
  }
  return groups.join("-");
}

// ---------- routes ----------

// Create a brand-new sync code with empty progress.
app.post("/api/progress", (req, res) => {
  const db = readAll();
  let code;
  do {
    code = generateCode();
  } while (db[code]);

  db[code] = { data: {}, updatedAt: new Date().toISOString() };
  writeAll(db);
  res.json({ code, data: {} });
});

// Fetch progress for an existing code.
app.get("/api/progress/:code", (req, res) => {
  const db = readAll();
  const code = (req.params.code || "").toUpperCase();
  const record = db[code];
  if (!record) {
    return res.status(404).json({ error: "Unknown sync code" });
  }
  res.json({ code, data: record.data, updatedAt: record.updatedAt });
});

// Save/overwrite progress for a code (creates it if missing, so a device
// can "claim" a code it typed in without a separate create step).
app.put("/api/progress/:code", (req, res) => {
  const db = readAll();
  const code = (req.params.code || "").toUpperCase();
  const incoming = req.body && typeof req.body.data === "object" ? req.body.data : null;
  if (!incoming) {
    return res.status(400).json({ error: "Body must be { data: {...} }" });
  }
  db[code] = { data: incoming, updatedAt: new Date().toISOString() };
  writeAll(db);
  res.json({ code, data: incoming, updatedAt: db[code].updatedAt });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Progress tracker running at http://localhost:${PORT}`);
});
