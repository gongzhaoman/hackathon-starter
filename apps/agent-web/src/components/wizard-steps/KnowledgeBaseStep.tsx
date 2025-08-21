import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog'
import { Database, Plus, ExternalLink, FileText, Check, BookOpen } from 'lucide-react'
import { useKnowledgeBases, useCreateKnowledgeBase } from '../../services/knowledge-base.service'
import type { CreateAgentDto, KnowledgeBase, CreateKnowledgeBaseDto } from '../../types'

interface KnowledgeBaseStepProps {
  formData: CreateAgentDto
  setFormData: (data: CreateAgentDto | ((prev: CreateAgentDto) => CreateAgentDto)) => void
}

interface CreateKnowledgeBaseDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: (kb: KnowledgeBase) => void
}

function CreateKnowledgeBaseDialog({ open, onClose, onSuccess }: CreateKnowledgeBaseDialogProps) {
  const [formData, setFormData] = useState<CreateKnowledgeBaseDto>({
    name: '',
    description: ''
  })
  const createKbMutation = useCreateKnowledgeBase()

  const handleSubmit = async () => {
    if (!formData.name.trim()) return

    try {
      const newKb = await createKbMutation.mutateAsync(formData)
      onSuccess(newKb)
      setFormData({ name: '', description: '' })
      onClose()
    } catch (error) {
      console.error('Failed to create knowledge base:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>创建新知识库</DialogTitle>
          <DialogDescription>
            创建一个新的知识库来存储专业知识和文档
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="kb-name">知识库名称 *</Label>
            <Input
              id="kb-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="输入知识库名称"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="kb-description">描述</Label>
            <Input
              id="kb-description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="简单描述知识库用途"
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={createKbMutation.isPending}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createKbMutation.isPending || !formData.name.trim()}
          >
            {createKbMutation.isPending ? '创建中...' : '创建知识库'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function KnowledgeBaseStep({ formData, setFormData }: KnowledgeBaseStepProps) {
  const { data: knowledgeBases = [], isLoading } = useKnowledgeBases()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  
  const selectedKbIds = formData.knowledgeBases || []

  const isKnowledgeBaseSelected = (kbId: string) => {
    return selectedKbIds.includes(kbId)
  }

  const handleToggleKnowledgeBase = (kbId: string) => {
    setFormData(prev => {
      const currentIds = prev.knowledgeBases || []
      const newIds = isKnowledgeBaseSelected(kbId)
        ? currentIds.filter(id => id !== kbId)
        : [...currentIds, kbId]
      
      return {
        ...prev,
        knowledgeBases: newIds
      }
    })
  }

  const handleNewKnowledgeBaseCreated = (newKb: KnowledgeBase) => {
    // Automatically add the newly created knowledge base
    setFormData(prev => ({
      ...prev,
      knowledgeBases: [...(prev.knowledgeBases || []), newKb.id]
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
                <Database className="w-5 h-5" />
                知识库配置
              </CardTitle>
              <CardDescription>
                为智能体添加专业知识支持，提升回答的准确性和专业度
              </CardDescription>
            </div>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              创建知识库
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Selected Knowledge Bases */}
      {selectedKbIds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              已选择的知识库
            </CardTitle>
            <CardDescription>
              这些知识库将为您的智能体提供专业知识支持
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedKbIds.map(kbId => {
                const kb = knowledgeBases.find((k: KnowledgeBase) => k.id === kbId)
                if (!kb) return null

                return (
                  <div key={kb.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{kb.name}</h4>
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">已选择</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {kb.description || '暂无描述'}
                      </p>
                      {kb.files && kb.files.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            <FileText className="w-3 h-3 mr-1" />
                            {kb.files.filter((f: any) => f.status === 'COMPLETED').length} 个已处理文件
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            共 {kb.files.length} 个文件
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Link
                        to={`/knowledge-bases/${kb.id}`}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        查看详情
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleKnowledgeBase(kb.id)}
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

      {/* Available Knowledge Bases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            可用知识库
          </CardTitle>
          <CardDescription>
            选择现有的知识库或创建新的知识库
          </CardDescription>
        </CardHeader>
        <CardContent>
          {knowledgeBases.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {knowledgeBases.map((kb: KnowledgeBase) => {
                const isSelected = isKnowledgeBaseSelected(kb.id)
                const processedFilesCount = kb.files?.filter((f: any) => f.status === 'COMPLETED').length || 0
                const totalFilesCount = kb.files?.length || 0

                return (
                  <Card
                    key={kb.id}
                    className={`transition-all hover:shadow-md ${
                      isSelected ? 'border-green-500 bg-green-50' : 'hover:border-primary'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{kb.name}</h4>
                            {isSelected && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                <Check className="w-3 h-3 mr-1" />
                                已选择
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {kb.description || '暂无描述'}
                          </p>
                          
                          {/* Files Info */}
                          <div className="flex items-center gap-2 mb-2">
                            {totalFilesCount > 0 ? (
                              <>
                                <Badge variant="outline" className="text-xs">
                                  <FileText className="w-3 h-3 mr-1" />
                                  {processedFilesCount}/{totalFilesCount} 文件已处理
                                </Badge>
                                {processedFilesCount === 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    待处理
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <FileText className="w-3 h-3 mr-1" />
                                暂无文件
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            创建时间：{new Date(kb.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Link
                            to={`/knowledge-bases/${kb.id}`}
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            管理
                          </Link>
                          <Button
                            size="sm"
                            variant={isSelected ? "outline" : "default"}
                            onClick={() => handleToggleKnowledgeBase(kb.id)}
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
              <Database className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">暂无知识库</h3>
              <p className="text-muted-foreground mb-4">
                创建您的第一个知识库，为智能体提供专业知识支持
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                创建知识库
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
              <h4 className="font-medium text-blue-900 mb-1">知识库使用提示</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 知识库中的内容将用于增强智能体的专业知识</li>
                <li>• 建议上传与智能体功能相关的文档和资料</li>
                <li>• 文档需要完成处理后才能被智能体使用</li>
                <li>• 可以随时在知识库管理页面中添加更多文档</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Knowledge Base Dialog */}
      <CreateKnowledgeBaseDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleNewKnowledgeBaseCreated}
      />
    </div>
  )
}