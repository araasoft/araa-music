const PALETTES = [
  ['#a463ff', '#ff6fc7'],
  ['#28d3c5', '#3fa9f5'],
  ['#ff8a4c', '#ff4d6d'],
  ['#ff6fa5', '#c893ff'],
  ['#3fb0ff', '#3ff0c7'],
  ['#7c4dff', '#ff5fa8'],
  ['#f5576c', '#f093fb'],
  ['#4facfe', '#00f2fe'],
]

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function paletteFor(seed) {
  const hash = hashString(String(seed))
  return PALETTES[hash % PALETTES.length]
}

export function svgCover(seed, label = '') {
  const [a, b] = paletteFor(seed)
  const hash = hashString(String(seed))
  const angle = hash % 360
  const initial = (label || String(seed)).trim().charAt(0).toUpperCase() || '♪'

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="g" gradientTransform="rotate(${angle})">
      <stop offset="0%" stop-color="${a}" />
      <stop offset="100%" stop-color="${b}" />
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#g)" />
  <circle cx="${100 + (hash % 120)}" cy="${80 + (hash % 90)}" r="120" fill="rgba(255,255,255,0.08)" />
  <circle cx="${300 - (hash % 100)}" cy="${320 - (hash % 80)}" r="90" fill="rgba(0,0,0,0.08)" />
  <text x="200" y="230" font-family="Sora, sans-serif" font-size="150" font-weight="700"
    text-anchor="middle" fill="rgba(255,255,255,0.85)">${initial}</text>
</svg>`
}
