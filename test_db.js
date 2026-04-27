import { PrismaClient } from '@prisma/client';

async function test(url) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    console.log(`Checking: ${url.split('@')[1]}`);
    await prisma.$connect();
    const count = await prisma.user.count();
    console.log(`✅ SUCCESS! Connection verified. Users: ${count}`);
    return true;
  } catch (e) {
    console.log(`❌ Error: ${e.message.split('\n')[0]}`);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  const id = 'dskqbmphnjuzvtxrttnu';
  const url = `postgresql://postgres:7286027547Rr@db.${id}.supabase.co:6543/postgres?pgbouncer=true`;
  await test(url);
}

run();
