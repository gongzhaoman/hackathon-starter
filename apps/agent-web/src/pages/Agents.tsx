import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { useAgents, useDeleteAgent } from '../services/agent.service'
import { AgentCreationWizard } from '../components/AgentCreationWizard'

export function Agents() {
  const { data: agents = [], isLoading: agentsLoading } = useAgents()
  const deleteAgentMutation = useDeleteAgent()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个智能体吗？')) return

    try {
      console.log('开始删除智能体:', id)
      await deleteAgentMutation.mutateAsync(id)
      console.log('删除智能体成功:', id)
    } catch (error) {
      console.error('删除智能体失败:', error)
      alert('删除失败: ' + (error as Error).message)
    }
  }

  if (agentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">智能体管理</h1>
          <p className="text-muted-foreground">创建和管理您的AI智能体</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          创建智能体
        </Button>
      </div>

      {/* Agents Grid */}
      {agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                  <Badge variant="secondary">🤖</Badge>
                </div>
                <CardDescription>
                  {agent.description || '暂无描述'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">提示词预览:</p>
                    <p className="text-sm bg-muted p-2 rounded text-ellipsis overflow-hidden">
                      {agent.prompt.length > 100
                        ? `${agent.prompt.substring(0, 100)}...`
                        : agent.prompt
                      }
                    </p>
                  </div>

                  {agent.agentToolkits && agent.agentToolkits.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">工具包:</p>
                      <div className="flex flex-wrap gap-1">
                        {agent.agentToolkits.map((at: any) => (
                          <Badge key={at.id} variant="outline" className="text-xs">
                            {at.toolkit.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {agent.agentKnowledgeBases && agent.agentKnowledgeBases.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">知识库:</p>
                      <div className="flex flex-wrap gap-1">
                        {agent.agentKnowledgeBases.map((akb: any) => (
                          <Badge key={akb.id} variant="secondary" className="text-xs">
                            {akb.knowledgeBase.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link to={`/agents/${agent.id}/chat`} className="flex-1">
                      <Button className="w-full" size="sm">
                        对话测试
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(agent.id)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold mb-2">暂无智能体</h3>
            <p className="text-muted-foreground mb-4">创建您的第一个智能体开始使用</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              创建智能体
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Agent Creation Wizard */}
      <AgentCreationWizard
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </div>
  )
}
