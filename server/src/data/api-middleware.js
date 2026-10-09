import { formatError } from './pagination-utils.js'

/**
 * Validate pagination query parameters
 */
export const paginationValidator = (req, res, next) => {
  const { page, limit } = req.query
  
  if (page && isNaN(parseInt(page))) {
    return res.status(400).json(formatError('Invalid page parameter', 400, {
      field: 'page',
      value: page,
      expected: 'positive integer'
    }))
  }
  
  if (limit && isNaN(parseInt(limit))) {
    return res.status(400).json(formatError('Invalid limit parameter', 400, {
      field: 'limit',
      value: limit,
      expected: 'positive integer'
    }))
  }
  
  next()
}

/**
 * Validate search query parameter
 */
export const searchValidator = (req, res, next) => {
  const { q } = req.query
  
  if (!q || q.trim() === '') {
    return res.status(400).json(formatError(
      'Search query is required',
      400,
      { parameter: 'q', example: '?q=song+name' }
    ))
  }
  
  if (q.length > 100) {
    return res.status(400).json(formatError(
      'Search query is too long',
      400,
      { maxLength: 100, provided: q.length }
    ))
  }
  
  next()
}

/**
 * Validate resource ID parameter
 */
export const idValidator = (req, res, next) => {
  const { id } = req.params
  
  if (!id || id.trim() === '') {
    return res.status(400).json(formatError('Resource ID is required', 400))
  }
  
  next()
}

/**
 * Global error handler
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err)
  
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal server error'
  
  res.status(statusCode).json(formatError(message, statusCode))
}

/**
 * Not found handler
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json(formatError(
    'Resource not found',
    404,
    { path: req.path, method: req.method }
  ))
}

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`)
  })
  
  next()
}

/**
 * Rate limiting middleware (basic, use Redis in production)
 */
export const createRateLimiter = (windowMs = 60000, maxRequests = 100) => {
  const requests = new Map()
  
  return (req, res, next) => {
    const key = req.ip
    const now = Date.now()
    
    if (!requests.has(key)) {
      requests.set(key, [])
    }
    
    const userRequests = requests.get(key).filter(time => now - time < windowMs)
    
    if (userRequests.length >= maxRequests) {
      return res.status(429).json(formatError(
        'Too many requests',
        429,
        { retryAfter: Math.ceil((Math.min(...userRequests) + windowMs - now) / 1000) }
      ))
    }
    
    userRequests.push(now)
    requests.set(key, userRequests)
    next()
  }
}

/**
 * CORS middleware
 */
export const corsMiddleware = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  
  next()
}

/**
 * Cache control headers
 */
export const cacheControl = (maxAge = 300) => {
  return (req, res, next) => {
    res.header('Cache-Control', `public, max-age=${maxAge}`)
    next()
  }
}
