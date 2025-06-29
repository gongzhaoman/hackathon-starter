import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Separator } from '@workspace/ui/components/separator'
import { apiClient } from '../lib/api'
import type { Toolkit } from '../types'

export function Toolkits() {
  const [toolkits, setToolkits] = useState<Toolkit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchToolkits()
  }, [])

  const fetchToolkits = async () => {
    try {
      const data = await apiClient.getToolkits()
      setToolkits(data)
    } catch (error) {
      console.error('Failed to fetch toolkits:', error)
    } finally {
      setLoading(false)
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
      <div>
        <h1 className="text-3xl font-bold">工具包管理</h1>
        <p className="text-muted-foreground">查看系统中可用的工具包和工具</p>
      </div>

      {/* Toolkits Grid */}
      {toolkits.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {toolkits.map((toolkit) => (
            <Card key={toolkit.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    🛠️ {toolkit.name}
                  </CardTitle>
                  <Badge variant="secondary">
                    {toolkit.tools.length} 个工具
                  </Badge>
                </div>
                <CardDescription>
                  {toolkit.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3">包含的工具:</h4>
                    <div className="space-y-3">
                      {toolkit.tools.map((tool: any, index: number) => (
                        <div key={tool.id}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{tool.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  工具
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {tool.description}
                              </p>

                              {/* Tool Schema Preview */}
                              {tool.schema && (
                                <div className="mt-2">
                                  <details className="text-xs">
                                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                      查看参数定义
                                    </summary>
                                    <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                                      <pre className="whitespace-pre-wrap">
                                        {JSON.stringify(tool.schema, null, 2)}
                                      </pre>
                                    </div>
                                  </details>
                                </div>
                              )}
                            </div>
                          </div>
                          {index < toolkit.tools.length - 1 && (
                            <Separator className="mt-3" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Toolkit Settings */}
                  {toolkit.settings && Object.keys(toolkit.settings).length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">工具包配置:</h4>
                      <div className="text-xs bg-muted p-2 rounded font-mono">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(toolkit.settings, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🛠️</div>
            <h3 className="text-lg font-semibold mb-2">暂无工具包</h3>
            <p className="text-muted-foreground">系统中还没有可用的工具包</p>
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>工具包统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {toolkits.length}
              </div>
              <p className="text-sm text-muted-foreground">工具包总数</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {toolkits.reduce((total, toolkit) => total + toolkit.tools.length, 0)}
              </div>
              <p className="text-sm text-muted-foreground">工具总数</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {toolkits.filter(toolkit => !toolkit.deleted).length}
              </div>
              <p className="text-sm text-muted-foreground">可用工具包</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
