#!/usr/bin/env node
/**
 * Script to create a new user
 * Usage: node scripts/create-user.js <username> <password> <role>
 * 
 * This will generate a password hash and add the user to data/users.json
 */

import { hashPassword } from '../api/auth/users.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const usersFile = path.join(__dirname, '../data/users.json');

// Get command line arguments
const [,, username, password, role = 'admin'] = process.argv;

if (!username || !password) {
    console.error('Usage: node scripts/create-user.js <username> <password> [role]');
    console.error('Roles: admin, editor, viewer');
    process.exit(1);
}

// Validate role
const validRoles = ['admin', 'editor', 'viewer'];
if (!validRoles.includes(role)) {
    console.error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    process.exit(1);
}

// Load existing users
let users = [];
if (fs.existsSync(usersFile)) {
    try {
        users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    } catch (error) {
        console.error('Error reading users file:', error);
        process.exit(1);
    }
}

// Check if user already exists
if (users.find(u => u.username === username)) {
    console.error(`User "${username}" already exists!`);
    process.exit(1);
}

// Create new user
const passwordHash = hashPassword(password);
const newUser = {
    username,
    passwordHash,
    role,
    email: `${username}@shreeadvaya.com`, // Default email
    createdAt: new Date().toISOString()
};

users.push(newUser);

// Save users
try {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    console.log(`✅ User "${username}" created successfully with role "${role}"`);
    console.log(`📝 Users file: ${usersFile}`);
    console.log(`\n⚠️  Remember to commit this file to GitHub or set ADMIN_USERS environment variable`);
} catch (error) {
    console.error('Error saving users file:', error);
    process.exit(1);
}
