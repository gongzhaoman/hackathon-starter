import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { auth } from './auth.config';
import type { Request, Response } from 'express';

// Mock the auth handler
jest.mock('./auth.config', () => ({
  auth: {
    handler: jest.fn(),
  },
}));

const mockAuth = auth as jest.Mocked<typeof auth>;

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleAuth', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockRequest = {
        method: 'POST',
        url: '/api/auth/signin',
        headers: {
          'content-type': 'application/json',
        },
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      };

      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
        setHeader: jest.fn(),
      };
    });

    it('should call auth handler with request', async () => {
      const mockAuthResult = { success: true, user: { id: 'user-1' } };
      mockAuth.handler.mockResolvedValue(mockAuthResult as any);

      const result = await controller.handleAuth(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockAuth.handler).toHaveBeenCalledTimes(1);
      expect(mockAuth.handler).toHaveBeenCalledWith(mockRequest);
      expect(result).toEqual(mockAuthResult);
    });

    it('should handle different HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      
      for (const method of methods) {
        mockRequest.method = method;
        const mockResult = { method };
        mockAuth.handler.mockResolvedValue(mockResult as any);

        const result = await controller.handleAuth(
          mockRequest as Request,
          mockResponse as Response,
        );

        expect(mockAuth.handler).toHaveBeenCalledWith(mockRequest);
        expect(result).toEqual(mockResult);
        
        jest.clearAllMocks();
      }
    });

    it('should handle signin request', async () => {
      mockRequest.url = '/api/auth/signin';
      mockRequest.method = 'POST';
      const mockSigninResult = { 
        success: true, 
        session: { id: 'session-1' },
        user: { id: 'user-1', email: 'test@example.com' }
      };
      mockAuth.handler.mockResolvedValue(mockSigninResult as any);

      const result = await controller.handleAuth(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockAuth.handler).toHaveBeenCalledWith(mockRequest);
      expect(result).toEqual(mockSigninResult);
    });

    it('should handle signup request', async () => {
      mockRequest.url = '/api/auth/signup';
      mockRequest.method = 'POST';
      mockRequest.body = {
        email: 'new@example.com',
        password: 'newpassword123',
        name: 'New User',
      };
      const mockSignupResult = { 
        success: true, 
        user: { id: 'user-2', email: 'new@example.com', name: 'New User' }
      };
      mockAuth.handler.mockResolvedValue(mockSignupResult as any);

      const result = await controller.handleAuth(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockAuth.handler).toHaveBeenCalledWith(mockRequest);
      expect(result).toEqual(mockSignupResult);
    });

    it('should handle signout request', async () => {
      mockRequest.url = '/api/auth/signout';
      mockRequest.method = 'POST';
      const mockSignoutResult = { success: true };
      mockAuth.handler.mockResolvedValue(mockSignoutResult as any);

      const result = await controller.handleAuth(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockAuth.handler).toHaveBeenCalledWith(mockRequest);
      expect(result).toEqual(mockSignoutResult);
    });

    it('should handle session request', async () => {
      mockRequest.url = '/api/auth/session';
      mockRequest.method = 'GET';
      const mockSessionResult = { 
        session: { id: 'session-1' },
        user: { id: 'user-1', email: 'test@example.com' }
      };
      mockAuth.handler.mockResolvedValue(mockSessionResult as any);

      const result = await controller.handleAuth(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockAuth.handler).toHaveBeenCalledWith(mockRequest);
      expect(result).toEqual(mockSessionResult);
    });

    it('should handle auth handler errors', async () => {
      const authError = new Error('Authentication failed');
      mockAuth.handler.mockRejectedValue(authError);

      await expect(
        controller.handleAuth(mockRequest as Request, mockResponse as Response),
      ).rejects.toThrow('Authentication failed');

      expect(mockAuth.handler).toHaveBeenCalledWith(mockRequest);
    });

    it('should handle organization-related requests', async () => {
      mockRequest.url = '/api/auth/organization/create';
      mockRequest.method = 'POST';
      mockRequest.body = {
        name: 'Test Organization',
        slug: 'test-org',
      };
      const mockOrgResult = { 
        success: true, 
        organization: { id: 'org-1', name: 'Test Organization' }
      };
      mockAuth.handler.mockResolvedValue(mockOrgResult as any);

      const result = await controller.handleAuth(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockAuth.handler).toHaveBeenCalledWith(mockRequest);
      expect(result).toEqual(mockOrgResult);
    });

    it('should pass through request headers', async () => {
      mockRequest.headers = {
        'authorization': 'Bearer token123',
        'content-type': 'application/json',
        'user-agent': 'test-agent',
      };
      const mockResult = { success: true };
      mockAuth.handler.mockResolvedValue(mockResult as any);

      await controller.handleAuth(mockRequest as Request, mockResponse as Response);

      expect(mockAuth.handler).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: mockRequest.headers,
        }),
      );
    });

    it('should handle requests with query parameters', async () => {
      mockRequest.url = '/api/auth/callback?code=abc123&state=xyz';
      mockRequest.method = 'GET';
      const mockCallbackResult = { 
        success: true, 
        session: { id: 'session-1' },
        redirectUrl: '/dashboard'
      };
      mockAuth.handler.mockResolvedValue(mockCallbackResult as any);

      const result = await controller.handleAuth(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockAuth.handler).toHaveBeenCalledWith(mockRequest);
      expect(result).toEqual(mockCallbackResult);
    });
  });
});