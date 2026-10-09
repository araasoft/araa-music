import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const defaults = {
  'users.json': [],
  'sessions.json': [],
  'likes.json': {}, // { userId: [songId, ...] }
  'history.json': {}, // { userId: [{ id, title, artist, cover, duration, src, plays, playedAt }] }
  'playlists.json': {}, // { userId: [playlist, ...] }
  'settings.json': {}, // { userId: { ...settings } }
}

function filePath(name) {
  return path.join(DATA_DIR, name)
}

function readJSON(name) {
  const file = filePath(name)
  if (!fs.existsSync(file)) {
    writeJSON(name, defaults[name])
    return structuredClone(defaults[name])
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return structuredClone(defaults[name])
  }
}

function writeJSON(name, data) {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2))
}

export const db = {
  get users() {
    return readJSON('users.json')
  },
  set users(v) {
    writeJSON('users.json', v)
  },
  get sessions() {
    return readJSON('sessions.json')
  },
  set sessions(v) {
    writeJSON('sessions.json', v)
  },
  get likes() {
    return readJSON('likes.json')
  },
  set likes(v) {
    writeJSON('likes.json', v)
  },
  get history() {
    return readJSON('history.json')
  },
  set history(v) {
    writeJSON('history.json', v)
  },
  get playlists() {
    return readJSON('playlists.json')
  },
  set playlists(v) {
    writeJSON('playlists.json', v)
  },
  get settings() {
    return readJSON('settings.json')
  },
  set settings(v) {
    writeJSON('settings.json', v)
  },
}
