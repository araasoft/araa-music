import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

import serviceAccount from "./serviceAccountKey.json" with { type: "json" };

const admin = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(serviceAccount),
      databaseURL:
        "https://araa-music-web-default-rtdb.asia-southeast1.firebasedatabase.app",
    });

export const auth = getAuth(admin);
export const rtdb = getDatabase(admin);

export default admin;