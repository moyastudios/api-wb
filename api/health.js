import { db } from "../lib/db.js";
import { allowMethod, authorised } from "../lib/http.js";

export default async function handler(req, res) {
  if (!allowMethod(req, res, "GET") || !authorised(req, res)) return;
  try {
    await db().query("SELECT 1");
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("health failed", error);
    res.status(503).json({ ok: false, error: "Database unavailable" });
  }
}
