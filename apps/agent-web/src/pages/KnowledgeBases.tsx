import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import { 
  useKnowledgeBases, 
  useCreateKnowledgeBase, 
  useDeleteKnowledgeBase,
  useUploadFileToKnowledgeBase,
  useTrainKnowledgeBaseFile,
  useDeleteKnowledgeBaseFile
} from '../services/knowledge-base.service'
import type { CreateKnowledgeBaseDto } from '../types'

export function KnowledgeBases() {
  const { data: knowledgeBases = [], isLoading } = useKnowledgeBases()
  const createKnowledgeBaseMutation = useCreateKnowledgeBase()
  const deleteKnowledgeBaseMutation = useDeleteKnowledgeBase()
  const uploadFileMutation = useUploadFileToKnowledgeBase()
  const trainFileMutation = useTrainKnowledgeBaseFile()
  const deleteFileMutation = useDeleteKnowledgeBaseFile()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState<CreateKnowledgeBaseDto>({
    name: '',
    description: ''
  })

  const handleCreate = async () => {
    if (!formData.name) return

    try {
      await createKnowledgeBaseMutation.mutateAsync(formData)
      setCreateDialogOpen(false)
      setFormData({
        name: '',
        description: ''
      })
    } catch (error) {
      console.error('Failed to create knowledge base:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个知识库吗？')) return

    try {
      await deleteKnowledgeBaseMutation.mutateAsync(id)
    } catch (error) {
      console.error('Failed to delete knowledge base:', error)
    }
  }

  const handleFileUpload = async (knowledgeBaseId: string, file: File) => {
    try {
      await uploadFileMutation.mutateAsync({ knowledgeBaseId, file })
    } catch (error) {
      console.error('Failed to upload file:', error)
    }
  }

  const handleTrainFile = async (knowledgeBaseId: string, fileId: string) => {
    try {
      await trainFileMutation.mutateAsync({ knowledgeBaseId, fileId })
    } catch (error) {
      console.error('Failed to train file:', error)
    }
  }

  const handleDeleteFile = async (knowledgeBaseId: string, fileId: string) => {
    if (!confirm('确定要删除这个文件吗？')) return

    try {
      await deleteFileMutation.mutateAsync({ knowledgeBaseId, fileId })
    } catch (error) {
      console.error('Failed to delete file:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">知识库</h1>
          <p className="text-muted-foreground">管理您的知识库和文档</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          创建知识库
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {knowledgeBases.map((kb) => (
          <Card key={kb.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{kb.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {kb.description || '暂无描述'}
                  </CardDescription>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(kb.id)}
                  disabled={deleteKnowledgeBaseMutation.isPending}
                >
                  删除
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">文件数量</span>
                  <Badge variant="secondary">
                    {kb.files?.length || 0} 个文件
                  </Badge>
                </div>

                {/* 文件上传 */}
                <div>
                  <Label htmlFor={`file-upload-${kb.id}`} className="text-sm font-medium">
                    上传文件
                  </Label>
                  <Input
                    id={`file-upload-${kb.id}`}
                    type="file"
                    className="mt-1"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleFileUpload(kb.id, file)
                      }
                    }}
                    disabled={uploadFileMutation.isPending}
                  />
                </div>

                {/* 文件列表 */}
                {kb.files && kb.files.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">文件列表</Label>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {kb.files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                          <div className="flex items-center space-x-2">
                            <span className="truncate">{file.name}</span>
                            <Badge 
                              variant={
                                file.status === 'COMPLETED' ? 'default' :
                                file.status === 'PROCESSING' ? 'secondary' :
                                file.status === 'FAILED' ? 'destructive' : 'outline'
                              }
                              className="text-xs"
                            >
                              {file.status}
                            </Badge>
                          </div>
                          <div className="flex space-x-1">
                            {file.status === 'PENDING' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTrainFile(kb.id, file.id)}
                                disabled={trainFileMutation.isPending}
                                className="h-6 px-2 text-xs"
                              >
                                训练
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteFile(kb.id, file.id)}
                              disabled={deleteFileMutation.isPending}
                              className="h-6 px-2 text-xs"
                            >
                              删除
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  创建时间: {new Date(kb.createdAt).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 创建知识库对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建知识库</DialogTitle>
            <DialogDescription>
              创建一个新的知识库来存储和管理文档
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入知识库名称"
              />
            </div>
            <div>
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="输入知识库描述（可选）"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                取消
              </Button>
              <Button 
                onClick={handleCreate}
                disabled={!formData.name || createKnowledgeBaseMutation.isPending}
              >
                {createKnowledgeBaseMutation.isPending ? '创建中...' : '创建'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
