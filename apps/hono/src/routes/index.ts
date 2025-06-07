import { Hono } from 'hono'
import healthRoutes from './health'

const routes = new Hono()

// 健康检查
routes.route('/health', healthRoutes)


export default routes