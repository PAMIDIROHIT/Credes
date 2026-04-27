import dotenv from 'dotenv';
dotenv.config();

// Standard Mocks and Setup for Jest
jest.mock('../src/config/db.js', () => ({
  __esModule: true,
  default: {
    post: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    platformPost: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    socialAccount: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('../src/config/queue.js', () => ({
  __esModule: true,
  publishQueue: {
    add: jest.fn(),
  },
}));