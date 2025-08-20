declare global {
  function mockDate(date: string | Date): Date;
  function restoreDate(): void;
  function createMockAgent(overrides?: any): any;
  function createMockWorkflow(overrides?: any): any;
  function createMockKnowledgeBase(overrides?: any): any;
  function createMockToolkit(overrides?: any): any;
}

export {};