import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { useWorkflows, useCreateWorkflow, useDeleteWorkflow, useGenerateDsl, useExecuteWorkflow } from '../services/workflow.service'
import type { Workflow, CreateWorkflowDto } from '../types'

export function Workflows() {
  const { data: workflows = [], isLoading: loading } = useWorkflows()
  const createWorkflowMutation = useCreateWorkflow()
  const deleteWorkflowMutation = useDeleteWorkflow()
  const generateDslMutation = useGenerateDsl()
  const executeWorkflowMutation = useExecuteWorkflow()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)

  // Create workflow form
  const [createMode, setCreateMode] = useState<'natural' | 'manual'>('natural')
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('')
  const [generatedDsl, setGeneratedDsl] = useState<any>(null)
  const [formData, setFormData] = useState<CreateWorkflowDto>({
    name: '',
    description: '',
    dsl: null
  })

  // Execute workflow form
  const [executeInput, setExecuteInput] = useState('')
  const [executeResult, setExecuteResult] = useState<any>(null)

  const generateDslFromNaturalLanguage = async () => {
    if (!naturalLanguageInput.trim()) return

    try {
      const response = await generateDslMutation.mutateAsync({
        description: naturalLanguageInput
      })

      setGeneratedDsl(response.dsl.data)
      setFormData({
        name: response.dsl.data.name || '',
        description: response.dsl.data.description || '',
        dsl: response.dsl.data
      })
    } catch (error) {
      console.error('Failed to generate DSL:', error)
      alert('生成工作流失败，请检查输入或稍后重试')
    }
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.dsl) return

    try {
      await createWorkflowMutation.mutateAsync(formData)
      setCreateDialogOpen(false)
      resetCreateForm()
    } catch (error) {
      console.error('Failed to create workflow:', error)
      alert('创建工作流失败，请检查配置')
    }
  }

  const handleExecute = async () => {
    if (!selectedWorkflow || !executeInput.trim()) return

    try {
      let input
      try {
        input = JSON.parse(executeInput)
      } catch {
        input = { input: executeInput }
      }

      const result = await executeWorkflowMutation.mutateAsync({
        id: selectedWorkflow.id,
        data: {
          input,
          context: {}
        }
      })

      setExecuteResult(result)
    } catch (error) {
      console.error('Failed to execute workflow:', error)
      setExecuteResult({ error: '执行失败: ' + (error as Error).message })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个工作流吗？')) return

    try {
      await deleteWorkflowMutation.mutateAsync(id)
    } catch (error) {
      console.error('Failed to delete workflow:', error)
    }
  }

  const resetCreateForm = () => {
    setNaturalLanguageInput('')
    setGeneratedDsl(null)
    setFormData({ name: '', description: '', dsl: null })
    setCreateMode('natural')
  }

  const openExecuteDialog = (workflow: Workflow) => {
    setSelectedWorkflow(workflow)
    setExecuteInput('')
    setExecuteResult(null)
    setExecuteDialogOpen(true)
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
          <h1 className="text-3xl font-bold">工作流管理</h1>
          <p className="text-muted-foreground">创建和管理AI工作流，实现复杂的自动化任务</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          创建工作流
        </Button>
      </div>

      {/* Workflows Grid */}
      {workflows.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {workflows.map((workflow) => (
            <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    ⚡ {workflow.name}
                  </CardTitle>
                  <Badge variant="secondary">工作流</Badge>
                </div>
                <CardDescription>
                  {workflow.description || '暂无描述'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* DSL Preview */}
                  <div>
                    <h4 className="font-medium mb-2">工作流配置:</h4>
                    <div className="text-xs bg-muted p-3 rounded font-mono max-h-32 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(workflow.DSL, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      size="sm"
                      onClick={() => openExecuteDialog(workflow)}
                    >
                      执行工作流
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(workflow.id)}
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
            <div className="text-6xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold mb-2">暂无工作流</h3>
            <p className="text-muted-foreground mb-4">创建您的第一个工作流开始自动化</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              创建工作流
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Workflow Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open)
        if (!open) resetCreateForm()
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建工作流</DialogTitle>
            <DialogDescription>
              使用自然语言描述或手动配置创建AI工作流
            </DialogDescription>
          </DialogHeader>

          <Tabs value={createMode} onValueChange={(value) => setCreateMode(value as 'natural' | 'manual')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="natural">自然语言创建</TabsTrigger>
              <TabsTrigger value="manual">手动配置</TabsTrigger>
            </TabsList>

            <TabsContent value="natural" className="space-y-4">
              <div>
                <Label htmlFor="natural-input">描述您想要的工作流</Label>
                <Textarea
                  id="natural-input"
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  placeholder="例如：创建一个客户服务工作流，能够自动分类客户问题并生成回复"
                  rows={4}
                />
              </div>

              <Button
                onClick={generateDslFromNaturalLanguage}
                disabled={!naturalLanguageInput.trim() || generateDslMutation.isPending}
                className="w-full"
              >
                {generateDslMutation.isPending ? '生成中...' : '生成工作流'}
              </Button>

              {generatedDsl && (
                <div className="space-y-4">
                  <div>
                    <Label>生成的工作流配置</Label>
                    <div className="text-xs bg-muted p-3 rounded font-mono max-h-64 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(generatedDsl, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="generated-name">工作流名称</Label>
                      <Input
                        id="generated-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="generated-description">描述</Label>
                      <Input
                        id="generated-description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="manual-name">工作流名称</Label>
                  <Input
                    id="manual-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入工作流名称"
                  />
                </div>
                <div>
                  <Label htmlFor="manual-description">描述</Label>
                  <Input
                    id="manual-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="输入工作流描述"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="manual-dsl">DSL配置 (JSON格式)</Label>
                <Textarea
                  id="manual-dsl"
                  value={formData.dsl ? JSON.stringify(formData.dsl, null, 2) : ''}
                  onChange={(e) => {
                    try {
                      const dsl = JSON.parse(e.target.value)
                      setFormData({ ...formData, dsl })
                    } catch {
                      // Invalid JSON, keep the text for editing
                    }
                  }}
                  placeholder="输入工作流DSL配置"
                  rows={12}
                  className="font-mono text-xs"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={createWorkflowMutation.isPending}
            >
              取消
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createWorkflowMutation.isPending || !formData.name || !formData.dsl}
            >
              {createWorkflowMutation.isPending ? '创建中...' : '创建工作流'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Execute Workflow Dialog */}
      <Dialog open={executeDialogOpen} onOpenChange={setExecuteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>执行工作流</DialogTitle>
            <DialogDescription>
              {selectedWorkflow?.name} - 输入执行参数并查看结果
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="execute-input">输入参数 (JSON格式或纯文本)</Label>
              <Textarea
                id="execute-input"
                value={executeInput}
                onChange={(e) => setExecuteInput(e.target.value)}
                placeholder='例如: {"message": "你好"} 或直接输入文本'
                rows={4}
              />
            </div>

            {executeResult && (
              <div>
                <Label>执行结果</Label>
                <div className="text-sm bg-muted p-3 rounded font-mono max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(executeResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setExecuteDialogOpen(false)}
                disabled={executeWorkflowMutation.isPending}
              >
                关闭
              </Button>
              <Button
                onClick={handleExecute}
                disabled={executeWorkflowMutation.isPending || !executeInput.trim()}
              >
                {executeWorkflowMutation.isPending ? '执行中...' : '执行'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
