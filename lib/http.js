import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value) => createHash("sha256").update(String(value)).digest();

// Returns true when the request carries the right key; otherwise sends the response and returns false.
export function authorised(req, res) {
  const expected = process.env.WESTBRIDGE_API_KEY;
  if (!expected || expected.length < 32) {
    console.error("WESTBRIDGE_API_KEY is missing or too short");
    res.status(500).json({ ok: false, error: "Server is not configured" });
    return false;
  }
  const supplied = req.headers["x-api-key"];
  if (typeof supplied !== "string" || !timingSafeEqual(digest(supplied), digest(expected))) {
    res.status(401).json({ ok: false, error: "Unauthorised" });
    return false;
  }
  return true;
}

export function allowMethod(req, res, method) {
  if (req.method === method) return true;
  res.setHeader("Allow", method);
  res.status(405).json({ ok: false, error: "Method not allowed" });
  return false;
}
