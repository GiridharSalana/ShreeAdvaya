// JWT utilities using ADMIN_PASSWORD as secret
// Provides JWT token generation and verification

import jwt from 'jsonwebtoken';
import { getJWTSecret } from './users.js';

/**
 * Generate JWT token for user
 * Uses ADMIN_PASSWORD as the secret key
 */
export function generateToken(user) {
    const secret = getJWTSecret();
    
    const payload = {
        username: user.username,
        role: user.role || 'admin',
        iat: Math.floor(Date.now() / 1000) // Issued at
    };
    
    return jwt.sign(payload, secret, {
        expiresIn: '1h', // Token expires in 1 hour
        algorithm: 'HS256'
    });
}

/**
 * Verify JWT token
 * Uses ADMIN_PASSWORD as the secret key
 */
export function verifyToken(token) {
    try {
        const secret = getJWTSecret();
        const decoded = jwt.verify(token, secret, {
            algorithms: ['HS256']
        });
        
        return {
            valid: true,
            user: {
                username: decoded.username,
                role: decoded.role
            }
        };
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return { valid: false, error: 'Token expired' };
        } else if (error.name === 'JsonWebTokenError') {
            return { valid: false, error: 'Invalid token' };
        } else {
            return { valid: false, error: 'Token verification failed' };
        }
    }
}
