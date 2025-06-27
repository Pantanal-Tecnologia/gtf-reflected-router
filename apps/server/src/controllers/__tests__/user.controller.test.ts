import { FastifyReply, FastifyRequest } from 'fastify';
import { UserController } from '../user.controller';
import { users } from '../../lib/users';

describe('UserController', () => {
  let userController: UserController;
  
  beforeEach(() => {
    userController = new UserController();
  });

  describe('getUsers', () => {
    it('should return all users', async () => {
      const result = await userController.getUsers();
      
      expect(result).toEqual(users);
      expect(result.length).toBe(2);
      expect(result[0]?.username).toBe('yopl');
      expect(result[1]?.username).toBe('pipfs');
    });
  });

  describe('getUserById', () => {
    it('should return a user when valid ID is provided', async () => {
      // Arrange
      const request = {
        params: { id: '12' }
      } as unknown as FastifyRequest<{ Params: { id: string } }>;
      
      const reply = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      } as unknown as FastifyReply;
      
      // Act
      await userController.getUserById(request, reply);
      
      // Assert
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(users[0]);
    });

    it('should return 404 when user is not found', async () => {
      // Arrange
      const request = {
        params: { id: '999' }
      } as unknown as FastifyRequest<{ Params: { id: string } }>;
      
      const reply = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      } as unknown as FastifyReply;
      
      // Act
      await userController.getUserById(request, reply);
      
      // Assert
      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ message: 'User not found' });
    });
  });
});