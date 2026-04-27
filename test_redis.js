import Redis from 'ioredis';

async function test() {
  const host = 'cheerful-filly-84826.upstash.io';
  const pass = 'ggAAAAAAAUtaAAIgcDG5Onhwa-K-28P74BDBbBoA8AXiyejUze9O059k_PGB9Q';
  
  console.log('Testing with default username and TLS...');
  const r1 = new Redis({
    host,
    port: 6379,
    password: pass,
    username: 'default',
    tls: {},
    maxRetriesPerRequest: 0
  });

  try {
    const res = await r1.ping();
    console.log('✅ Success with default username!');
    process.exit(0);
  } catch (e) {
    console.log('❌ Failed with default:', e.message);
  }

  console.log('Testing without username and TLS...');
  const r2 = new Redis({
    host,
    port: 6379,
    password: pass,
    tls: {},
    maxRetriesPerRequest: 0
  });

  try {
    const res = await r2.ping();
    console.log('✅ Success without username!');
    process.exit(0);
  } catch (e) {
    console.log('❌ Failed without username:', e.message);
  }

  process.exit(1);
}

test();
