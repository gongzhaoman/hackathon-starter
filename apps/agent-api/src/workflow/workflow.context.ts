import { AsyncLocalStorage } from 'async_hooks';

interface WorkflowStore {
  instanceId: string;
  context: any;
}

export class WorkflowContextStorage {
  private static storage = new AsyncLocalStorage<WorkflowStore>();

  static getCurrentInstanceId(): string | undefined {
    return this.storage.getStore()?.instanceId;
  }

  static getCurrentContext<T>(): T | undefined {
    return this.storage.getStore()?.context;
  }

  static run<T>(
    instanceId: string,
    context: any,
    fn: () => T | Promise<T>,
  ): T | Promise<T> {
    return this.storage.run({ instanceId, context }, fn);
  }

  static updateContext(newContext: any): void {
    const store = this.storage.getStore();
    if (store) {
      store.context = newContext;
    }
  }
}
