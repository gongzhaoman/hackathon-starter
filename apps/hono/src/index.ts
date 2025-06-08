import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'

import routes from './routes'

const app = new Hono()

// 全局中间件
app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
}))

// 根路径
app.get('/', (c) => {
  return c.json({
    message: 'Hono API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api/v1'
    }
  })
})

// 挂载所有路由
app.route('/', routes)

// 404 处理
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.url }, 404)
})

// 错误处理
app.onError((err, c) => {
  console.error('Error:', err)
  return c.json({
    error: 'Internal Server Error',
    message: err.message
  }, 500)
})

const port = Number(process.env.PORT) || 3002
const host = process.env.HOST || '0.0.0.0'

console.log(`🚀 Hono Server running on http://${host}:${port}`)

serve({
  fetch: app.fetch,
  port,
  hostname: host
})