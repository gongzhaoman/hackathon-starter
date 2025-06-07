import { Hono } from 'hono'

const health = new Hono()

health.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'hono',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  })
})

// health.get('/ready', (c) => {
//   // 检查数据库连接、外部服务等
//   return c.json({
//     status: 'ready',
//     checks: {
//       database: 'ok',
//       // 其他检查...
//     }
//   })
// })

export default health