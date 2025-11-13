#!/usr/bin/env node
/**
 * Quick script to generate password hash
 * Usage: node scripts/generate-password-hash.js your-password
 */

import crypto from 'crypto';

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

const password = process.argv[2];

if (!password) {
    console.error('Usage: node scripts/generate-password-hash.js <password>');
    process.exit(1);
}

const hash = hashPassword(password);
console.log('\n✅ Password Hash Generated:');
console.log(hash);
console.log('\n📝 Add this to your data/users.json file:');
console.log(`"passwordHash": "${hash}"`);
console.log('');
