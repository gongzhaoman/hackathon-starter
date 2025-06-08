import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom, race, Subject, timer } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

import { WorkflowContextStorage } from './workflow.context';
import { WorkflowEvent } from './workflow.types';

@Injectable()
export class EventBus {
  private eventStream = new Subject<WorkflowEvent>();
  private logger = new Logger(EventBus.name);

  publish<T>(type: string, data: T): void {
    const instanceId = WorkflowContextStorage.getCurrentInstanceId();
    if (!instanceId) {
      this.logger.log(
        `Event ${type} was emitted outside of workflow context, ignoring...`,
      );
      return;
    }

    this.eventStream.next(new WorkflowEvent(type, data, instanceId));
  }

  subscribe<T>(
    eventType: string,
    handler: (event: WorkflowEvent<T>) => void | Promise<void>,
  ) {
    return this.eventStream
      .pipe(filter((event) => event.type === eventType))
      .subscribe(handler);
  }

  async requireEvent<T = any>(
    eventType: string,
    timeout: number = 30000,
  ): Promise<WorkflowEvent<T>> {
    // 获取当前 workflow 实例 ID
    const instanceId = WorkflowContextStorage.getCurrentInstanceId();
    if (!instanceId) {
      throw new Error('requireEvent must be called within a workflow context');
    }

    return firstValueFrom(
      race(
        this.eventStream.pipe(
          // 过滤出当前 workflow 实例的指定类型事件
          filter(
            (event) =>
              event.type === eventType && event.instanceId === instanceId,
          ),
          take(1),
        ),
        timer(timeout).pipe(
          map(() => {
            throw new Error(`Timeout waiting for event ${eventType}`);
          }),
        ),
      ),
    );
  }
}
