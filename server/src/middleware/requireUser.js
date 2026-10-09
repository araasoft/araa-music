export function requireUser(req, res, next) {
  if (!req.user?.id) return res.status(401).json({ message: "Please Login" });
  next();
}

// Wraps async handlers so errors return a 500 instead of hanging
export const handle = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  });

// RTDB returns arrays as objects (or null when empty)
export const toArray = (val) =>
  Array.isArray(val) ? val : Object.values(val || {});