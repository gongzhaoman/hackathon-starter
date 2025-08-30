import { Controller, All, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { auth } from './auth.config';

@Controller('api/auth')
export class AuthController {
  @All('*')
  async handleAuth(@Req() request: Request, @Res() response: Response) {
    return auth.handler(request as any);
  }
}