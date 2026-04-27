import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

import { telemetry } from '../utils/telemetry.js';

const prismaClient = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

const prisma = prismaClient.$extends({
  query: {
    async $allOperations({ operation, model, args, query }) {
      const start = telemetry.startTimer();
      const result = await query(args);
      const duration = telemetry.endTimer(start);
      
      telemetry.trace('PRISMA', 'QUERY_EXEC', duration, { model, operation });
      return result;
    },
  },
});

export default prisma;
