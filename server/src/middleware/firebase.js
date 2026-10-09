
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import { readFileSync, existsSync } from "node:fs";

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : JSON.parse(
      readFileSync(
        new URL("./serviceAccountKey.json", import.meta.url),
        "utf8",
      ),
    );

const admin = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(serviceAccount),
      databaseURL:
        "https://music-araasoftwares-default-rtdb.firebaseio.com",
    });

export const auth = getAuth(admin);
export const rtdb = getDatabase(admin);

export default admin;