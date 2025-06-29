import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { useDashboardStats } from '../services/stats.service'
import { useAgents } from '../services/agent.service'
import { useWorkflows } from '../services/workflow.service'

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: agents = [], isLoading: agentsLoading } = useAgents()
  const { data: workflows = [], isLoading: workflowsLoading } = useWorkflows()

  const recentAgents = agents.slice(0, 3)
  const recentWorkflows = workflows.slice(0, 3)
  const loading = statsLoading || agentsLoading || workflowsLoading

  // 默认统计数据
  const defaultStats = { agents: 0, toolkits: 0, workflows: 0, tools: 0 }
  const displayStats = stats || defaultStats

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">欢迎使用智能体设计平台</h1>
        <p className="text-blue-100">
          创建、管理和部署您的AI智能体，构建强大的自动化工作流
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">智能体</CardTitle>
            <span className="text-2xl">🤖</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayStats.agents}</div>
            <p className="text-xs text-muted-foreground">
              已创建的智能体数量
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">工具包</CardTitle>
            <span className="text-2xl">🛠️</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayStats.toolkits}</div>
            <p className="text-xs text-muted-foreground">
              可用的工具包数量
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">工具</CardTitle>
            <span className="text-2xl">⚙️</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayStats.tools}</div>
            <p className="text-xs text-muted-foreground">
              可用的工具总数
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">工作流</CardTitle>
            <span className="text-2xl">⚡</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayStats.workflows}</div>
            <p className="text-xs text-muted-foreground">
              已创建的工作流数量
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
          <CardDescription>
            快速开始创建和管理您的AI资源
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/agents">
              <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <span className="text-2xl">🤖</span>
                <span>创建智能体</span>
              </Button>
            </Link>
            <Link to="/workflows">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <span className="text-2xl">⚡</span>
                <span>创建工作流</span>
              </Button>
            </Link>
            <Link to="/toolkits">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                <span className="text-2xl">🛠️</span>
                <span>查看工具包</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Agents */}
        <Card>
          <CardHeader>
            <CardTitle>最近的智能体</CardTitle>
            <CardDescription>
              您最近创建的智能体
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentAgents.length > 0 ? (
              <div className="space-y-3">
                {recentAgents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{agent.name}</h4>
                      <p className="text-sm text-muted-foreground">{agent.description}</p>
                    </div>
                    <Link to={`/agents/${agent.id}/chat`}>
                      <Button size="sm">对话</Button>
                    </Link>
                  </div>
                ))}
                <Link to="/agents">
                  <Button variant="outline" className="w-full">查看全部</Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">暂无智能体</p>
                <Link to="/agents">
                  <Button className="mt-2">创建第一个智能体</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Workflows */}
        <Card>
          <CardHeader>
            <CardTitle>最近的工作流</CardTitle>
            <CardDescription>
              您最近创建的工作流
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentWorkflows.length > 0 ? (
              <div className="space-y-3">
                {recentWorkflows.map((workflow) => (
                  <div key={workflow.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{workflow.name}</h4>
                      <p className="text-sm text-muted-foreground">{workflow.description}</p>
                    </div>
                    <Badge variant="secondary">工作流</Badge>
                  </div>
                ))}
                <Link to="/workflows">
                  <Button variant="outline" className="w-full">查看全部</Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">暂无工作流</p>
                <Link to="/workflows">
                  <Button className="mt-2">创建第一个工作流</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
