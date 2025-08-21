import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import { User, FileText } from 'lucide-react'
import type { CreateAgentDto } from '../../types'

interface BasicInfoStepProps {
  formData: CreateAgentDto
  setFormData: (data: CreateAgentDto | ((prev: CreateAgentDto) => CreateAgentDto)) => void
}

export function BasicInfoStep({ formData, setFormData }: BasicInfoStepProps) {
  const handleInputChange = (field: keyof CreateAgentDto, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            基本信息
          </CardTitle>
          <CardDescription>
            配置智能体的基本身份信息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl text-white font-bold">
              {formData.name ? formData.name.charAt(0).toUpperCase() : '🤖'}
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <Label htmlFor="name" className="flex items-center gap-2">
                  名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="为您的智能体取一个名字"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="description">描述</Label>
                <Input
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="简单描述智能体的功能和用途"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 系统提示词 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            系统提示词
            <span className="text-red-500">*</span>
          </CardTitle>
          <CardDescription>
            定义智能体的行为方式、专业领域和回答风格
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.prompt}
            onChange={(e) => handleInputChange('prompt', e.target.value)}
            placeholder="输入详细的系统提示词，描述智能体的角色、能力和行为规范..."
            rows={6}
            className="resize-y min-h-[150px]"
          />
        </CardContent>
      </Card>
    </div>
  )
}