// API route: /api/auth/register
// Handles new user registration
// Requires authentication (admin only)

import { loadUsers, encryptPassword } from './users.js';
import { verifyToken } from './jwt.js';

// Helper function to get file SHA from GitHub
async function getFileSHA(token, owner, repo, path) {
    try {
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            }
        );
        if (response.ok) {
            const fileData = await response.json();
            return fileData.sha;
        }
    } catch (error) {
        // File doesn't exist yet
    }
    return null;
}

async function saveFileToGitHub(token, owner, repo, path, data) {
    const sha = await getFileSHA(token, owner, repo, path);
    
    const content = JSON.stringify(data, null, 2);
    const encodedContent = Buffer.from(content).toString('base64');

    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': '2022-11-28'
            },
            body: JSON.stringify({
                message: `Add new user: ${data[data.length - 1]?.username || 'user'} - ${new Date().toISOString()}`,
                content: encodedContent,
                sha: sha
            })
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`GitHub API error: ${error.message || response.statusText}`);
    }

    return await response.json();
}

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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check if any users exist
    const existingUsers = await loadUsers();
    const isFirstUser = existingUsers.length === 0;
    
    // If users exist, require admin authentication
    if (!isFirstUser) {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '') || req.body?.token;
        
        if (!token) {
            return res.status(401).json({ error: 'Authentication required. Please login as admin to register new users.' });
        }

        const verification = verifyToken(token);
        if (!verification.valid) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Only admins can register new users
        if (verification.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required for user registration' });
        }
    }

    // Parse request body
    let body = {};
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const { username, password, role = 'editor', email } = body;

    // Validate input
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
        return res.status(400).json({ error: 'Username is required' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Validate username format (alphanumeric and underscore, 3-20 chars)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' });
    }

    // Validate role
    const validRoles = ['admin', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` });
    }

    try {
        // Load existing users (reload to get latest)
        const users = await loadUsers();

        // Check if username already exists
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        // Encrypt password
        const encryptedPassword = encryptPassword(password);

        // For first user, always set role to admin
        const finalRole = isFirstUser ? 'admin' : role;

        // Create new user object
        const newUser = {
            username: username.trim(),
            encryptedPassword: encryptedPassword,
            role: finalRole,
            email: email || `${username}@shreeadvaya.com`,
            createdAt: new Date().toISOString()
        };

        // Add new user to array
        users.push(newUser);

        // Save to GitHub
        const githubToken = process.env.GITHUB_TOKEN;
        const owner = process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER;
        const repo = process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG;

        if (!githubToken || !owner || !repo) {
            return res.status(500).json({ error: 'GitHub configuration missing. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables.' });
        }

        await saveFileToGitHub(githubToken, owner, repo, 'data/users.json', users);

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                username: newUser.username,
                role: newUser.role,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ 
            error: 'Failed to register user: ' + error.message 
        });
    }
}
