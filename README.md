# AraaMusic

A YouTube Music–style streaming UI with a custom "Aurora" visual identity,
6 switchable themes, wallpapers, a biometric app-lock, and a real
Node.js/Express backend behind it — fully responsive across mobile,
tablet, and desktop.

## Project layout

```
araamusic/
├── src/            React + Vite frontend
├── server/         Node.js + Express backend (its own package.json)
└── package.json    Frontend package.json (root)
```

## Getting started

You need **two terminals** — one for the API, one for the app.

**Terminal 1 — backend**
```bash
cd server
npm install
npm start
```
This starts the API at `http://localhost:5000`. It stores data as JSON
files under `server/data/` (created automatically on first run) — no
external database needed.

**Terminal 2 — frontend**
```bash
npm install
npm run dev
```
Then open the printed local URL (usually `http://localhost:5173`).

> Tip: from the project root you can also run `npm run server` instead of
> `cd server && npm start` (run `npm run server:install` once first).

The frontend talks to the API at `http://localhost:5000/api` by default.
To point it elsewhere, copy `.env.example` to `.env` and set
`VITE_API_URL`. Likewise `server/.env.example` → `server/.env` lets you
change the port or allowed CORS origin.

## What's inside

### Backend (`server/`)
- **Catalog** — songs, albums, playlists, artists, and search, all served
  from `GET /api/catalog/*` and `/api/search`.
- **Cover art** — `GET /api/covers/:seed.svg` generates a gradient SVG
  cover on the fly, entirely locally (this replaced external
  `picsum.photos` calls, which were the main cause of a slow first load —
  each one is now a same-origin, cached, instant response).
- **Auth** — `POST /api/auth/register`, `/login`, `/logout`, `GET/PATCH
  /api/auth/me`. Passwords are hashed with Node's built-in `crypto.scrypt`
  (no native dependencies). Sessions are bearer tokens.
- **Per-user data** (all require the `Authorization: Bearer <token>`
  header set automatically by the frontend once signed in):
  - `GET/POST/DELETE /api/me/likes` — liked songs
  - `GET/POST/DELETE /api/me/history` — recently played
  - `GET/POST/PATCH/DELETE /api/me/playlists` — playlists you create, plus
    `POST/DELETE /api/me/playlists/:id/songs/:songId` to manage tracks
  - `GET/PUT /api/me/settings` — theme, wallpaper, playback preferences

  Data persists as flat JSON files in `server/data/` — swap `server/src/db.js`
  for a real database whenever you're ready.

### Frontend (`src/`)
- **Home / Search / Library / Likes / History** — browse, discover, and
  revisit music, all backed by live API calls.
- **Full player** — mini bar, expandable now-playing screen, queue panel,
  shuffle/repeat, like, volume, real HTML5 audio playback.
- **Guest mode** — if you're not signed in, likes/history/playlists are
  saved to `localStorage` on your device instead, so the app still works
  fully without an account. Signing in switches those functions over to
  the backend and syncs across devices.
- **Settings** — theme (6 built-in palettes), wallpaper (presets or your
  own image), biometric-style app lock, playback quality, autoplay,
  crossfade, notifications, language — all synced to the backend once
  signed in.

## Performance notes

The previous slowdown came from ~90 external `picsum.photos` image
requests firing on page load (each one redirects, doubling the round
trips) plus loading 9 separate Google Fonts weight files. This version
fixes both: covers are generated locally by the backend, and the font
request now only pulls the weights actually used in the UI.

## Notes

- Audio files are still demo tracks hosted at soundhelix.com (used
  widely for prototyping); swap `server/src/data/seed.js`'s `audio()`
  helper for your own CDN/storage URLs in production.
- The biometric lock is a UI simulation. Wiring it to real WebAuthn /
  platform biometrics requires a proper registration/verification flow.
- CORS is restricted to `http://localhost:5173` by default — update
  `CORS_ORIGIN` in `server/.env` if you deploy the frontend elsewhere.

## Project structure

```
src/
├── components/
│   ├── layout/      Sidebar, MobileNav, Header, MainLayout
│   ├── player/       Player, MiniPlayer, FullPlayer, controls, queue, volume
│   ├── music/        SongCard, SongRow, SongMenu, MusicShelf, AlbumCard
│   ├── playlist/      PlaylistCard, PlaylistView, CreatePlaylist
│   └── common/        Modal, Loader, EmptyState, Toggle, ToastHost, LockScreen
├── context/           APIContext, PlayerContext, SettingsContext
├── pages/             Home, Search, Library, History, Likes, Playlist,
│                       Album, Login, Register, Profile, Settings
├── hooks/             usePlayer, useAuth, useDebounce
├── lib/               api.js (fetch client)
├── utils/             format.js, toast.js
├── App.jsx, main.jsx, index.css

server/
├── index.js           Entrypoint
├── src/
│   ├── app.js          Express app + route wiring
│   ├── db.js            JSON-file persistence
│   ├── auth.js           Password hashing / tokens
│   ├── middleware/auth.js
│   ├── data/seed.js       Catalog data
│   ├── utils/covers.js     SVG cover generator
│   └── routes/             catalog, covers, auth, likes, history, playlists, settings
```
