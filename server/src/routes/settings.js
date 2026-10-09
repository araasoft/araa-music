import { Router } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  const settings = db.settings
  res.json(settings[req.user.id] || null)
})

router.put('/', (req, res) => {
  const settings = db.settings
  settings[req.user.id] = { ...(settings[req.user.id] || {}), ...(req.body || {}) }
  db.settings = settings
  res.json(settings[req.user.id])
})

export default router
