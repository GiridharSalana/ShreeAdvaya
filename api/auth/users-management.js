// API route: /api/auth/users-management
// Consolidated endpoint for user management operations
// Handles: GET (list), PUT (update), DELETE (delete)

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

async function saveFileToGitHub(token, owner, repo, path, data, message) {
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
                message: message || `User management - ${new Date().toISOString()}`,
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
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Verify authentication for all operations
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const verification = verifyToken(token);
    if (!verification.valid) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Only admins can manage users
    if (verification.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    // GET - List users
    if (req.method === 'GET') {
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

    // PUT - Update user
    if (req.method === 'PUT') {
        // Parse request body
        let body = {};
        try {
            body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch (e) {
            return res.status(400).json({ error: 'Invalid JSON body' });
        }

        const { username, password, role, email } = body;

        // Validate input
        if (!username || typeof username !== 'string') {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Validate role if provided
        if (role !== undefined) {
            const validRoles = ['admin', 'editor', 'viewer'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` });
            }
        }

        // Validate password if provided
        if (password !== undefined && (typeof password !== 'string' || password.length < 6)) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        try {
            const users = await loadUsers();
            const userIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
            
            if (userIndex === -1) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Prevent modifying the default admin user's role or username
            if (users[userIndex].isDefault) {
                if (role && role !== 'admin') {
                    return res.status(400).json({ error: 'Cannot change default admin user role' });
                }
                if (username.toLowerCase() !== 'admin') {
                    return res.status(400).json({ error: 'Cannot change default admin username' });
                }
            }

            // Update user
            if (password) {
                users[userIndex].encryptedPassword = encryptPassword(password);
            }
            if (role && !users[userIndex].isDefault) {
                // Only allow role change if not default admin
                users[userIndex].role = role;
            }
            if (email !== undefined) {
                users[userIndex].email = email || `${username}@shreeadvaya.com`;
            }
            
            // Ensure Admin user always has isDefault flag
            if (users[userIndex].username.toLowerCase() === 'admin') {
                users[userIndex].isDefault = true;
            }

            // Ensure Admin user is always included before saving
            const adminPassword = process.env.ADMIN_PASSWORD;
            if (adminPassword) {
                const adminExists = users.some(u => u.username.toLowerCase() === 'admin');
                if (!adminExists) {
                    const encryptedPassword = encryptPassword(adminPassword);
                    users.unshift({
                        username: 'Admin',
                        encryptedPassword: encryptedPassword,
                        role: 'admin',
                        email: 'admin@shreeadvaya.com',
                        createdAt: new Date().toISOString(),
                        isDefault: true
                    });
                }
            }

            // Save to GitHub
            const githubToken = process.env.GITHUB_TOKEN;
            const owner = process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER;
            const repo = process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG;

            if (!githubToken || !owner || !repo) {
                return res.status(500).json({ error: 'GitHub configuration missing. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables.' });
            }

            await saveFileToGitHub(
                githubToken, 
                owner, 
                repo, 
                'data/users.json', 
                users,
                `Update user: ${username} - ${new Date().toISOString()}`
            );

            return res.status(200).json({
                success: true,
                message: 'User updated successfully',
                user: {
                    username: users[userIndex].username,
                    role: users[userIndex].role,
                    email: users[userIndex].email
                }
            });

        } catch (error) {
            console.error('Error updating user:', error);
            return res.status(500).json({ 
                error: 'Failed to update user: ' + error.message 
            });
        }
    }

    // DELETE - Delete user
    if (req.method === 'DELETE') {
        // Parse request body
        let body = {};
        try {
            body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch (e) {
            return res.status(400).json({ error: 'Invalid JSON body' });
        }

        const { username } = body;

        // Validate input
        if (!username || typeof username !== 'string') {
            return res.status(400).json({ error: 'Username is required' });
        }

        try {
            const users = await loadUsers();
            const userIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
            
            if (userIndex === -1) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Prevent deleting the default admin user
            if (users[userIndex].isDefault) {
                return res.status(400).json({ error: 'Cannot delete default admin user' });
            }

            // Prevent deleting yourself
            if (users[userIndex].username.toLowerCase() === verification.user.username.toLowerCase()) {
                return res.status(400).json({ error: 'Cannot delete your own account' });
            }

            // Remove user
            users.splice(userIndex, 1);

            // Ensure Admin user is always included before saving
            const adminPassword = process.env.ADMIN_PASSWORD;
            if (adminPassword) {
                const adminExists = users.some(u => u.username.toLowerCase() === 'admin');
                if (!adminExists) {
                    const encryptedPassword = encryptPassword(adminPassword);
                    users.unshift({
                        username: 'Admin',
                        encryptedPassword: encryptedPassword,
                        role: 'admin',
                        email: 'admin@shreeadvaya.com',
                        createdAt: new Date().toISOString(),
                        isDefault: true
                    });
                }
            }

            // Save to GitHub
            const githubToken = process.env.GITHUB_TOKEN;
            const owner = process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER;
            const repo = process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG;

            if (!githubToken || !owner || !repo) {
                return res.status(500).json({ error: 'GitHub configuration missing. Please set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables.' });
            }

            await saveFileToGitHub(
                githubToken, 
                owner, 
                repo, 
                'data/users.json', 
                users,
                `Delete user: ${username} - ${new Date().toISOString()}`
            );

            return res.status(200).json({
                success: true,
                message: 'User deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting user:', error);
            return res.status(500).json({ 
                error: 'Failed to delete user: ' + error.message 
            });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
