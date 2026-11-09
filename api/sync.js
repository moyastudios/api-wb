import { db } from "../lib/db.js";
import { allowMethod, authorised } from "../lib/http.js";

const MAX_ITEMS = 200;
const RETENTION_DAYS = Number(process.env.LOG_RETENTION_DAYS) || 30;

const isTime = (v) => typeof v === "number" && Number.isFinite(v) && v > 0;
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isId = (v) => Number.isSafeInteger(v) && v > 0;
const optionalId = (v) => v === undefined || v === null || isId(v);

function validate(body) {
  if (!isObject(body)) return "Body must be a JSON object";
  const { players = [], companies = [], logs = [] } = body;
  if (![players, companies, logs].every(Array.isArray)) return "players, companies and logs must be arrays";
  if (Math.max(players.length, companies.length, logs.length) > MAX_ITEMS) return "Too many items";
  if (!players.every((p) => isObject(p) && isId(p.userId) && isObject(p.data) && isTime(p.savedAt))) return "Invalid player";
  if (!companies.every((c) => isObject(c) && typeof c.key === "string" && c.key.length > 0 && c.key.length <= 100 && isObject(c.data) && isTime(c.savedAt))) return "Invalid company";
  if (!logs.every((l) => isObject(l) && typeof l.category === "string" && l.category.length > 0 && l.category.length <= 50 && optionalId(l.actorId) && optionalId(l.targetId) && isObject(l.data) && isTime(l.time))) return "Invalid log";
  return null;
}

export default async function handler(req, res) {
  if (!allowMethod(req, res, "POST") || !authorised(req, res)) return;
  const problem = validate(req.body);
  if (problem) {
    res.status(400).json({ ok: false, error: problem });
    return;
  }
  const { players = [], companies = [], logs = [] } = req.body;
  try {
    const sql = db();
    const work = [];
    if (players.length) {
      const rows = players.map((p) => ({ user_id: p.userId, data: p.data, saved_at: p.savedAt }));
      // The WHERE stops an older save arriving late from overwriting a newer one.
      work.push(sql.query(
        `INSERT INTO player_data (user_id, data, saved_at)
         SELECT x.user_id, x.data, to_timestamp(x.saved_at)
         FROM jsonb_to_recordset($1::jsonb) AS x(user_id bigint, data jsonb, saved_at double precision)
         ON CONFLICT (user_id) DO UPDATE
           SET data = EXCLUDED.data, saved_at = EXCLUDED.saved_at, updated_at = now()
           WHERE player_data.saved_at <= EXCLUDED.saved_at`,
        [JSON.stringify(rows)]
      ));
    }
    if (companies.length) {
      const rows = companies.map((c) => ({ key: c.key, data: c.data, saved_at: c.savedAt }));
      work.push(sql.query(
        `INSERT INTO company_data (key, data, saved_at)
         SELECT x.key, x.data, to_timestamp(x.saved_at)
         FROM jsonb_to_recordset($1::jsonb) AS x(key text, data jsonb, saved_at double precision)
         ON CONFLICT (key) DO UPDATE
           SET data = EXCLUDED.data, saved_at = EXCLUDED.saved_at, updated_at = now()
           WHERE company_data.saved_at <= EXCLUDED.saved_at`,
        [JSON.stringify(rows)]
      ));
    }
    if (logs.length) {
      const rows = logs.map((l) => ({ category: l.category, actor_id: l.actorId ?? null, target_id: l.targetId ?? null, data: l.data, occurred_at: l.time }));
      work.push(sql.query(
        `INSERT INTO game_logs (category, actor_id, target_id, data, occurred_at)
         SELECT x.category, x.actor_id, x.target_id, x.data, to_timestamp(x.occurred_at)
         FROM jsonb_to_recordset($1::jsonb) AS x(category text, actor_id bigint, target_id bigint, data jsonb, occurred_at double precision)`,
        [JSON.stringify(rows)]
      ));
      // Keeps the free 1 GB from filling up: occasionally remove logs past the retention window.
      if (Math.random() < 0.02) {
        work.push(sql.query("DELETE FROM game_logs WHERE occurred_at < now() - make_interval(days => $1)", [RETENTION_DAYS]));
      }
    }
    await Promise.all(work);
    res.status(200).json({ ok: true, players: players.length, companies: companies.length, logs: logs.length });
  } catch (error) {
    console.error("sync failed", error);
    res.status(503).json({ ok: false, error: "Database unavailable" });
  }
}
