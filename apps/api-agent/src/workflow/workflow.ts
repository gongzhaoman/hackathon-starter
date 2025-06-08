import { Subscription } from 'rxjs';

import { EventBus } from './event-bus';
import { WorkflowContextStorage } from './workflow.context';
import {
  WorkflowEvent,
  WorkflowStep,
  StartEvent,
  StopEvent,
} from './workflow.types';

export class Workflow<TContext = any, TInput = any, TOutput = any> {
  private readonly instanceId: string;
  private subscriptions: Subscription[] = [];

  constructor(
    private readonly eventBus: EventBus,
    private readonly initialContext: TContext,
  ) {
    this.instanceId = `wf_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  addStep<TEvent = any>(step: WorkflowStep<TContext, TEvent>) {
    const subscription = this.eventBus.subscribe(
      step.eventType,
      async (event: WorkflowEvent<TEvent>) => {
        if (event.instanceId === this.instanceId) {
          try {
            await WorkflowContextStorage.run(
              this.instanceId,
              WorkflowContextStorage.getCurrentContext(),
              async () => {
                const context =
                  WorkflowContextStorage.getCurrentContext<TContext>();
                if (!context) throw new Error('Context not found');

                const nextEvent = await step.handle(event, context);
                if (nextEvent) {
                  this.eventBus.publish(nextEvent.type, nextEvent.data);
                }
              },
            );
          } catch (error) {
            console.error(
              `Error in workflow instance ${this.instanceId}:`,
              error,
            );
            this.eventBus.publish(StopEvent.type, error);
          }
        }
      },
    );
    this.subscriptions.push(subscription);
  }

  async execute(input: TInput): Promise<TOutput> {
    return WorkflowContextStorage.run(
      this.instanceId,
      this.initialContext,
      async () => {
        return new Promise<TOutput>((resolve, reject) => {
          const subscription = this.eventBus.subscribe(
            StopEvent.type,
            (event: StopEvent<TOutput>) => {
              if (event.instanceId === this.instanceId) {
                this.destroy();
                if (event.data instanceof Error) {
                  reject(event.data);
                } else {
                  resolve(event.data);
                }
              }
            },
          );
          this.subscriptions.push(subscription);

          try {
            this.eventBus.publish(StartEvent.type, input);
          } catch (error) {
            this.destroy();
            reject(error);
          }
        });
      },
    );
  }

  destroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];
  }
}
