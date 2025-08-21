import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Workflow, Plus, ExternalLink, Check, GitBranch, Play, Settings } from 'lucide-react'
import { useWorkflows, useCreateWorkflow, useGenerateDsl } from '../../services/workflow.service'
import type { CreateAgentDto, Workflow as WorkflowType, CreateWorkflowDto } from '../../types'

interface WorkflowStepProps {
  formData: CreateAgentDto & { workflows?: string[] }
  setFormData: (data: any) => void
}

interface CreateWorkflowDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: (workflow: WorkflowType) => void
}

function CreateWorkflowDialog({ open, onClose, onSuccess }: CreateWorkflowDialogProps) {
  const [createMode, setCreateMode] = useState<'natural' | 'manual'>('natural')
  const [naturalInput, setNaturalInput] = useState('')
  const [formData, setFormData] = useState<CreateWorkflowDto>({
    name: '',
    description: '',
    dsl: null
  })
  const [generatedDsl, setGeneratedDsl] = useState<any>(null)
  
  const createWorkflowMutation = useCreateWorkflow()
  const generateDslMutation = useGenerateDsl()

  const handleGenerateDsl = async () => {
    if (!naturalInput.trim()) return

    try {
      const response = await generateDslMutation.mutateAsync({
        userMessage: naturalInput
      })
      
      setGeneratedDsl(response.dsl.data)
      setFormData({
        name: response.dsl.data.name || '',
        description: response.dsl.data.description || '',
        dsl: response.dsl.data
      })
    } catch (error) {
      console.error('Failed to generate DSL:', error)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.dsl) return

    try {
      const newWorkflow = await createWorkflowMutation.mutateAsync(formData)
      onSuccess(newWorkflow)
      
      // Reset form
      setNaturalInput('')
      setFormData({ name: '', description: '', dsl: null })
      setGeneratedDsl(null)
      setCreateMode('natural')
      onClose()
    } catch (error) {
      console.error('Failed to create workflow:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>创建工作流</DialogTitle>
          <DialogDescription>
            创建一个新的工作流作为智能体的工具
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Creation Mode Selection */}
            <div className="flex gap-4">
              <Button
                variant={createMode === 'natural' ? 'default' : 'outline'}
                onClick={() => setCreateMode('natural')}
                className="flex-1"
              >
                自然语言创建
              </Button>
              <Button
                variant={createMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setCreateMode('manual')}
                className="flex-1"
              >
                手动创建
              </Button>
            </div>

            {createMode === 'natural' ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="natural-input">描述您的工作流需求</Label>
                  <Textarea
                    id="natural-input"
                    value={naturalInput}
                    onChange={(e) => setNaturalInput(e.target.value)}
                    placeholder="例如：创建一个客户服务工作流，当用户提出问题时，首先搜索知识库，如果找不到答案就转发给人工客服..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleGenerateDsl}
                  disabled={generateDslMutation.isPending || !naturalInput.trim()}
                  className="w-full"
                >
                  {generateDslMutation.isPending ? '生成中...' : '生成工作流'}
                </Button>

                {generatedDsl && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="generated-name">工作流名称</Label>
                      <Input
                        id="generated-name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="generated-desc">描述</Label>
                      <Input
                        id="generated-desc"
                        value={formData.description || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>生成的工作流结构预览</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(generatedDsl, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="manual-name">工作流名称 *</Label>
                  <Input
                    id="manual-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="输入工作流名称"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="manual-desc">描述</Label>
                  <Input
                    id="manual-desc"
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="简单描述工作流用途"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="manual-dsl">工作流DSL配置</Label>
                  <Textarea
                    id="manual-dsl"
                    value={formData.dsl ? JSON.stringify(formData.dsl, null, 2) : ''}
                    onChange={(e) => {
                      try {
                        const dsl = JSON.parse(e.target.value)
                        setFormData(prev => ({ ...prev, dsl }))
                      } catch {
                        // Invalid JSON, keep the string for user to edit
                      }
                    }}
                    placeholder="输入工作流DSL配置（JSON格式）"
                    rows={8}
                    className="mt-1 font-mono text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={createWorkflowMutation.isPending}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createWorkflowMutation.isPending || !formData.name.trim() || !formData.dsl}
          >
            {createWorkflowMutation.isPending ? '创建中...' : '创建工作流'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function WorkflowStep({ formData, setFormData }: WorkflowStepProps) {
  const { data: workflows = [], isLoading } = useWorkflows()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  
  const selectedWorkflows = formData.workflows || []

  const isWorkflowSelected = (workflowId: string) => {
    return selectedWorkflows.includes(workflowId)
  }

  const handleToggleWorkflow = (workflowId: string) => {
    setFormData((prev: any) => {
      const currentWorkflows = prev.workflows || []
      const newWorkflows = isWorkflowSelected(workflowId)
        ? currentWorkflows.filter((id: string) => id !== workflowId)
        : [...currentWorkflows, workflowId]
      
      return {
        ...prev,
        workflows: newWorkflows
      }
    })
  }

  const handleNewWorkflowCreated = (newWorkflow: WorkflowType) => {
    // Automatically add the newly created workflow
    setFormData((prev: any) => ({
      ...prev,
      workflows: [...(prev.workflows || []), newWorkflow.id]
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="w-5 h-5" />
                工作流工具
              </CardTitle>
              <CardDescription>
                将工作流作为工具添加到智能体，实现复杂的业务逻辑处理
              </CardDescription>
            </div>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              创建工作流
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Selected Workflows */}
      {selectedWorkflows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              已添加的工作流
            </CardTitle>
            <CardDescription>
              这些工作流将作为工具提供给智能体使用
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedWorkflows.map(workflowId => {
                const workflow = workflows.find((w: WorkflowType) => w.id === workflowId)
                if (!workflow) return null

                return (
                  <div key={workflow.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{workflow.name}</h4>
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">已添加</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {workflow.description || '暂无描述'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Link
                        to={`/workflows/${workflow.id}`}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        查看详情
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleWorkflow(workflow.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        移除
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Workflows */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            可用工作流
          </CardTitle>
          <CardDescription>
            选择现有的工作流或创建新的工作流作为智能体工具
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workflows.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {workflows.map((workflow: WorkflowType) => {
                const isSelected = isWorkflowSelected(workflow.id)

                return (
                  <Card
                    key={workflow.id}
                    className={`transition-all hover:shadow-md ${
                      isSelected ? 'border-green-500 bg-green-50' : 'hover:border-primary'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{workflow.name}</h4>
                            {isSelected && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                <Check className="w-3 h-3 mr-1" />
                                已添加
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {workflow.description || '暂无描述'}
                          </p>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              <Settings className="w-3 h-3 mr-1" />
                              DSL工作流
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Play className="w-3 h-3 mr-1" />
                              可执行
                            </Badge>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            创建时间：{new Date(workflow.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Link
                            to={`/workflows`}
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            管理
                          </Link>
                          <Button
                            size="sm"
                            variant={isSelected ? "outline" : "default"}
                            onClick={() => handleToggleWorkflow(workflow.id)}
                            className={isSelected ? "text-red-500 hover:text-red-700" : ""}
                          >
                            {isSelected ? '移除' : '添加'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Workflow className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">暂无工作流</h3>
              <p className="text-muted-foreground mb-4">
                创建您的第一个工作流，为智能体提供复杂的业务逻辑处理能力
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                创建工作流
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              💡
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">工作流使用提示</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 工作流将作为工具集成到智能体中，智能体可以在对话中调用工作流</li>
                <li>• 工作流适合处理复杂的多步骤业务逻辑</li>
                <li>• 可以通过自然语言描述自动生成工作流DSL</li>
                <li>• 工作流可以包含条件判断、循环、API调用等复杂逻辑</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Workflow Dialog */}
      <CreateWorkflowDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleNewWorkflowCreated}
      />
    </div>
  )
}