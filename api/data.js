// Consolidated API route: /api/data
// Handles content and batch operations via query parameter ?action=content|batch

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
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Get action from query parameter
    const { action } = req.query;

    // Route to appropriate handler
    if (action === 'content') {
        return handleContent(req, res);
    } else if (action === 'batch') {
        return handleBatch(req, res);
    } else {
        // Default: content for GET, batch for POST
        if (req.method === 'GET') {
            return handleContent(req, res);
        } else if (req.method === 'POST') {
            return handleBatch(req, res);
        }
        return res.status(400).json({ error: 'Invalid action. Use ?action=content|batch' });
    }
}

// Content handler
async function handleContent(req, res) {
    // Parse request body for PUT requests
    let body = {};
    if (req.method === 'PUT') {
        try {
            body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch (e) {
            return res.status(400).json({ error: 'Invalid JSON body' });
        }
    }

    const { method } = req;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_OWNER = process.env.VERCEL_GIT_REPO_OWNER || process.env.GITHUB_OWNER || 'your-username';
    const GITHUB_REPO = process.env.VERCEL_GIT_REPO_SLUG || process.env.GITHUB_REPO || 'ShreeAdvaya';
    const DATA_FILE = 'data/content.json';

    if (!GITHUB_TOKEN) {
        return res.status(500).json({ error: 'GitHub token not configured' });
    }

    try {
        if (method === 'GET') {
            const content = await getFileFromGitHub(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, DATA_FILE);
            return res.status(200).json(content);
        }

        if (method === 'PUT') {
            const content = await getFileFromGitHub(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, DATA_FILE);
            const updatedContent = {
                ...content,
                ...body,
                updatedAt: new Date().toISOString()
            };
            await saveFileToGitHub(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, DATA_FILE, updatedContent);
            return res.status(200).json(updatedContent);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}

// Batch handler
async function handleBatch(req, res) {
    // Verify authentication
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized. Please login.' });
    }

    const verification = verifyToken(token);
    if (!verification.valid) {
        return res.status(401).json({ error: 'Unauthorized. Invalid or expired token.' });
    }

    // Parse request body
    let body = {};
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_OWNER = process.env.VERCEL_GIT_REPO_OWNER || process.env.GITHUB_OWNER || 'your-username';
    const GITHUB_REPO = process.env.VERCEL_GIT_REPO_SLUG || process.env.GITHUB_REPO || 'ShreeAdvaya';

    if (!GITHUB_TOKEN) {
        return res.status(500).json({ error: 'GitHub token not configured' });
    }

    try {
        const results = {};
        const filesToUpdate = {};

        // Process Products
        if (body.products) {
            const products = await getFileFromGitHub(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, 'data/products.json');
            
            if (body.products.update) {
                body.products.update.forEach(update => {
                    const index = products.findIndex(p => p.id === update.id);
                    if (index !== -1) {
                        products[index] = { ...products[index], ...update, updatedAt: new Date().toISOString() };
                    }
                });
            }
            
            if (body.products.create) {
                body.products.create.forEach(item => {
                    const newProduct = {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        ...item,
                        createdAt: new Date().toISOString()
                    };
                    products.push(newProduct);
                });
            }
            
            // Apply deletions
            if (body.products.delete && body.products.delete.length > 0) {
                const deleteIds = body.products.delete.filter(id => !id.startsWith('temp_'));
                products = products.filter(p => !deleteIds.includes(p.id));
            }
            
            // Update file if there are any changes
            const hasChanges = 
                (body.products.create && body.products.create.length > 0) ||
                (body.products.update && body.products.update.length > 0) ||
                (body.products.delete && body.products.delete.length > 0);
            
            if (hasChanges) {
                filesToUpdate['data/products.json'] = products;
            }
            
            if (filesToUpdate['data/products.json']) {
                results.products = { success: true, count: filesToUpdate['data/products.json'].length };
            }
        }

        // Process Gallery
        if (body.gallery) {
            const gallery = await getFileFromGitHub(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, 'data/gallery.json');
            
            if (body.gallery.update) {
                body.gallery.update.forEach(update => {
                    const index = gallery.findIndex(g => g.id === update.id);
                    if (index !== -1) {
                        gallery[index] = { ...gallery[index], ...update, updatedAt: new Date().toISOString() };
                    }
                });
            }
            
            if (body.gallery.create) {
                body.gallery.create.forEach(item => {
                    const newItem = {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        ...item,
                        createdAt: new Date().toISOString()
                    };
                    gallery.push(newItem);
                });
            }
            
            // Apply deletions
            if (body.gallery.delete && body.gallery.delete.length > 0) {
                const deleteIds = body.gallery.delete.filter(id => !id.startsWith('temp_'));
                gallery = gallery.filter(g => !deleteIds.includes(g.id));
            }
            
            // Update file if there are any changes
            const hasChanges = 
                (body.gallery.create && body.gallery.create.length > 0) ||
                (body.gallery.update && body.gallery.update.length > 0) ||
                (body.gallery.delete && body.gallery.delete.length > 0);
            
            if (hasChanges) {
                filesToUpdate['data/gallery.json'] = gallery;
            }
            
            if (filesToUpdate['data/gallery.json']) {
                results.gallery = { success: true, count: filesToUpdate['data/gallery.json'].length };
            }
        }

        // Process Hero Images
        if (body.hero) {
            const heroes = await getFileFromGitHub(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, 'data/hero.json');
            
            if (body.hero.update) {
                body.hero.update.forEach(update => {
                    const index = heroes.findIndex(h => h.id === update.id);
                    if (index !== -1) {
                        heroes[index] = { ...heroes[index], ...update, updatedAt: new Date().toISOString() };
                    }
                });
            }
            
            if (body.hero.create) {
                let counter = 0;
                body.hero.create.forEach(item => {
                    const newItem = {
                        id: (Date.now() + counter++).toString(),
                        ...item,
                        createdAt: new Date().toISOString()
                    };
                    heroes.push(newItem);
                });
            }
            
            // Apply deletions
            if (body.hero.delete && body.hero.delete.length > 0) {
                const deleteIds = body.hero.delete.filter(id => !id.startsWith('temp_'));
                heroes = heroes.filter(h => !deleteIds.includes(h.id));
            }
            
            // Update file if there are any changes
            const hasChanges = 
                (body.hero.create && body.hero.create.length > 0) ||
                (body.hero.update && body.hero.update.length > 0) ||
                (body.hero.delete && body.hero.delete.length > 0);
            
            if (hasChanges) {
                filesToUpdate['data/hero.json'] = heroes;
            }
            
            if (filesToUpdate['data/hero.json']) {
                results.hero = { success: true, count: filesToUpdate['data/hero.json'].length };
            }
        }

        // Process Content
        if (body.content && body.content.update) {
            filesToUpdate['data/content.json'] = body.content.update;
            results.content = { success: true };
        }

        // Save all files in a single commit using GitHub Git Data API
        if (Object.keys(filesToUpdate).length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: 'No changes to save',
                results 
            });
        }
        
        const timestamp = new Date().toISOString();
        const commitMessage = `Batch update via admin panel - ${timestamp}`;
        
        // Get current commit SHA
        const currentCommit = await getCurrentCommit(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO);
        const branch = currentCommit.branch || 'main';
        
        // Create tree with all file updates
        const tree = await createTree(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, currentCommit.treeSha, filesToUpdate);
        
        // Create commit
        const commit = await createCommit(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, commitMessage, tree.sha, currentCommit.sha);
        
        // Update reference (push commit)
        await updateReference(GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, commit.sha, branch);

        return res.status(200).json({ 
            success: true, 
            message: 'All changes saved successfully in a single commit',
            commitSha: commit.sha,
            results 
        });
    } catch (error) {
        console.error('Batch API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}

// Helper functions
async function getFileFromGitHub(token, owner, repo, path) {
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

        if (response.status === 404) {
            return path.includes('content.json') ? {} : [];
        }

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error('Error fetching from GitHub:', error);
        return path.includes('content.json') ? {} : [];
    }
}

async function saveFileToGitHub(token, owner, repo, path, data) {
    let sha = null;
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
            sha = fileData.sha;
        }
    } catch (error) {
        // File doesn't exist yet
    }

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

async function getCurrentCommit(token, owner, repo) {
    // Try to get default branch from repo info, fallback to main/master
    let branch = 'main';
    try {
        const repoResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            }
        );
        if (repoResponse.ok) {
            const repoData = await repoResponse.json();
            branch = repoData.default_branch || 'main';
        }
    } catch (e) {
        // Fallback to main if repo info fetch fails
        branch = 'main';
    }
    
    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        }
    );
    
    if (!response.ok) {
        // Try master branch as fallback
        if (branch === 'main') {
            const masterResponse = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/master`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'X-GitHub-Api-Version': '2022-11-28'
                    }
                }
            );
            if (masterResponse.ok) {
                const ref = await masterResponse.json();
                const commitSha = ref.object.sha;
                const commitResponse = await fetch(
                    `https://api.github.com/repos/${owner}/${repo}/git/commits/${commitSha}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'X-GitHub-Api-Version': '2022-11-28'
                        }
                    }
                );
                if (commitResponse.ok) {
                    const commit = await commitResponse.json();
                    return { sha: commitSha, treeSha: commit.tree.sha, branch: 'master' };
                }
            }
        }
        throw new Error('Failed to get current commit reference');
    }
    
    const ref = await response.json();
    const commitSha = ref.object.sha;
    
    const commitResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/commits/${commitSha}`,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        }
    );
    
    if (!commitResponse.ok) {
        throw new Error('Failed to get current commit');
    }
    
    const commit = await commitResponse.json();
    return { sha: commitSha, treeSha: commit.tree.sha, branch: branch };
}

async function createTree(token, owner, repo, baseTreeSha, files) {
    const tree = [];
    
    const baseTreeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${baseTreeSha}?recursive=1`,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        }
    );
    
    if (baseTreeResponse.ok) {
        const baseTree = await baseTreeResponse.json();
        const filesToUpdate = Object.keys(files);
        baseTree.tree.forEach(item => {
            if (!filesToUpdate.includes(item.path) && item.type === 'blob') {
                tree.push({
                    path: item.path,
                    mode: item.mode,
                    type: item.type,
                    sha: item.sha
                });
            }
        });
    }
    
    for (const [path, data] of Object.entries(files)) {
        const content = JSON.stringify(data, null, 2);
        const encodedContent = Buffer.from(content).toString('base64');
        
        const blobResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'X-GitHub-Api-Version': '2022-11-28'
                },
                body: JSON.stringify({
                    content: encodedContent,
                    encoding: 'base64'
                })
            }
        );
        
        if (!blobResponse.ok) {
            throw new Error(`Failed to create blob for ${path}`);
        }
        
        const blob = await blobResponse.json();
        tree.push({
            path: path,
            mode: '100644',
            type: 'blob',
            sha: blob.sha
        });
    }
    
    const treeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': '2022-11-28'
            },
            body: JSON.stringify({
                base_tree: baseTreeSha,
                tree: tree
            })
        }
    );
    
    if (!treeResponse.ok) {
        const error = await treeResponse.json();
        throw new Error(`Failed to create tree: ${error.message}`);
    }
    
    return await treeResponse.json();
}

async function createCommit(token, owner, repo, message, treeSha, parentSha) {
    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/commits`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': '2022-11-28'
            },
            body: JSON.stringify({
                message: message,
                tree: treeSha,
                parents: [parentSha]
            })
        }
    );
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create commit: ${error.message}`);
    }
    
    return await response.json();
}

async function updateReference(token, owner, repo, commitSha, branch = 'main') {
    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
        {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': '2022-11-28'
            },
            body: JSON.stringify({
                sha: commitSha
            })
        }
    );
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to update reference: ${error.message}`);
    }
    
    return await response.json();
}

