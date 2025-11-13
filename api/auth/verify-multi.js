// API route: /api/auth/verify-multi
// Verifies JWT authentication token using ADMIN_PASSWORD as secret

import { verifyToken } from './jwt.js';

export default async function handler(req, res) {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    
    // CORS - restrict to your domain only
    const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://shreeadvaya.vercel.app';
    const origin = req.headers.origin;
    
    if (origin && (origin === allowedOrigin || origin.includes('localhost'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get token from Authorization header or body
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || req.body?.token;

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    // Verify JWT token using ADMIN_PASSWORD as secret
    const verification = verifyToken(token);
    
    if (!verification.valid) {
        return res.status(401).json({ 
            error: verification.error || 'Invalid token' 
        });
    }
    
    return res.status(200).json({ 
        success: true, 
        valid: true,
        user: verification.user
    });
}
