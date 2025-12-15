// API route: /api/upload
// Handles file uploads and saves them to GitHub repository
// Using multipart form data (no base64 bloat)

export const config = {
    api: {
        bodyParser: false, // Disable default body parser to handle multipart
    },
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify authentication
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token || !(await verifyToken(token))) {
        return res.status(401).json({ error: 'Unauthorized. Please login.' });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_OWNER = process.env.VERCEL_GIT_REPO_OWNER || process.env.GITHUB_OWNER || 'Giridharsalana';
    const GITHUB_REPO = process.env.VERCEL_GIT_REPO_SLUG || process.env.GITHUB_REPO || 'Shree-Advaya';

    if (!GITHUB_TOKEN) {
        return res.status(500).json({ error: 'GitHub token not configured' });
    }

    try {
        // Parse multipart form data
        const { files, folder } = await parseMultipartForm(req);
        
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No images provided' });
        }

        const targetFolder = folder || 'images';
        const uploadedFiles = [];

        // Process each file
        for (const file of files) {
            const { buffer, filename, mimetype } = file;
            
            // Get extension from mimetype or filename
            let extension = 'jpg';
            if (mimetype) {
                const mimeMap = {
                    'image/jpeg': 'jpg',
                    'image/jpg': 'jpg',
                    'image/png': 'png',
                    'image/gif': 'gif',
                    'image/webp': 'webp',
                    'image/svg+xml': 'svg',
                    'image/bmp': 'bmp',
                    'image/x-icon': 'ico',
                };
                extension = mimeMap[mimetype] || extension;
            } else if (filename) {
                const parts = filename.split('.');
                if (parts.length > 1) {
                    extension = parts[parts.length - 1].toLowerCase();
                }
            }

            const fileName = `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${extension}`;
            const filePath = `assets/${targetFolder}/${fileName}`;
            
            // Convert buffer to base64 for GitHub API
            const fileContent = buffer.toString('base64');
            
            // Check if file already exists
            let sha = null;
            try {
                const checkResponse = await fetch(
                    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${GITHUB_TOKEN}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'X-GitHub-Api-Version': '2022-11-28'
                        }
                    }
                );
                if (checkResponse.ok) {
                    const fileData = await checkResponse.json();
                    sha = fileData.sha;
                }
            } catch (error) {
                // File doesn't exist, that's fine
            }

            // Upload file to GitHub
            const uploadResponse = await fetch(
                `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json',
                        'X-GitHub-Api-Version': '2022-11-28'
                    },
                    body: JSON.stringify({
                        message: `Upload ${fileName} via admin panel`,
                        content: fileContent,
                        sha: sha
                    })
                }
            );

            if (!uploadResponse.ok) {
                const error = await uploadResponse.json();
                console.error('GitHub upload error:', error);
                throw new Error(`Failed to upload ${fileName}: ${error.message || uploadResponse.statusText}`);
            }

            const uploadResult = await uploadResponse.json();
            
            // Generate the raw file URL
            const rawUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${filePath}`;
            
            uploadedFiles.push({
                filename: fileName,
                path: filePath,
                url: rawUrl,
                size: buffer.length
            });
        }

        return res.status(200).json({
            success: true,
            files: uploadedFiles,
            message: `Successfully uploaded ${uploadedFiles.length} file(s)`
        });

    } catch (error) {
        console.error('Upload API Error:', error);
        return res.status(500).json({ error: error.message || 'Failed to upload files' });
    }
}

// Parse multipart form data manually (no dependencies needed)
async function parseMultipartForm(req) {
    return new Promise((resolve, reject) => {
        const contentType = req.headers['content-type'] || '';
        
        if (!contentType.includes('multipart/form-data')) {
            return reject(new Error('Content-Type must be multipart/form-data'));
        }

        // Extract boundary
        const boundary = contentType.split('boundary=')[1];
        if (!boundary) {
            return reject(new Error('No boundary found in Content-Type'));
        }

        const chunks = [];
        let totalLength = 0;

        req.on('data', chunk => {
            chunks.push(chunk);
            totalLength += chunk.length;
        });

        req.on('end', () => {
            try {
                const buffer = Buffer.concat(chunks, totalLength);
                const parts = parseMultipart(buffer, boundary);
                
                const files = [];
                let folder = 'images';

                parts.forEach(part => {
                    if (part.name === 'folder') {
                        folder = part.data.toString('utf-8');
                    } else if (part.name === 'images' && part.filename) {
                        files.push({
                            buffer: part.data,
                            filename: part.filename,
                            mimetype: part.contentType
                        });
                    }
                });

                resolve({ files, folder });
            } catch (error) {
                reject(error);
            }
        });

        req.on('error', reject);
    });
}

// Parse multipart buffer into parts
function parseMultipart(buffer, boundary) {
    const parts = [];
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const endBoundaryBuffer = Buffer.from(`--${boundary}--`);
    
    let position = 0;
    
    while (position < buffer.length) {
        // Find next boundary
        const boundaryIndex = buffer.indexOf(boundaryBuffer, position);
        if (boundaryIndex === -1) break;
        
        position = boundaryIndex + boundaryBuffer.length;
        
        // Skip CRLF after boundary
        if (buffer[position] === 0x0D && buffer[position + 1] === 0x0A) {
            position += 2;
        }
        
        // Check if this is the end boundary
        if (buffer.slice(position - 2, position).toString() === '--') {
            break;
        }
        
        // Find headers end (double CRLF)
        const headersEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), position);
        if (headersEnd === -1) break;
        
        const headers = buffer.slice(position, headersEnd).toString('utf-8');
        position = headersEnd + 4;
        
        // Parse headers
        const part = parsePartHeaders(headers);
        
        // Find next boundary to get data
        const nextBoundary = buffer.indexOf(boundaryBuffer, position);
        if (nextBoundary === -1) break;
        
        // Extract data (remove trailing CRLF)
        let dataEnd = nextBoundary;
        if (buffer[dataEnd - 2] === 0x0D && buffer[dataEnd - 1] === 0x0A) {
            dataEnd -= 2;
        }
        
        part.data = buffer.slice(position, dataEnd);
        parts.push(part);
        
        position = nextBoundary;
    }
    
    return parts;
}

// Parse part headers
function parsePartHeaders(headers) {
    const part = {};
    const lines = headers.split('\r\n');
    
    lines.forEach(line => {
        if (line.toLowerCase().startsWith('content-disposition:')) {
            // Extract name and filename
            const nameMatch = line.match(/name="([^"]+)"/);
            const filenameMatch = line.match(/filename="([^"]+)"/);
            
            if (nameMatch) part.name = nameMatch[1];
            if (filenameMatch) part.filename = filenameMatch[1];
        } else if (line.toLowerCase().startsWith('content-type:')) {
            part.contentType = line.split(':')[1].trim();
        }
    });
    
    return part;
}

async function verifyToken(token) {
    if (!token) return false;
    
    try {
        const tokenTimestamp = parseInt(token.slice(-8), 36);
        const currentTime = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        return (currentTime - tokenTimestamp) <= oneHour;
    } catch (error) {
        return false;
    }
}
