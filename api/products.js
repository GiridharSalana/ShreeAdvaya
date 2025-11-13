// API route: /api/products
// Handles product CRUD operations via GitHub API

import { verifyToken } from './auth/jwt.js';

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

    // Verify authentication for write operations
    if (req.method !== 'GET') {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized. Please login.' });
        }

        const verification = verifyToken(token);
        if (!verification.valid) {
            return res.status(401).json({ error: 'Unauthorized. Invalid or expired token.' });
        }
    }

    // Parse request body for POST/PUT requests
    let body = {};
    if (req.method === 'POST' || req.method === 'PUT') {
        try {
            body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch (e) {
            return res.status(400).json({ error: 'Invalid JSON body' });
        }
    }

    const { method, query } = req;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    // Use Vercel's built-in env vars if available, otherwise fallback to custom env vars or defaults
    const GITHUB_OWNER = process.env.VERCEL_GIT_REPO_OWNER || process.env.GITHUB_OWNER || 'your-username';
    const GITHUB_REPO = process.env.VERCEL_GIT_REPO_SLUG || process.env.GITHUB_REPO || 'ShreeAdvaya';
    const DATA_FILE = 'data/products.json';

    if (!GITHUB_TOKEN) {
        return res.status(500).json({ error: 'GitHub token not configured. Please set GITHUB_TOKEN in Vercel environment variables.' });
    }

    try {
        if (method === 'GET') {
            // Get all products
            const products = await getFileFromGitHub(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, DATA_FILE);
            return res.status(200).json(products);
        }

        if (method === 'POST') {
            // Add new product
            const products = await getFileFromGitHub(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, DATA_FILE);
            const newProduct = {
                id: Date.now().toString(),
                ...body,
                createdAt: new Date().toISOString()
            };
            products.push(newProduct);
            await saveFileToGitHub(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, DATA_FILE, products);
            return res.status(201).json(newProduct);
        }

        if (method === 'PUT') {
            // Update product - ID comes from query string
            const { id } = query;
            if (!id) {
                return res.status(400).json({ error: 'Product ID is required' });
            }

            const products = await getFileFromGitHub(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, DATA_FILE);
            const index = products.findIndex(p => p.id === id);
            
            if (index === -1) {
                return res.status(404).json({ error: 'Product not found' });
            }

            products[index] = { ...products[index], ...body, updatedAt: new Date().toISOString() };
            await saveFileToGitHub(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, DATA_FILE, products);
            return res.status(200).json(products[index]);
        }

        if (method === 'DELETE') {
            // Delete product - ID comes from query string
            const { id } = query;
            if (!id) {
                return res.status(400).json({ error: 'Product ID is required' });
            }

            const products = await getFileFromGitHub(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, DATA_FILE);
            const filtered = products.filter(p => p.id !== id);
            
            if (filtered.length === products.length) {
                return res.status(404).json({ error: 'Product not found' });
            }

            await saveFileToGitHub(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, DATA_FILE, filtered);
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}

// Helper functions
async function getFileFromGitHub(token, owner, repo, path) {
    try {
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`, // Works with both classic and fine-grained tokens
                    'Accept': 'application/vnd.github.v3+json',
                    'X-GitHub-Api-Version': '2022-11-28' // Required for fine-grained tokens
                }
            }
        );

        if (response.status === 404) {
            // File doesn't exist, return empty array
            return [];
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return JSON.parse(content);
    } catch (error) {
        // Return empty array on error to prevent crashes
        return [];
    }
}

async function saveFileToGitHub(token, owner, repo, path, data) {
    // First, get the current file to get its SHA
    let sha = null;
    try {
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`, // Works with both classic and fine-grained tokens
                    'Accept': 'application/vnd.github.v3+json',
                    'X-GitHub-Api-Version': '2022-11-28' // Required for fine-grained tokens
                }
            }
        );
        if (response.ok) {
            const fileData = await response.json();
            sha = fileData.sha;
        }
    } catch (error) {
        // File doesn't exist yet, that's okay
    }

    const content = JSON.stringify(data, null, 2);
    const encodedContent = Buffer.from(content).toString('base64');

    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`, // Works with both classic and fine-grained tokens
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': '2022-11-28' // Required for fine-grained tokens
            },
            body: JSON.stringify({
                message: `Update ${path} via admin panel - ${new Date().toISOString()}`,
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

