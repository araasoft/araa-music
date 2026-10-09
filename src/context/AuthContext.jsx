import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
} from "firebase/auth";
import { auth, googleProvider, facebookProvider } from "../lib/firebase.js";

const AuthContext = createContext(null);

const FIREBASE_ERROR_MESSAGES = {
  "auth/email-already-in-use":
    "An account with this email already exists. Try logging in instead.",
  "auth/invalid-email":
    "That email address doesn't look right. Please double-check it.",
  "auth/operation-not-allowed":
    "This sign-in method isn't enabled. Please contact support.",
  "auth/weak-password":
    "That password is too weak. Use at least 6 characters, mixing letters and numbers.",
  "auth/user-disabled":
    "This account has been disabled. Please contact support.",
  "auth/user-not-found":
    "No account found with that email. Check the address or sign up.",
  "auth/wrong-password":
    "Incorrect password. Please try again or reset your password.",
  "auth/invalid-credential": "Incorrect email or password. Please try again.",
  "auth/invalid-login-credentials":
    "Incorrect email or password. Please try again.",
  "auth/too-many-requests":
    "Too many attempts. Please wait a moment before trying again.",
  "auth/popup-closed-by-user":
    "The sign-in window was closed before finishing. Please try again.",
  "auth/cancelled-popup-request": "Sign-in was cancelled. Please try again.",
  "auth/popup-blocked":
    "Your browser blocked the sign-in popup. Please allow popups and try again.",
  "auth/account-exists-with-different-credential":
    "An account already exists with this email using a different sign-in method.",
  "auth/network-request-failed":
    "Network error. Please check your connection and try again.",
  "auth/missing-password": "Please enter a password.",
  "auth/missing-email": "Please enter an email address.",
  "auth/internal-error":
    "Something went wrong on our end. Please try again in a moment.",
};

function getFirebaseErrorMessage(err) {
  const code = err?.code;
  if (code && FIREBASE_ERROR_MESSAGES[code]) return FIREBASE_ERROR_MESSAGES[code];
  return "Something went wrong. Please try again.";
}

// Lightweight profile built straight from the Firebase user.
function toProfile(u) {
  if (!u) return null;
  return {
    name: u.displayName || "",
    email: u.email || "",
    avatar: u.photoURL || "",
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
      setProfile(toProfile(firebaseUser));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function register({ name, email, password }) {
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await firebaseUpdateProfile(cred.user, { displayName: name });
        setProfile(toProfile(cred.user));
      }
      return cred.user;
    } catch (err) {
      const friendly = getFirebaseErrorMessage(err);
      setError(friendly);
      throw new Error(friendly);
    }
  }

  async function login({ email, password }) {
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return cred.user;
    } catch (err) {
      const friendly = getFirebaseErrorMessage(err);
      setError(friendly);
      throw new Error(friendly);
    }
  }

  async function forgotPassword(email) {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const friendly = getFirebaseErrorMessage(err);
      setError(friendly);
      throw new Error(friendly);
    }
  }

  async function loginWithGoogle() {
    setError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      return cred.user;
    } catch (err) {
      const friendly = getFirebaseErrorMessage(err);
      setError(friendly);
      throw new Error(friendly);
    }
  }

  async function loginWithFacebook() {
    setError(null);
    try {
      const cred = await signInWithPopup(auth, facebookProvider);
      return cred.user;
    } catch (err) {
      const friendly = getFirebaseErrorMessage(err);
      setError(friendly);
      throw new Error(friendly);
    }
  }

  async function logout() {
    await firebaseSignOut(auth);
    // onAuthStateChanged clears user/profile.
  }

  const value = useMemo(
    () => ({
      user,
      profile,
      isAuthenticated: !!user,
      loading,
      error,
      register,
      login,
      forgotPassword,
      loginWithGoogle,
      loginWithFacebook,
      logout,
    }),
    [user, profile, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
