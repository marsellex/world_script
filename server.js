import express from "express";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: [
      "https://world-script.onrender.com",
      "https://marsellex.github.io",
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.send("API is alive ✅");
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

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
  const ordered = depts.map((d) => map.get(d) || { id: null, department: d, nick: "", account_id: "", avatar_url: null });
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
  const { data, error } = await sb
    .from("page_reaction_counts")
    .select("reaction,cnt")
    .eq("page", page);

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
  const { page, user_key, reaction } = req.body || {};
  if (!page || !user_key) return res.status(400).send("Bad request");

  if (reaction === null) {
    const { error } = await sb
      .from("page_reactions")
      .delete()
      .eq("page", page)
      .eq("user_key", user_key);
    if (error) return res.status(500).send(error.message);
    return res.json({ ok: true });
  }

  const { error } = await sb.from("page_reactions").upsert(
    { page, user_key, reaction, updated_at: new Date().toISOString() },
    { onConflict: "page,user_key" }
  );

  if (error) return res.status(500).send(error.message);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log("API listening on", PORT));
