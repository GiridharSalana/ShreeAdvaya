// User management utilities with encrypted password storage
// Passwords are encrypted in JSON using ADMIN_PASSWORD as the encryption key
// ADMIN_PASSWORD is also used as JWT secret

import crypto from 'crypto';

/**
 * Get encryption key from ADMIN_PASSWORD
 * Derives a consistent key from ADMIN_PASSWORD for AES-256 encryption
 */
function getEncryptionKey() {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
        throw new Error('ADMIN_PASSWORD environment variable is required');
    }
    // Derive a 32-byte key from ADMIN_PASSWORD using SHA-256
    return crypto.createHash('sha256').update(adminPassword).digest();
}

/**
 * Encrypt password using AES-256-GCM
 * Uses ADMIN_PASSWORD as the encryption key
 */
export function encryptPassword(password) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16); // Initialization vector
    
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag(); // For authentication
    
    // Return: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt password using AES-256-GCM
 * Uses ADMIN_PASSWORD as the decryption key
 */
export function decryptPassword(encryptedPassword) {
    try {
        const key = getEncryptionKey();
        const parts = encryptedPassword.split(':');
        
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted password format');
        }
        
        const [ivHex, authTagHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
}

/**
 * Get default Admin user object
 */
function getDefaultAdminUser() {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
        // Fallback: Plain text for backward compatibility (if ADMIN_PASSWORD not set)
        console.warn('ADMIN_PASSWORD not set. Using plain text password (not recommended).');
        return {
            username: 'Admin',
            encryptedPassword: 'admin', // Plain text for backward compat
            role: 'admin',
            email: 'admin@shreeadvaya.com',
            createdAt: new Date().toISOString(),
            isPlainText: true, // Flag for backward compatibility
            isDefault: true // Flag to indicate this is the default admin
        };
    }
    
    // Create default Admin user with encrypted password
    const encryptedPassword = encryptPassword(adminPassword);
    return {
        username: 'Admin',
        encryptedPassword: encryptedPassword,
        role: 'admin',
        email: 'admin@shreeadvaya.com',
        createdAt: new Date().toISOString(),
        isDefault: true // Flag to indicate this is the default admin
    };
}

/**
 * Load users from GitHub (or fallback to environment variable)
 * Always ensures default "Admin" user exists
 */
export async function loadUsers() {
    let users = [];
    
    try {
        // Try to load from GitHub
        const githubToken = process.env.GITHUB_TOKEN;
        const owner = process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER;
        const repo = process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG;
        
        if (githubToken && owner && repo) {
            const response = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/data/users.json`,
                {
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3.raw'
                    }
                }
            );
            
            if (response.ok) {
                const loadedUsers = await response.json();
                users = Array.isArray(loadedUsers) ? loadedUsers : [];
            }
        }
    } catch (error) {
        console.error('Error loading users from GitHub:', error);
    }
    
    // Fallback: Load from environment variable (for initial setup)
    if (users.length === 0) {
        const usersEnv = process.env.ADMIN_USERS;
        if (usersEnv) {
            users = usersEnv.split(',').map(userStr => {
                const [username, encryptedPassword, role = 'admin'] = userStr.split(':');
                return { username, encryptedPassword, role };
            });
        }
    }
    
    // Always ensure default "Admin" user exists
    const defaultAdmin = getDefaultAdminUser();
    const adminExists = users.some(u => u.username.toLowerCase() === 'admin');
    
    if (!adminExists) {
        // Add default Admin user at the beginning of the array
        users.unshift(defaultAdmin);
    } else {
        // Update existing Admin user to ensure it has isDefault flag and correct properties
        const adminIndex = users.findIndex(u => u.username.toLowerCase() === 'admin');
        if (adminIndex !== -1) {
            users[adminIndex] = {
                ...users[adminIndex],
                ...defaultAdmin,
                // Preserve existing encryptedPassword if it's different from default
                encryptedPassword: users[adminIndex].encryptedPassword || defaultAdmin.encryptedPassword,
                isDefault: true
            };
        }
    }
    
    return users;
}

/**
 * Find user by username
 */
export async function findUser(username) {
    const users = await loadUsers();
    return users.find(u => u.username === username);
}

/**
 * Authenticate user
 * Decrypts password from JSON and compares with provided password
 */
export async function authenticateUser(username, password) {
    const user = await findUser(username);
    if (!user) {
        return null; // Don't reveal if user exists
    }
    
    // Handle backward compatibility with plain text passwords
    if (user.isPlainText) {
        if (password === user.encryptedPassword) {
            return { username: user.username, role: user.role || 'admin' };
        }
        return null;
    }
    
    // Decrypt password from JSON
    const decryptedPassword = decryptPassword(user.encryptedPassword);
    if (!decryptedPassword) {
        console.error('Failed to decrypt password for user:', username);
        return null;
    }
    
    // Compare decrypted password with provided password
    if (password === decryptedPassword) {
        return { username: user.username, role: user.role || 'admin' };
    }
    
    return null;
}

/**
 * Get JWT secret from ADMIN_PASSWORD
 */
export function getJWTSecret() {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
        throw new Error('ADMIN_PASSWORD environment variable is required for JWT');
    }
    return adminPassword;
}
