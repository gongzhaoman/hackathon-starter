export class WorkflowEvent<T = any> {
  constructor(
    public readonly type: string,
    public readonly data: T,
    public readonly instanceId?: string,
  ) {}
}

export class StartEvent<TInput> extends WorkflowEvent<TInput> {
  static readonly type = 'WORKFLOW_START';

  constructor(data: TInput, instanceId?: string) {
    super(StartEvent.type, data, instanceId);
  }
}

export class StopEvent<TOutput> extends WorkflowEvent<TOutput> {
  static readonly type = 'WORKFLOW_STOP';

  constructor(data: TOutput, instanceId?: string) {
    super(StopEvent.type, data, instanceId);
  }
}

export interface WorkflowStep<TContext = any, TEvent = any> {
  eventType: string;
  handle: (
    event: WorkflowEvent<TEvent>,
    context: TContext,
  ) => Promise<WorkflowEvent | void>;
}
