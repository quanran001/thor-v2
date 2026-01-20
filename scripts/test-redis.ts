/**
 * Redis Connection Test Script
 * Run with: npx ts-node scripts/test-redis.ts
 */

const path = require('path');
const dotenv = require('dotenv');

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const Redis = require('ioredis');

async function testRedis() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
        console.error('❌ REDIS_URL not found in .env.local');
        process.exit(1);
    }

    console.log('🔄 Connecting to Redis...');
    console.log(`   URL: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`); // Hide password

    try {
        const redis = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
        });

        // Test write
        const testKey = 'sop:test:connection';
        const testValue = `test-${Date.now()}`;
        await redis.setex(testKey, 60, testValue);
        console.log('✅ Write test passed');

        // Test read
        const readValue = await redis.get(testKey);
        if (readValue === testValue) {
            console.log('✅ Read test passed');
        } else {
            console.error('❌ Read test failed: value mismatch');
        }

        // Test delete
        await redis.del(testKey);
        console.log('✅ Delete test passed');

        // Cleanup
        await redis.quit();
        console.log('\n🎉 Redis connection test successful!');

    } catch (error) {
        console.error('❌ Redis connection failed:', error);
        process.exit(1);
    }
}

testRedis();
