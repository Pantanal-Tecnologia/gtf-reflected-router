// This file contains setup code that will be executed before each test
require('reflect-metadata'); // Required for decorators to work

// Global test timeout
jest.setTimeout(30000);

// Silence console logs during tests unless explicitly enabled
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}