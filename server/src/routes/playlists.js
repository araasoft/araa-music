import { Router } from "express";
import { rtdb } from "../middleware/firebase.js";
import { requireUser, handle, toArray } from "../middleware/requireUser.js";
import { createId } from "../auth.js";
import { songsFor } from "../data/seed.js";
import {
  paginateArray,
  validatePaginationParams,
  formatResponse,
  formatError,
} from "../data/pagination-utils.js";

const router = Router();
router.use(requireUser);

const listRef = (uid) => rtdb.ref(`users/${uid}/playlists`);
const plRef = (uid, id) => listRef(uid).child(id);
const normalize = (p) => ({ ...p, songIds: toArray(p.songIds) });

async function getMine(req) {
  const snap = await plRef(req.user.id, req.params.id).once("value");
  return snap.exists() ? normalize(snap.val()) : null;
}

router.get("/", handle(async (req, res) => {
  const snap = await listRef(req.user.id).once("value");
  const all = Object.values(snap.val() || {}).map(normalize);
  res.json(all.sort((a, b) => b.createdAt - a.createdAt));
}));

router.post("/", handle(async (req, res) => {
  const { title, description, cover } = req.body || {};
  if (!title) return res.status(400).json({ error: "Title is required" });

  const id = createId("pl");
  const playlist = {
    id,
    title,
    description: description || "",
    cover: cover || `/api/covers/${createId("cover")}.svg?label=${encodeURIComponent(title)}`,
    songIds: [],
    owner: req.user.name || "",
    createdAt: Date.now(),
  };
  await plRef(req.user.id, id).set(playlist);
  res.status(201).json(playlist);
}));

router.get("/:id", handle(async (req, res) => {
  const pl = await getMine(req);
  if (!pl) return res.status(404).json({ error: "Playlist not found" });
  res.json({ ...pl, songs: songsFor(pl.songIds) });
}));

router.get("/:id/songs", handle(async (req, res) => {
  const pl = await getMine(req);
  if (!pl) return res.status(404).json(formatError("Playlist not found", 404));
  const { page, limit } = validatePaginationParams(req.query);
  const { data, pagination } = paginateArray(songsFor(pl.songIds), page, limit);
  res.json(formatResponse(data, pagination));
}));

router.patch("/:id", handle(async (req, res) => {
  if (!(await getMine(req))) return res.status(404).json({ error: "Playlist not found" });
  const { title, description, cover } = req.body || {};
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (cover !== undefined) updates.cover = cover;

  if (Object.keys(updates).length) await plRef(req.user.id, req.params.id).update(updates);
  res.json(await getMine(req));
}));

router.delete("/:id", handle(async (req, res) => {
  if (!(await getMine(req))) return res.status(404).json({ error: "Playlist not found" });
  await plRef(req.user.id, req.params.id).remove();
  res.json({ ok: true });
}));

async function changeSongs(req, res, fn) {
  if (!(await getMine(req))) return res.status(404).json({ error: "Playlist not found" });
  await plRef(req.user.id, req.params.id)
    .child("songIds")
    .transaction((cur) => fn(toArray(cur)));
  res.json(await getMine(req));
}

router.post("/:id/songs/:songId", handle((req, res) =>
  changeSongs(req, res, (ids) => [...new Set([...ids, req.params.songId])])
));

router.delete("/:id/songs/:songId", handle((req, res) =>
  changeSongs(req, res, (ids) => ids.filter((s) => s !== req.params.songId))
));

export default router;