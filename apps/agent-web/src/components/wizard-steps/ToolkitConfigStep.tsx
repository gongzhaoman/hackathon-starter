import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Wrench, Plus, Settings, Check, AlertCircle } from 'lucide-react'
import { useToolkits } from '../../services/toolkit.service'
import type { CreateAgentDto, ToolkitConfigDto, Toolkit } from '../../types'

interface ToolkitConfigStepProps {
  formData: CreateAgentDto & { workflows?: string[] }
  setFormData: (data: any) => void
}

interface ConfigurationDialogProps {
  toolkit: Toolkit
  open: boolean
  onClose: () => void
  onSave: (config: any) => void
  initialConfig?: any
}

function ConfigurationDialog({ toolkit, open, onClose, onSave, initialConfig }: ConfigurationDialogProps) {
  const [config, setConfig] = useState(initialConfig || {})
  
  const handleSave = () => {
    onSave(config)
    onClose()
  }

  const renderConfigField = (key: string, field: any) => {
    switch (field.type) {
      case 'string':
        return (
          <div key={key}>
            <Label htmlFor={key}>{field.title || key}</Label>
            <Input
              id={key}
              value={config[key] || ''}
              onChange={(e) => setConfig((prev: any) => ({ ...prev, [key]: e.target.value }))}
              placeholder={field.description}
              className="mt-1"
            />
            {field.description && (
              <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
            )}
          </div>
        )
      case 'textarea':
        return (
          <div key={key}>
            <Label htmlFor={key}>{field.title || key}</Label>
            <Textarea
              id={key}
              value={config[key] || ''}
              onChange={(e) => setConfig((prev: any) => ({ ...prev, [key]: e.target.value }))}
              placeholder={field.description}
              rows={3}
              className="mt-1"
            />
            {field.description && (
              <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
            )}
          </div>
        )
      case 'boolean':
        return (
          <div key={key} className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={key}
              checked={config[key] || false}
              onChange={(e) => setConfig((prev: any) => ({ ...prev, [key]: e.target.checked }))}
            />
            <Label htmlFor={key}>{field.title || key}</Label>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        )
      case 'select':
        return (
          <div key={key}>
            <Label htmlFor={key}>{field.title || key}</Label>
            <select
              id={key}
              value={config[key] || ''}
              onChange={(e) => setConfig((prev: any) => ({ ...prev, [key]: e.target.value }))}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value="">请选择...</option>
              {field.enum?.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {field.description && (
              <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
            )}
          </div>
        )
      default:
        return (
          <div key={key}>
            <Label htmlFor={key}>{field.title || key}</Label>
            <Input
              id={key}
              value={config[key] || ''}
              onChange={(e) => setConfig((prev: any) => ({ ...prev, [key]: e.target.value }))}
              placeholder={field.description}
              className="mt-1"
            />
          </div>
        )
    }
  }

  const configFields = toolkit.settings?.properties || {}
  const hasConfig = Object.keys(configFields).length > 0

  if (!hasConfig) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>配置 {toolkit.name}</DialogTitle>
            <DialogDescription>
              此工具包无需额外配置，可以直接使用。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>取消</Button>
            <Button onClick={handleSave}>确认添加</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>配置 {toolkit.name}</DialogTitle>
          <DialogDescription>
            请配置工具包的参数设置
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4">
            {Object.entries(configFields).map(([key, field]: [string, any]) => 
              renderConfigField(key, field)
            )}
          </div>
        </ScrollArea>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave}>保存配置</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ToolkitConfigStep({ formData, setFormData }: ToolkitConfigStepProps) {
  const { data: allToolkits = [], isLoading } = useToolkits()
  const [configDialog, setConfigDialog] = useState<{ toolkit: Toolkit; configIndex?: number } | null>(null)

  // Backend already filters business toolkits
  const businessToolkits = allToolkits

  const selectedToolkits = formData.toolkits || []

  const isToolkitSelected = (toolkitId: string) => {
    return selectedToolkits.some((config: ToolkitConfigDto) => config.toolkitId === toolkitId)
  }


  const handleAddToolkit = (toolkit: Toolkit) => {
    const hasConfig = toolkit.settings?.properties && Object.keys(toolkit.settings.properties).length > 0
    
    if (hasConfig) {
      setConfigDialog({ toolkit })
    } else {
      // Direct add without configuration
      const newConfig: ToolkitConfigDto = {
        toolkitId: toolkit.id,
        settings: {}
      }
      setFormData((prev: any) => ({
        ...prev,
        toolkits: [...(prev.toolkits || []), newConfig]
      }))
    }
  }

  const handleSaveConfig = (config: any) => {
    if (!configDialog) return

    const newToolkitConfig: ToolkitConfigDto = {
      toolkitId: configDialog.toolkit.id,
      settings: config
    }

    if (configDialog.configIndex !== undefined) {
      // Update existing config
      setFormData((prev: any) => ({
        ...prev,
        toolkits: prev.toolkits?.map((item: any, index: number) => 
          index === configDialog.configIndex ? newToolkitConfig : item
        ) || []
      }))
    } else {
      // Add new config
      setFormData((prev: any) => ({
        ...prev,
        toolkits: [...(prev.toolkits || []), newToolkitConfig]
      }))
    }

    setConfigDialog(null)
  }

  const handleRemoveToolkit = (toolkitId: string) => {
    setFormData((prev: any) => ({
      ...prev,
      toolkits: prev.toolkits?.filter((config: ToolkitConfigDto) => config.toolkitId !== toolkitId) || []
    }))
  }

  const handleEditConfig = (toolkit: Toolkit, configIndex: number) => {
    setConfigDialog({ toolkit, configIndex })
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
      {/* Already Selected Toolkits */}
      {selectedToolkits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              已添加的工具包
            </CardTitle>
            <CardDescription>
              已配置的工具包将为您的智能体提供这些功能
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedToolkits.map((config: ToolkitConfigDto, index) => {
                const toolkit = businessToolkits.find(t => t.id === config.toolkitId)
                if (!toolkit) return null

                return (
                  <div key={config.toolkitId} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{toolkit.name}</h4>
                        <Badge variant="secondary" className="text-xs">已配置</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{toolkit.description}</p>
                      {toolkit.tools && toolkit.tools.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {toolkit.tools.slice(0, 3).map((tool: any) => (
                            <Badge key={tool.id} variant="outline" className="text-xs">
                              {tool.name}
                            </Badge>
                          ))}
                          {toolkit.tools.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{toolkit.tools.length - 3} 更多
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditConfig(toolkit, index)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveToolkit(toolkit.id)}
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

      {/* Available Toolkits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            可用工具包
          </CardTitle>
          <CardDescription>
            选择业务工具包为您的智能体增加特定功能
          </CardDescription>
        </CardHeader>
        <CardContent>
          {businessToolkits.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {businessToolkits.map((toolkit) => {
                const isSelected = isToolkitSelected(toolkit.id)
                const hasConfig = toolkit.settings?.properties && Object.keys(toolkit.settings.properties).length > 0
                
                return (
                  <Card
                    key={toolkit.id}
                    className={`transition-all hover:shadow-md ${
                      isSelected ? 'border-green-500 bg-green-50' : 'hover:border-primary'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{toolkit.name}</h4>
                            {hasConfig && (
                              <Badge variant="outline" className="text-xs">
                                <Settings className="w-3 h-3 mr-1" />
                                需要配置
                              </Badge>
                            )}
                            {isSelected && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                <Check className="w-3 h-3 mr-1" />
                                已添加
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {toolkit.description}
                          </p>
                          {toolkit.tools && toolkit.tools.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {toolkit.tools.slice(0, 4).map((tool: any) => (
                                <Badge key={tool.id} variant="outline" className="text-xs">
                                  {tool.name}
                                </Badge>
                              ))}
                              {toolkit.tools.length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                  +{toolkit.tools.length - 4} 更多
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          {isSelected ? (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const configIndex = selectedToolkits.findIndex((config: ToolkitConfigDto) => config.toolkitId === toolkit.id)
                                  handleEditConfig(toolkit, configIndex)
                                }}
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveToolkit(toolkit.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                移除
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleAddToolkit(toolkit)}
                              className="flex items-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              {hasConfig ? '配置添加' : '直接添加'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p>暂无可用的业务工具包</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      {configDialog && (
        <ConfigurationDialog
          toolkit={configDialog.toolkit}
          open={true}
          onClose={() => setConfigDialog(null)}
          onSave={handleSaveConfig}
          initialConfig={
            configDialog.configIndex !== undefined 
              ? selectedToolkits[configDialog.configIndex]?.settings 
              : {}
          }
        />
      )}
    </div>
  )
}