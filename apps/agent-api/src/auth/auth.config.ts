import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization } from 'better-auth/plugins';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 24 hours
  },
  plugins: [
    organization({
      enabled: true,
      allowUserToCreateOrganization: true,
      allowUserToLeaveOrganization: true,
      sendInvitationEmail: async (data) => {
        // 暂时禁用邮件发送，生产环境中配置邮件服务
        console.log('Organization invitation email would be sent to:', data.email);
      },
    }),
  ],
  trustedOrigins: [
    'http://localhost:5173', // agent-web dev server
    'http://localhost:3001', // agent-api dev server
  ],
  secret: process.env.BETTER_AUTH_SECRET || 'your-secret-key-here',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
});

// Better Auth 推断类型
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
export type Organization = typeof auth.$Infer.Organization;