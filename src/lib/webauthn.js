import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";

import { getAuth } from "firebase/auth";

/*
|--------------------------------------------------------------------------
| CONFIG
|--------------------------------------------------------------------------
*/

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/*
|--------------------------------------------------------------------------
| FIREBASE TOKEN
|--------------------------------------------------------------------------
*/

export async function getToken(forceRefresh = false) {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      console.error("[getToken] No Firebase user");
      return null;
    }

    return await user.getIdToken(forceRefresh);
  } catch (error) {
    console.error("[getToken] Failed to get Firebase token:", error.message);
    return null;
  }
}

/*
|--------------------------------------------------------------------------
| AUTH HEADERS
|--------------------------------------------------------------------------
*/

const authHeaders = async () => {
  const token = await getToken();

  if (!token) {
    console.error("[authHeaders] Firebase token missing");
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

/*
|--------------------------------------------------------------------------
| SHARED HELPERS
|--------------------------------------------------------------------------
*/

async function parseJsonResponse(response, context) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error(`[webauthn] ${context}: server returned invalid JSON`, text);
    throw new Error("Server returned an invalid response");
  }
}

/*
|--------------------------------------------------------------------------
| REGISTER BIOMETRIC
|--------------------------------------------------------------------------
*/

export async function registerBiometric() {
  try {
    // STEP 1 — make sure we have a Firebase session
    const token = await getToken();
    if (!token) {
      throw new Error("You are not logged in to Firebase");
    }

    // STEP 2 — get registration options from the server
    const headers = await authHeaders();
    const optionsResponse = await fetch(`${API_URL}/webauthn/register/options`, {
      method: "GET",
      headers,
    });

    if (!optionsResponse.ok) {
      const errorText = await optionsResponse.text();
      throw new Error(
        `Registration options failed (${optionsResponse.status}): ${errorText}`,
      );
    }

    const optionsJSON = await parseJsonResponse(
      optionsResponse,
      "registration options",
    );

    if (!optionsJSON?.challenge) {
      throw new Error("Registration options missing challenge");
    }

    // STEP 3 — run the browser WebAuthn ceremony
    const registration = await startRegistration({ optionsJSON });

    if (!registration?.id) {
      throw new Error("Browser did not return a credential ID");
    }

    // STEP 4 — send the credential to the server for verification
    const verifyHeaders = await authHeaders();
    const verificationResponse = await fetch(`${API_URL}/webauthn/register/verify`, {
      method: "POST",
      headers: verifyHeaders,
      body: JSON.stringify(registration),
    });

    const result = await parseJsonResponse(
      verificationResponse,
      "registration verification",
    );

    if (!verificationResponse.ok) {
      throw new Error(
        result.error ||
          `Biometric registration failed (${verificationResponse.status})`,
      );
    }

    return result;
  } catch (error) {
    console.error("[registerBiometric] Failed:", error.message);
    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| UNLOCK WITH BIOMETRIC
|--------------------------------------------------------------------------
*/

export async function unlockWithBiometric() {
  try {
    // STEP 1 — make sure we have a Firebase session
    const token = await getToken();
    if (!token) {
      throw new Error("You are not logged in to Firebase");
    }

    // STEP 2 — get authentication options from the server
    const headers = await authHeaders();
    const optionsResponse = await fetch(`${API_URL}/webauthn/auth/options`, {
      method: "GET",
      headers,
    });

    if (!optionsResponse.ok) {
      let errorMessage = "No biometric credential";
      try {
        const errorJSON = await optionsResponse.clone().json();
        errorMessage = errorJSON.error || errorMessage;
      } catch {
        // response wasn't JSON — fall back to the default message
      }
      throw new Error(
        `Authentication options failed (${optionsResponse.status}): ${errorMessage}`,
      );
    }

    const optionsJSON = await parseJsonResponse(
      optionsResponse,
      "authentication options",
    );

    if (!optionsJSON?.challenge) {
      throw new Error("Authentication options missing challenge");
    }

    // STEP 3 — run the browser WebAuthn ceremony
    const authentication = await startAuthentication({ optionsJSON });

    if (!authentication?.id) {
      throw new Error("Browser did not return authentication credential ID");
    }

    // STEP 4 — send the assertion to the server for verification
    const verifyHeaders = await authHeaders();
    const verificationResponse = await fetch(`${API_URL}/webauthn/auth/verify`, {
      method: "POST",
      headers: verifyHeaders,
      body: JSON.stringify(authentication),
    });

    const result = await parseJsonResponse(
      verificationResponse,
      "authentication verification",
    );

    if (!verificationResponse.ok) {
      throw new Error(
        result.error ||
          `Authentication failed (${verificationResponse.status})`,
      );
    }

    return result;
  } catch (error) {
    console.error("[unlockWithBiometric] Failed:", error.message);
    throw error;
  }
}
