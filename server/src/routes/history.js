import { Router } from "express";
import { rtdb } from "../middleware/firebase.js";

const router = Router();
const MAX_HISTORY = 60;

// Require login for every route in this file
router.use((req, res, next) => {
  if (!req.user?.id) return res.status(401).json({ message: "Please Login" });
  next();
});

const historyRef = (id) => rtdb.ref(`users/${id}/history`);

async function readHistory(id) {
  const snap = await historyRef(id).once("value");
  const val = snap.val();
  return Array.isArray(val) ? val : Object.values(val || {});
}

router.get("/", async (req, res) => {
  try {
    res.json(await readHistory(req.user.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load history" });
  }
});

router.post("/", async (req, res) => {
  try {
    const track = req.body || {};
    if (!track.id) return res.status(400).json({ error: "Track id is required" });

    const history = await readHistory(req.user.id);
    const entry = { ...track, playedAt: Date.now() };
    const next = [entry, ...history.filter((t) => t.id !== track.id)].slice(0, MAX_HISTORY);

    await historyRef(req.user.id).set(next);
    res.json(next);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save history" });
  }
});

router.delete("/", async (req, res) => {
  try {
    await historyRef(req.user.id).remove();
    res.json([]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to clear history" });
  }
});

export default router;