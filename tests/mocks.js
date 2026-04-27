import { jest } from '@jest/globals';

jest.unstable_mockModule('ioredis', () => {
    return {
        default: class RedisMock {
            constructor() {
                this.on = jest.fn();
                this.get = jest.fn();
                this.set = jest.fn();
                this.del = jest.fn();
            }
        }
    };
});

jest.unstable_mockModule('bullmq', () => {
    return {
        Queue: class QueueMock {
            constructor() {
                this.add = jest.fn();
                this.on = jest.fn();
            }
        },
        Worker: class WorkerMock {
            constructor() {
                this.on = jest.fn();
            }
        }
    };
});

jest.unstable_mockModule('../src/config/db.js', () => {
    return {
        default: {
            user: {
                findUnique: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                deleteMany: jest.fn(),
            },
            post: {
                findMany: jest.fn(),
                create: jest.fn(),
                count: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback()),
            $disconnect: jest.fn()
        }
    };
});
