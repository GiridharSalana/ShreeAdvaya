// API route: /api/auth/users-list
// Lists all users (admin only)

import { loadUsers } from './users.js';
import { verifyToken } from './jwt.js';

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
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify authentication
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const verification = verifyToken(token);
    if (!verification.valid) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Only admins can list users
    if (verification.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        const users = await loadUsers();
        
        // Return users without sensitive data (no passwords)
        const safeUsers = users.map(user => ({
            username: user.username,
            role: user.role,
            email: user.email || `${user.username}@shreeadvaya.com`,
            createdAt: user.createdAt,
            isDefault: user.isDefault || false
        }));

        return res.status(200).json({
            success: true,
            users: safeUsers
        });
    } catch (error) {
        console.error('Error listing users:', error);
        return res.status(500).json({ 
            error: 'Failed to list users: ' + error.message 
        });
    }
}
