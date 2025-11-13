#!/usr/bin/env node
/**
 * Encrypt password for storage in users.json
 * Uses ADMIN_PASSWORD environment variable as encryption key
 * 
 * Usage: 
 *   ADMIN_PASSWORD=your-secret-key node scripts/encrypt-password.js your-password
 * 
 * Or set ADMIN_PASSWORD in .env file
 */

import crypto from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getEncryptionKey() {
    // Try to load from .env file
    const envPath = join(__dirname, '..', '.env');
    if (existsSync(envPath)) {
        const envContent = readFileSync(envPath, 'utf8');
        const envLines = envContent.split('\n');
        for (const line of envLines) {
            const [key, ...valueParts] = line.split('=');
            if (key.trim() === 'ADMIN_PASSWORD') {
                process.env.ADMIN_PASSWORD = valueParts.join('=').trim();
                break;
            }
        }
    }
    
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
        console.error('\n❌ Error: ADMIN_PASSWORD environment variable is required');
        console.error('\nUsage:');
        console.error('  ADMIN_PASSWORD=your-secret-key node scripts/encrypt-password.js your-password');
        console.error('\nOr create a .env file with:');
        console.error('  ADMIN_PASSWORD=your-secret-key');
        process.exit(1);
    }
    
    // Derive a 32-byte key from ADMIN_PASSWORD using SHA-256
    return crypto.createHash('sha256').update(adminPassword).digest();
}

function encryptPassword(password) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16); // Initialization vector
    
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag(); // For authentication
    
    // Return: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

const password = process.argv[2];

if (!password) {
    console.error('\n❌ Error: Password is required');
    console.error('\nUsage:');
    console.error('  ADMIN_PASSWORD=your-secret-key node scripts/encrypt-password.js your-password');
    process.exit(1);
}

try {
    const encrypted = encryptPassword(password);
    
    console.log('\n✅ Password Encrypted Successfully!\n');
    console.log('📝 Add this to your data/users.json file:');
    console.log(`   "encryptedPassword": "${encrypted}"`);
    console.log('\n🔒 This encrypted password can only be decrypted using ADMIN_PASSWORD');
    console.log('   Make sure ADMIN_PASSWORD is set in Vercel environment variables!\n');
} catch (error) {
    console.error('\n❌ Encryption failed:', error.message);
    process.exit(1);
}
