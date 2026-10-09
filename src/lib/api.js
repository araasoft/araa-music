import { auth } from "./firebase.js";
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export async function getToken() {
  try {
    await auth.authStateReady(); // wait for Firebase to restore the session on refresh
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return await currentUser.getIdToken(); // auto-refreshes if expired
  } catch (err) {
    console.error("getToken failed", err);
    return null;
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = await getToken();
  headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    console.error(err);
    const offline = new Error('Could not reach the AraaMusic server. Is it running?')
    offline.cause = err
    offline.offline = true
    throw offline
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json().catch((e) => console.log(e)) : null
  
  if (!response.ok) {
    const message = data?.error || `Request failed (${response.status})`
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return data
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  baseUrl: BASE_URL,
}
