import { api } from './api.js'

const BATCH_SIZE = 20
// In-memory only — cleared on full page reload, kept when navigating back/away. Fast+low-data.
const cache = new Map()

function keyFor(id, isCustom) {
  return `${isCustom ? 'me' : 'catalog'}:${id}`
}

async function fetchPage(id, page, isCustom) {
  if (isCustom) {
    const [songsRes, meta] = await Promise.all([
      api.get(`/me/playlists/${id}/songs?page=${page}&limit=${BATCH_SIZE}`),
      page === 1 ? api.get(`/me/playlists/${id}`).catch(() => null) : Promise.resolve(null),
    ])
    return { songs: songsRes.data, pagination: songsRes.pagination, meta }
  }
  const res = await api.get(`/catalog/playlists/${id}?page=${page}&limit=${BATCH_SIZE}`, { auth: false })
  return { songs: res.data.songs, pagination: res.pagination, meta: res.data }
}

export function getCachedPlaylist(id, isCustom) {
  return cache.get(keyFor(id, isCustom)) || null
}

// Loads (or returns cached) first batch of 20 songs for a playlist.
export async function loadPlaylistBatch(id, isCustom) {
  const key = keyFor(id, isCustom)
  const existing = cache.get(key)
  if (existing) return existing
  const { songs, pagination, meta } = await fetchPage(id, 1, isCustom)
  const entry = { songs, page: 1, hasMore: pagination.hasNextPage, loadingMore: false, meta }
  cache.set(key, entry)
  return entry
}

// Fetches the next 20-song batch and appends it in place. Safe to call repeatedly (dedupes in-flight).
export async function loadNextBatch(id, isCustom) {
  const key = keyFor(id, isCustom)
  const entry = cache.get(key)
  if (!entry || !entry.hasMore || entry.loadingMore) return entry
  entry.loadingMore = true
  try {
    const nextPage = entry.page + 1
    const { songs, pagination } = await fetchPage(id, nextPage, isCustom)
    entry.songs = [...entry.songs, ...songs]
    entry.page = nextPage
    entry.hasMore = pagination.hasNextPage
    return entry
  } finally {
    entry.loadingMore = false
  }
}

// Called on full reload / explicit refresh only — keeps last batch otherwise.
export function invalidatePlaylist(id, isCustom) {
  cache.delete(keyFor(id, isCustom))
}
