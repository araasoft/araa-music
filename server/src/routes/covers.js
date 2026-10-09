import { Router } from 'express'
import { svgCover } from '../utils/covers.js'

const router = Router()

router.get('/:seed.svg', (req, res) => {
  const { seed } = req.params
  const label = String(req.query.label || seed)
  res.set('Content-Type', 'image/svg+xml')
  res.set('Cache-Control', 'public, max-age=31536000, immutable')
  res.send(svgCover(seed, label))
})

export default router
