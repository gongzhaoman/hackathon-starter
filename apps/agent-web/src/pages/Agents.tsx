import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import { useAgents, useCreateAgent, useDeleteAgent } from '../services/agent.service'
import { useToolkits } from '../services/toolkit.service'
import type { CreateAgentDto } from '../types'

export function Agents() {
  const { data: agents = [], isLoading: agentsLoading } = useAgents()
  const { data: toolkits = [], isLoading: toolkitsLoading } = useToolkits()
  const createAgentMutation = useCreateAgent()
  const deleteAgentMutation = useDeleteAgent()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState<CreateAgentDto>({
    name: '',
    description: '',
    prompt: '',
    options: {},
    toolkits: []
  })

  const loading = agentsLoading || toolkitsLoading

  const handleCreate = async () => {
    if (!formData.name || !formData.prompt) return

    try {
      await createAgentMutation.mutateAsync(formData)
      setCreateDialogOpen(false)
      setFormData({
        name: '',
        description: '',
        prompt: '',
        options: {},
        toolkits: []
      })
    } catch (error) {
      console.error('Failed to create agent:', error)
    }
  }

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

  if (loading) {
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

      {/* Create Agent Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>创建智能体</DialogTitle>
            <DialogDescription>
              配置您的AI智能体的基本信息和能力
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入智能体名称"
              />
            </div>

            <div>
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="输入智能体描述"
              />
            </div>

            <div>
              <Label htmlFor="prompt">系统提示词 *</Label>
              <Textarea
                id="prompt"
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                placeholder="输入智能体的系统提示词，定义其行为和能力"
                rows={6}
              />
            </div>

            <div>
              <Label>工具包选择</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {toolkits.map((toolkit) => (
                  <div key={toolkit.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`toolkit-${toolkit.id}`}
                      checked={formData.toolkits?.some((t: any) => t.toolkitId === toolkit.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            toolkits: [...(formData.toolkits || []), { toolkitId: toolkit.id }]
                          })
                        } else {
                          setFormData({
                            ...formData,
                            toolkits: formData.toolkits?.filter((t: any) => t.toolkitId !== toolkit.id) || []
                          })
                        }
                      }}
                    />
                    <Label htmlFor={`toolkit-${toolkit.id}`} className="text-sm">
                      {toolkit.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={createAgentMutation.isPending}
              >
                取消
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createAgentMutation.isPending || !formData.name || !formData.prompt}
              >
                {createAgentMutation.isPending ? '创建中...' : '创建'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
