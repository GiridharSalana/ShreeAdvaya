// Consolidated API route: /api/auth
// Handles all authentication operations via query parameter ?action=login|register|verify|users
// Uses ADMIN_PASSWORD as JWT secret and for password decryption

import { authenticateUser, loadUsers, encryptPassword } from './auth/users.js';
import { generateToken, verifyToken } from './auth/jwt.js';

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
                message: message || `Auth operation - ${new Date().toISOString()}`,
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
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Get action from query parameter
    const { action } = req.query;

    // Route to appropriate handler
    if (action === 'login') {
        return handleLogin(req, res);
    } else if (action === 'register') {
        return handleRegister(req, res);
    } else if (action === 'verify') {
        return handleVerify(req, res);
    } else if (action === 'users') {
        return handleUsers(req, res);
    } else {
        // Default: try to infer from method (backward compatibility)
        if (req.method === 'POST') {
            // Could be login or register - check body
            let body = {};
            try {
                body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            } catch (e) {
                return res.status(400).json({ error: 'Invalid JSON body' });
            }
            
            // If has username/password, assume login; if has username/password/role, assume register
            if (body.username && body.password && body.role !== undefined) {
                return handleRegister(req, res);
            } else {
                return handleLogin(req, res);
            }
        } else if (req.method === 'GET' || req.method === 'PUT' || req.method === 'DELETE') {
            return handleUsers(req, res);
        }
        
        return res.status(400).json({ error: 'Invalid action. Use ?action=login|register|verify|users' });
    }
}

// Login handler
async function handleLogin(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let body = {};
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const { username, password } = body;
    
    if (!password || typeof password !== 'string') {
        return res.status(400).json({ error: 'Password required' });
    }

    // If username provided, use multi-user authentication
    if (username && typeof username === 'string') {
        const user = await authenticateUser(username, password);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = generateToken(user);
        return res.status(200).json({ 
            success: true, 
            token: token,
            user: {
                username: user.username,
                role: user.role
            },
            expiresIn: 3600
        });
    }

    // Fallback: Single password authentication
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    if (!ADMIN_PASSWORD) {
        return res.status(500).json({ error: 'Admin password not configured' });
    }

    if (password === ADMIN_PASSWORD) {
        const token = generateToken({ username: 'admin', role: 'admin' });
        return res.status(200).json({ 
            success: true, 
            token: token,
            expiresIn: 3600
        });
    } else {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
}

// Register handler
async function handleRegister(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const existingUsers = await loadUsers();
    const isFirstUser = existingUsers.length === 0;
    
    if (!isFirstUser) {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '') || req.body?.token;
        
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const verification = verifyToken(token);
        if (!verification.valid) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        if (verification.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
    }

    let body = {};
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const { username, password, role = 'editor', email } = body;

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
        return res.status(400).json({ error: 'Username is required' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' });
    }

    const validRoles = ['admin', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` });
    }

    try {
        const users = await loadUsers();

        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const encryptedPassword = encryptPassword(password);
        const finalRole = isFirstUser ? 'admin' : role;

        const newUser = {
            username: username.trim(),
            encryptedPassword: encryptedPassword,
            role: finalRole,
            email: email || `${username}@shreeadvaya.com`,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);

        // Ensure Admin user is always included
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
            } else {
                const adminIndex = users.findIndex(u => u.username.toLowerCase() === 'admin');
                if (adminIndex !== -1) {
                    users[adminIndex].isDefault = true;
                }
            }
        }

        const githubToken = process.env.GITHUB_TOKEN;
        const owner = process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER;
        const repo = process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG;

        if (!githubToken || !owner || !repo) {
            return res.status(500).json({ error: 'GitHub configuration missing' });
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

// Verify handler
async function handleVerify(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || req.body?.token;

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

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

// Users management handler
async function handleUsers(req, res) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const verification = verifyToken(token);
    if (!verification.valid) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (verification.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    // GET - List users
    if (req.method === 'GET') {
        try {
            const users = await loadUsers();
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
        let body = {};
        try {
            body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch (e) {
            return res.status(400).json({ error: 'Invalid JSON body' });
        }

        const { username, password, role, email } = body;

        if (!username || typeof username !== 'string') {
            return res.status(400).json({ error: 'Username is required' });
        }

        if (role !== undefined) {
            const validRoles = ['admin', 'editor', 'viewer'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` });
            }
        }

        if (password !== undefined && (typeof password !== 'string' || password.length < 6)) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        try {
            const users = await loadUsers();
            const userIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
            
            if (userIndex === -1) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (users[userIndex].isDefault) {
                if (role && role !== 'admin') {
                    return res.status(400).json({ error: 'Cannot change default admin user role' });
                }
                if (username.toLowerCase() !== 'admin') {
                    return res.status(400).json({ error: 'Cannot change default admin username' });
                }
            }

            if (password) {
                users[userIndex].encryptedPassword = encryptPassword(password);
            }
            if (role && !users[userIndex].isDefault) {
                users[userIndex].role = role;
            }
            if (email !== undefined) {
                users[userIndex].email = email || `${username}@shreeadvaya.com`;
            }
            
            if (users[userIndex].username.toLowerCase() === 'admin') {
                users[userIndex].isDefault = true;
            }

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

            const githubToken = process.env.GITHUB_TOKEN;
            const owner = process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER;
            const repo = process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG;

            if (!githubToken || !owner || !repo) {
                return res.status(500).json({ error: 'GitHub configuration missing' });
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
        let body = {};
        try {
            body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch (e) {
            return res.status(400).json({ error: 'Invalid JSON body' });
        }

        const { username } = body;

        if (!username || typeof username !== 'string') {
            return res.status(400).json({ error: 'Username is required' });
        }

        try {
            const users = await loadUsers();
            const userIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
            
            if (userIndex === -1) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (users[userIndex].isDefault) {
                return res.status(400).json({ error: 'Cannot delete default admin user' });
            }

            if (users[userIndex].username.toLowerCase() === verification.user.username.toLowerCase()) {
                return res.status(400).json({ error: 'Cannot delete your own account' });
            }

            users.splice(userIndex, 1);

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

            const githubToken = process.env.GITHUB_TOKEN;
            const owner = process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER;
            const repo = process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG;

            if (!githubToken || !owner || !repo) {
                return res.status(500).json({ error: 'GitHub configuration missing' });
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
