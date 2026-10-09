import { Router } from "express";
import { rtdb } from "../middleware/firebase.js";
import { requireUser, handle, toArray } from "../middleware/requireUser.js";
import { songsFor } from "../data/seed.js";

const router = Router();
router.use(requireUser);

const likesRef = (uid) => rtdb.ref(`users/${uid}/likes`);

async function updateLikes(uid, fn) {
  const { snapshot } = await likesRef(uid).transaction((cur) =>
    fn(toArray(cur)),
  );
  return toArray(snapshot.val());
}

router.get(
  "/",
  handle(async (req, res) => {
    const snap = await likesRef(req.user.id).once("value");
    const songs = await songsFor(toArray(snap.val()));
    res.json(songs);
  }),
);

router.post(
  "/:songId",
  handle(async (req, res) => {
    const { song } = req.params;
    res.json(
      await updateLikes(req.user.id, (list) => [...new Set([...list, songId])]),
    );
  }),
);

router.delete(
  "/:songId",
  handle(async (req, res) => {
    const { songId } = req.params;
    res.json(
      await updateLikes(req.user.id, (list) =>
        list.filter((s) => s !== songId),
      ),
    );
  }),
);

export default router;
