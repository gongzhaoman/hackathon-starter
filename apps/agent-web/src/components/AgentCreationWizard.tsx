import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog'
import { Button } from '@workspace/ui/components/button'
import { CheckCircle, Circle, ArrowLeft, ArrowRight } from 'lucide-react'
import { BasicInfoStep } from './wizard-steps/BasicInfoStep'
import { ToolkitConfigStep } from './wizard-steps/ToolkitConfigStep'
import { KnowledgeBaseStep } from './wizard-steps/KnowledgeBaseStep'
import { WorkflowStep } from './wizard-steps/WorkflowStep'
import { useCreateAgent } from '../services/agent.service'
import type { CreateAgentDto } from '../types'

interface AgentCreationWizardProps {
  open: boolean
  onClose: () => void
}

interface WizardStep {
  id: string
  title: string
  description: string
  component: React.ComponentType<any>
}

const steps: WizardStep[] = [
  {
    id: 'basic',
    title: '基本信息',
    description: '配置智能体的基本信息',
    component: BasicInfoStep
  },
  {
    id: 'toolkits',
    title: '工具配置',
    description: '选择和配置工具包',
    component: ToolkitConfigStep
  },
  {
    id: 'knowledge',
    title: '知识库',
    description: '添加知识库支持',
    component: KnowledgeBaseStep
  },
  {
    id: 'workflows',
    title: '工作流',
    description: '添加工作流工具',
    component: WorkflowStep
  }
]

export function AgentCreationWizard({ open, onClose }: AgentCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<CreateAgentDto & { workflows?: string[] }>({
    name: '',
    description: '',
    prompt: '',
    options: {},
    toolkits: [],
    knowledgeBases: [],
    workflows: []
  })
  
  const createAgentMutation = useCreateAgent()
  
  const currentStepData = steps[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1
  const progress = ((currentStep + 1) / steps.length) * 100

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Basic info
        return formData.name.trim() && formData.prompt.trim()
      default:
        return true
    }
  }

  if (!currentStepData) {
    return null
  }

  const handleNext = () => {
    if (canProceed() && !isLastStep) {
      setCurrentStep(current => current + 1)
    }
  }

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(current => current - 1)
    }
  }

  const handleFinish = async () => {
    if (!canProceed()) return

    try {
      // Extract workflows from formData for API call
      const { workflows, ...agentData } = formData
      await createAgentMutation.mutateAsync(agentData)
      
      // Reset form and close
      setCurrentStep(0)
      setFormData({
        name: '',
        description: '',
        prompt: '',
        options: {},
        toolkits: [],
        knowledgeBases: [],
        workflows: []
      })
      onClose()
    } catch (error) {
      console.error('Failed to create agent:', error)
    }
  }

  const StepComponent = currentStepData.component

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              🤖
            </div>
            创建智能体
          </DialogTitle>
          <DialogDescription>
            通过向导模式轻松创建功能强大的AI智能体
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center space-y-2">
                    {index < currentStep ? (
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    ) : index === currentStep ? (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center animate-pulse">
                        <div className="w-4 h-4 rounded-full bg-white" />
                      </div>
                    ) : (
                      <Circle className="w-8 h-8 text-gray-300" />
                    )}
                    <span className={`text-xs font-medium text-center ${
                      index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-px mx-4 ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="text-center">
            <h3 className="text-lg font-semibold">{currentStepData.title}</h3>
            <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="animate-in fade-in-50 duration-300 h-full">
            <StepComponent 
              formData={formData} 
              setFormData={setFormData}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isFirstStep}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            上一步
          </Button>
          
          <div className="text-sm text-muted-foreground">
            第 {currentStep + 1} 步，共 {steps.length} 步
          </div>
          
          {isLastStep ? (
            <Button
              onClick={handleFinish}
              disabled={!canProceed() || createAgentMutation.isPending}
              className="flex items-center gap-2"
            >
              {createAgentMutation.isPending ? '创建中...' : '完成创建'}
              <CheckCircle className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2"
            >
              下一步
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}