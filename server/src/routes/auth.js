import { Router } from "express";
import { getAuth } from "firebase-admin/auth";
import { rtdb } from "../middleware/firebase.js";
import { handle } from "../middleware/requireUser.js";

const router = Router();

const profileRef = (uid) => rtdb.ref(`users/${uid}`);

function fromFirebase(u) {
  return {
    id: u.uid,
    uid: u.uid,
    displayName: u.displayName || "",
    name: u.displayName || "", // alias so existing client code keeps working
    email: u.email || "",
    emailVerified: u.emailVerified,
    photoURL: u.photoURL || "",
    avatar:
      u.photoURL ||
      `/api/covers/${encodeURIComponent(u.email || u.uid)}.svg?label=${encodeURIComponent(u.displayName || "User")}`,
    phoneNumber: u.phoneNumber || "",
    providers: u.providerData.map((p) => p.providerId),
    createdAt: u.metadata.creationTime || "",
    lastSignInAt: u.metadata.lastSignInTime || "",
  };
}

// Firebase Auth is the source of truth; RTDB keeps a synced copy
async function loadProfile(uid) {
  const profile = fromFirebase(await getAuth().getUser(uid));
  await profileRef(uid).update(profile);
  return profile;
}

router.get("/me", handle(async (req, res) => {
  res.json({ user: await loadProfile(req.user.id) });
}));

router.patch("/me", handle(async (req, res) => {
  const { displayName, name, photoURL } = req.body || {};
  const updates = {};

  const dn = displayName ?? name;
  if (dn !== undefined) {
    const v = String(dn).trim();
    if (!v) return res.status(400).json({ error: "displayName cannot be empty" });
    updates.displayName = v;
  }

  if (photoURL !== undefined) {
    if (photoURL === "" || photoURL === null) {
      updates.photoURL = null; // clears the photo
    } else {
      try {
        const u = new URL(photoURL);
        if (!["http:", "https:"].includes(u.protocol)) throw new Error();
      } catch {
        return res.status(400).json({ error: "photoURL must be a valid http(s) URL" });
      }
      updates.photoURL = photoURL;
    }
  }

  if (Object.keys(updates).length) await getAuth().updateUser(req.user.id, updates);
  res.json({ user: await loadProfile(req.user.id) });
}));

export default router;