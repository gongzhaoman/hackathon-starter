import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { auth, Session } from './auth.config';

// Extended session type that includes organization fields
export interface SessionWithOrganization extends Session {
  activeOrganizationId?: string;
  activeOrgRole?: string;
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name?: string;
    organizationId?: string;
    organizationRole?: string;
  };
}

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    
    try {
      const session = await auth.api.getSession({
        headers: request.headers as any,
      });

      if (!session) {
        throw new UnauthorizedException('No valid session found');
      }

      const sessionWithOrg = session as SessionWithOrganization;

      // Attach user info to request
      request.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || undefined,
        organizationId: sessionWithOrg.activeOrganizationId || undefined,
        organizationRole: sessionWithOrg.activeOrgRole || undefined,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}