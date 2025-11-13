// API route: /api/auth/login-multi
// Handles multi-user authentication with JWT tokens
// Uses ADMIN_PASSWORD as JWT secret and for password decryption

import { authenticateUser } from './users.js';
import { generateToken } from './jwt.js';

export default async function handler(req, res) {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // CORS - restrict to your domain only
    const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://shreeadvaya.vercel.app';
    const origin = req.headers.origin;
    
    if (origin && (origin === allowedOrigin || origin.includes('localhost'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Parse request body
    let body = {};
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const { username, password } = body;

    // Validate input
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Username and password required' });
    }

    // Authenticate user (decrypts password from JSON)
    const user = await authenticateUser(username, password);
    
    if (!user) {
        // Don't reveal whether user exists or not
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token using ADMIN_PASSWORD as secret
    const token = generateToken(user);
    
    return res.status(200).json({ 
        success: true, 
        token: token,
        user: {
            username: user.username,
            role: user.role
        },
        expiresIn: 3600 // 1 hour
    });
}
