import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始播种数据...');

  // 清理现有数据
  await prisma.agentTool.deleteMany();
  await prisma.agentToolkit.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.workFlow.deleteMany();
  await prisma.tool.deleteMany();
  await prisma.toolkit.deleteMany();

  console.log('🧹 清理完成');

  // 创建工具包（与代码中定义的保持一致）
  const commonToolkit = await prisma.toolkit.create({
    data: {
      id: 'common-toolkit-01',
      name: 'Common Tools',
      description: 'Basic utility tools for common operations',
      settings: {},
    },
  });

  const toolExplorerToolkit = await prisma.toolkit.create({
    data: {
      id: 'tool-explorer-toolkit-01',
      name: '工具查询工具箱',
      description: '用于查询系统内所有已注册工具的名称、描述和参数定义。',
      settings: {},
    },
  });

  console.log('📦 工具包创建完成');

  // 创建工具（与代码中定义的保持一致）
  const getCurrentTimeTool = await prisma.tool.create({
    data: {
      name: 'getCurrentTime',
      description: 'Get the current time in a specific timezone. ',
      schema: {
        type: 'object',
        properties: {
          timezone: {
            type: 'string',
            description: 'IANA timezone identifier, e.g., "Asia/Shanghai", "UTC". Optional, defaults to Asia/Shanghai if not provided.',
          },
        },
        required: [],
      },
      toolkitId: commonToolkit.id,
    },
  });

  const listAllToolsTool = await prisma.tool.create({
    data: {
      name: 'listAllTools',
      description: '查询系统中所有可用工具的名称、描述和参数格式。',
      schema: {
        type: 'object',
        properties: {},
      },
      toolkitId: toolExplorerToolkit.id,
    },
  });

  const checkToolDetailTool = await prisma.tool.create({
    data: {
      name: 'checkToolDetail',
      description: '查询指定工具的详细信息。',
      schema: {
        type: 'object',
        properties: {
          toolName: {
            type: 'string',
            description: '要查询的工具名称。',
          },
        },
        required: ['toolName'],
      },
      toolkitId: toolExplorerToolkit.id,
    },
  });

  console.log('🛠️ 工具创建完成');

  // 创建测试智能体
  const timeAssistantAgent = await prisma.agent.create({
    data: {
      name: '时间助手',
      description: '专门处理时间相关查询的智能助手',
      prompt: '你是一个专业的时间助手，能够帮助用户获取不同时区的时间信息。请用友好和专业的语气回答用户的时间相关问题。',
      options: {
        temperature: 0.7,
        maxTokens: 1000,
      },
    },
  });

  const workflowDesignerAgent = await prisma.agent.create({
    data: {
      name: '工作流设计师',
      description: '专门设计和创建AI工作流的智能助手',
      prompt: '你是一个专业的工作流设计专家，能够根据用户需求设计合适的AI工作流。你需要分析用户需求，选择合适的工具和智能体，并设计出高效的工作流程。',
      options: {
        temperature: 0.5,
        maxTokens: 2000,
      },
    },
  });

  const dataAnalystAgent = await prisma.agent.create({
    data: {
      name: '数据分析师',
      description: '专门进行数据分析和洞察的智能助手',
      prompt: '你是一个专业的数据分析师，能够分析各种数据并提供有价值的洞察。请用清晰和专业的方式解释数据分析结果。',
      options: {
        temperature: 0.3,
        maxTokens: 1500,
      },
    },
  });

  console.log('🤖 智能体创建完成');

  // 为智能体分配工具包
  // 时间助手：只需要 common toolkit
  await prisma.agentToolkit.create({
    data: {
      agentId: timeAssistantAgent.id,
      toolkitId: commonToolkit.id,
      settings: {},
    },
  });

  // 工作流设计师：需要 common toolkit 和 tool-explorer toolkit
  await prisma.agentToolkit.create({
    data: {
      agentId: workflowDesignerAgent.id,
      toolkitId: commonToolkit.id,
      settings: {},
    },
  });

  await prisma.agentToolkit.create({
    data: {
      agentId: workflowDesignerAgent.id,
      toolkitId: toolExplorerToolkit.id,
      settings: {},
    },
  });

  // 数据分析师：需要 common toolkit 和 tool-explorer toolkit
  await prisma.agentToolkit.create({
    data: {
      agentId: dataAnalystAgent.id,
      toolkitId: commonToolkit.id,
      settings: {},
    },
  });

  await prisma.agentToolkit.create({
    data: {
      agentId: dataAnalystAgent.id,
      toolkitId: toolExplorerToolkit.id,
      settings: {},
    },
  });

  // 为智能体分配具体工具
  await prisma.agentTool.create({
    data: {
      agentId: timeAssistantAgent.id,
      toolId: getCurrentTimeTool.id,
    },
  });

  await prisma.agentTool.create({
    data: {
      agentId: workflowDesignerAgent.id,
      toolId: listAllToolsTool.id,
    },
  });

  await prisma.agentTool.create({
    data: {
      agentId: workflowDesignerAgent.id,
      toolId: checkToolDetailTool.id,
    },
  });

  console.log('🔗 工具关联完成');

  // 创建示例工作流
  const emailSummaryWorkflow = await prisma.workFlow.create({
    data: {
      name: 'AI邮件摘要与推送',
      description: 'AI自动摘要邮件并通过企业微信推送',
      agentToolId: dataAnalystAgent.id,
      DSL: {
        id: 'workflowMailSummarySend',
        name: 'AI邮件摘要与推送',
        description: 'AI自动摘要邮件并通过企业微信推送',
        version: 'v1',
        tools: ['summarize', 'sendWeCom'],
        agents: [
          {
            name: 'mailSummarizerAgent',
            description: '基于LLM对邮件内容进行结构化摘要',
            prompt: '请总结输入的邮件内容，简洁扼要，输出JSON格式',
            output: { summary: 'string' },
            tools: ['summarize'],
          },
        ],
        content: {},
        events: [
          {
            type: 'WORKFLOW_START',
            data: { emailContent: 'string' },
          },
          {
            type: 'SUMMARY_DONE',
            data: { summary: 'string' },
          },
          {
            type: 'WORKFLOW_STOP',
            data: { sendResult: 'string' },
          },
        ],
        steps: [
          {
            event: 'WORKFLOW_START',
            handle: 'async (event, context) => { const { summary } = await mailSummarizerAgent({ emailContent: event.data.emailContent }); return { type: "SUMMARY_DONE", data: { summary } }; }',
          },
          {
            event: 'SUMMARY_DONE',
            handle: 'async (event, context) => { const sendResult = await sendWeCom({ text: event.data.summary }); return { type: "WORKFLOW_STOP", data: { sendResult } }; }',
          },
        ],
      },
    },
  });

  console.log('📋 工作流创建完成');

  console.log('✅ 数据播种完成！');
  console.log(`📊 创建的数据统计:`);
  console.log(`   - 工具包: 2 个`);
  console.log(`   - 工具: 3 个`);
  console.log(`   - 智能体: 3 个`);
  console.log(`   - 工作流: 1 个`);
}

main()
  .catch((e) => {
    console.error('❌ 播种失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
