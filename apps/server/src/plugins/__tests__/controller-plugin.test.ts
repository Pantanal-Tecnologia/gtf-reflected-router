import { FastifyInstance } from 'fastify';
import { controllerPlugin } from '../controller-plugin';
import { Container } from 'typedi';
import * as decorators from '../../../../../packages/reflected/decorators';

class MockController {
  mockMethod() {
    return { success: true };
  }
}

describe('Controller Plugin', () => {
  let mockFastify: FastifyInstance;
  
  beforeEach(() => {
    mockFastify = {
      route: jest.fn(),
      register: jest.fn().mockImplementation((plugin, options) => plugin(mockFastify, options)),
    } as unknown as FastifyInstance;
    
    jest.spyOn(Container, 'get').mockImplementation(() => new MockController());
    
    // Mock getRoutes
    jest.spyOn(decorators, 'getRoutes').mockReturnValue([
      {
        method: 'GET',
        path: '/test',
        handler: 'mockMethod',
        options: {
          schema: {
            tags: ['test'],
            summary: 'Test endpoint',
          }
        }
      }
    ]);
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  it('should register routes from controllers', async () => {
    const options = {
      controllers: [MockController],
      prefix: '/api'
    };
    
    await controllerPlugin(mockFastify, options);
    
    expect(Container.get).toHaveBeenCalledWith(MockController);
    expect(decorators.getRoutes).toHaveBeenCalledWith(MockController);
    expect(mockFastify.route).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      url: '/api/test',
    }));
  });
  
  it('should use empty prefix if not provided', async () => {
    const options = {
      controllers: [MockController]
    };
    
    await controllerPlugin(mockFastify, options);
    
    expect(mockFastify.route).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      url: '/test',
    }));
  });
});