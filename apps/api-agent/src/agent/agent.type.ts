export class CreateAgentDto {
  name: string = '';
  description?: string;
  prompt: string = '';
  options: any;
}

export class UpdateAgentDto {
  name?: string;
  description?: string;
  prompt?: string;
  options?: any;
}
