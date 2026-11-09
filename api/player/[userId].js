import { db } from "../../lib/db.js";
import { allowMethod, authorised } from "../../lib/http.js";

// Used to restore a player who has no DataStore record, for example after moving to a new experience.
export default async function handler(req, res) {
  if (!allowMethod(req, res, "GET") || !authorised(req, res)) return;
  const userId = req.query.userId;
  if (typeof userId !== "string" || !/^[1-9]\d{0,18}$/.test(userId)) {
    res.status(400).json({ ok: false, error: "Invalid user id" });
    return;
  }
  try {
    const rows = await db().query(
      "SELECT data, EXTRACT(EPOCH FROM saved_at)::double precision AS saved_at FROM player_data WHERE user_id = $1",
      [userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Not found" });
      return;
    }
    res.status(200).json({ ok: true, data: rows[0].data, savedAt: rows[0].saved_at });
  } catch (error) {
    console.error("player read failed", error);
    res.status(503).json({ ok: false, error: "Database unavailable" });
  }
}
