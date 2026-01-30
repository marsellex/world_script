import express from "express";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";

const app = express();

const ALLOWED_ORIGINS = new Set([
  "https://world-script.onrender.com",
  "https://marsellex.github.io",
]);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl/postman
      return cb(null, ALLOWED_ORIGINS.has(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept", "x-admin-token"],
  })
);

app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => res.send("API is alive ✅"));
app.get("/health", (req, res) => res.json({ ok: true }));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

function requireAdmin(req, res, next) {
  const t = req.headers["x-admin-token"];
  if (!ADMIN_TOKEN || t !== ADMIN_TOKEN) return res.status(403).send("Forbidden");
  next();
}

const ALLOWED_ASH_FIELDS = new Set(["points_day"]);

app.post("/api/ash/set", requireAdmin, async (req, res) => {
  const nick = String(req.body?.nick || "").trim();
  const ashRaw = String(req.body?.ash ?? "").trim();
  const field = String(req.body?.field || "points_day").trim();

  if (!nick) return res.status(400).send("Bad request: nick");
  if (field !== "points_day") return res.status(400).send("Bad request: field");

  const { data: row, error: e1 } = await sb
    .from("leaderinfo")
    .select(`id,${field}`)
    .eq("nick", nick)
    .maybeSingle();

  if (e1) return res.status(500).send(e1.message);
  if (!row?.id) return res.status(404).send("Nick not found");

  let newVal = 0;

  if (ashRaw === "X" || ashRaw === "x") {
    newVal = 0;
  } else {
    const addVal = Number(ashRaw);
    if (!Number.isFinite(addVal) || addVal < 0) return res.status(400).send("Bad request: ash");
    const oldVal = Number(row[field] || 0);
    newVal = oldVal + addVal;
  }

  const { error: e2 } = await sb
    .from("leaderinfo")
    .update({ [field]: newVal, updated_at: new Date().toISOString() })
    .eq("id", row.id);

  if (e2) return res.status(500).send(e2.message);

  res.json({ ok: true, nick, field, value: newVal });
});


app.get("/api/leaders/day", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 3), 10);

  const { data, error } = await sb
    .from("leaderinfo")
    .select("id,nick,account_id,avatar_url,department,points_day")
    .order("points_day", { ascending: false })
    .limit(limit);

  if (error) return res.status(500).send(error.message);

  res.json(
    (data || []).map((r) => ({
      id: r.id,
      nick: (r.nick || "").trim(),
      account_id: r.account_id,
      avatar_url: r.avatar_url,
      department: r.department,
      points: Number(r.points_day || 0),
    }))
  );
});

app.get("/api/leaders/week", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 8), 30);

  const { data, error } = await sb
    .from("leader_weekly_summary")
    .select(
      "week_start, week_end, nick_1, dept_1, ash_1, nick_2, dept_2, ash_2, nick_3, dept_3, ash_3, total_ash"
    )
    .order("week_start", { ascending: false })
    .limit(limit);

  if (error) return res.status(500).send(error.message);
  res.json(data || []);
});

app.get("/api/leaders/by-depts", async (req, res) => {
  const depts = String(req.query.depts || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const { data, error } = await sb
    .from("leaderinfo")
    .select("id,department,nick,account_id,avatar_url")
    .in("department", depts);

  if (error) return res.status(500).send(error.message);

  const map = new Map((data || []).map((r) => [r.department, r]));
  const ordered = depts.map(
    (d) => map.get(d) || { id: null, department: d, nick: "", account_id: "", avatar_url: null }
  );

  res.json(ordered);
});

app.post("/api/leaders/bulk", requireAdmin, async (req, res) => {
  const rows = req.body?.rows || [];
  for (const r of rows) {
    if (!r.id || !r.nick || !r.account_id) return res.status(400).send("Bad request");

    const payload = {
      nick: String(r.nick).trim(),
      account_id: String(r.account_id).trim(),
      updated_at: new Date().toISOString(),
    };

    if (r.avatar_base64) payload.avatar_url = r.avatar_base64;

    const { error } = await sb.from("leaderinfo").update(payload).eq("id", r.id);
    if (error) return res.status(500).send(error.message);
  }
  res.json({ ok: true });
});


app.get("/api/reactions/counts", async (req, res) => {
  const page = String(req.query.page || "");
  const { data, error } = await sb.from("page_reaction_counts").select("reaction,cnt").eq("page", page);

  if (error) return res.status(500).send(error.message);
  res.json(data || []);
});

app.get("/api/reactions/my", async (req, res) => {
  const page = String(req.query.page || "");
  const user_key = String(req.query.user_key || "");

  const { data, error } = await sb
    .from("page_reactions")
    .select("reaction")
    .eq("page", page)
    .eq("user_key", user_key)
    .maybeSingle();

  if (error) return res.status(500).send(error.message);
  res.json(data || {});
});

app.post("/api/reactions/set", async (req, res) => {
  const page = String(req.body?.page || "");
  const user_key = String(req.body?.user_key || "");
  const reaction = req.body?.reaction ?? null;

  if (!page || !user_key) return res.status(400).send("Bad request");

  if (reaction === null) {
    const { error } = await sb.from("page_reactions").delete().eq("page", page).eq("user_key", user_key);
    if (error) return res.status(500).send(error.message);
    return res.json({ ok: true });
  }

  const { error } = await sb.from("page_reactions").upsert(
    { page, user_key, reaction: String(reaction), updated_at: new Date().toISOString() },
    { onConflict: "page,user_key" }
  );

  if (error) return res.status(500).send(error.message);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log("API listening on", PORT));
