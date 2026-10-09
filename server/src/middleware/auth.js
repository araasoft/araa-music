import { auth } from "./firebase.js";

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Sign in required" });
  next();
}

export async function verifyToken(req, res, next) {
  const header = req.headers.authorization || "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!idToken) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const decoded = await auth.verifyIdToken(idToken, true); // true = check for revocation
    const userRecord = await auth.getUser(decoded.uid);

    req.id = decoded.uid;
    req.tokenClaims = decoded;
    req.user = {
      id: userRecord.uid,
      email: userRecord.email || null,
      emailVerified: userRecord.emailVerified,
      displayName: userRecord.displayName || null,
      photoURL: userRecord.photoURL || null,
      phoneNumber: userRecord.phoneNumber || null,
      disabled: userRecord.disabled,
      providerIds: userRecord.providerData.map((p) => p.providerId),
      customClaims: userRecord.customClaims || {},
      metadata: {
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
        lastRefreshTime: userRecord.metadata.lastRefreshTime || null,
      },
    };

    if (req.user.disabled) {
      return res.status(403).json({ error: "Account disabled" });
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export const identify = verifyToken;
