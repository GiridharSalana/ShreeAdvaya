# ShreeAdvaya - Premium Saree Collection

A modern, elegant website showcasing premium saree collections with seamless WhatsApp integration for business inquiries and a backend-less admin panel for content management.

## About

ShreeAdvaya is a responsive static website designed to showcase a curated collection of traditional and contemporary sarees. The website features a beautiful modern UI with symmetrical layouts, smooth animations, and an elegant gold color scheme that reflects the luxury and tradition of Indian saree craftsmanship.

## Features

- **Hero Slideshow**: Full-screen HD background image slideshow with smooth fade transitions
- **Product Showcase**: Filterable product categories (Silk, Cotton, Designer, Bridal) with dynamic product management
- **Interactive Gallery**: Image gallery with lightbox functionality for detailed viewing
- **WhatsApp Integration**: Direct messaging for instant business inquiries and orders
- **Contact Form**: Quick inquiry form with validation
- **Admin Panel**: Backend-less content management system for editing products, gallery, hero images, and website content
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Smooth Animations**: Scroll-triggered reveals and elegant hover effects
- **Dynamic Content**: All content loaded from JSON files via API endpoints

## Technologies

- HTML5, CSS3, JavaScript
- Font Awesome icons
- Google Fonts (Playfair Display + Inter)
- Vercel Serverless Functions (for API endpoints)
- GitHub API (for content storage)

## Project Structure

```
ShreeAdvaya/
├── index.html              # Main website
├── admin.html              # Admin panel interface
├── vercel.json             # Vercel configuration
├── README.md               # This file
├── data/                   # JSON data files
│   ├── products.json       # Product catalog
│   ├── gallery.json        # Gallery images
│   ├── hero.json           # Hero slideshow images
│   └── content.json        # Website content (hero, features, social, contact)
├── api/                    # Vercel serverless functions
│   ├── auth/               # Authentication endpoints
│   │   ├── login.js        # Login handler
│   │   └── verify.js       # Token verification
│   ├── products.js         # Product CRUD operations
│   ├── gallery.js          # Gallery CRUD operations
│   ├── hero.js             # Hero images CRUD operations
│   ├── content.js          # Content management
│   └── batch.js            # Batch save operations
└── assets/
    ├── css/
    │   ├── styles.css      # Main site styles
    │   └── admin.css       # Admin panel styles
    ├── js/
    │   ├── script.js        # Main site functionality
    │   └── admin.js        # Admin panel functionality
    └── images/             # Logo, favicon, and all images
```

## Admin Panel Setup

### Prerequisites

1. **Vercel Account**: Deploy your site on Vercel
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **GitHub Personal Access Token**: Create a fine-grained token with repository access

### Environment Variables

Set these in your Vercel project settings:

1. **GITHUB_TOKEN**: Your GitHub personal access token
   - Create at: https://github.com/settings/tokens
   - Use fine-grained token with `Contents` and `Metadata` read/write permissions
   - Repository access: Select your repository

2. **ADMIN_PASSWORD**: Your admin panel password
   - Use a strong password
   - Store securely in Vercel environment variables

3. **GITHUB_OWNER**: Your GitHub username (optional, auto-detected)
   - Example: `your-username`

4. **GITHUB_REPO**: Your repository name (optional, auto-detected)
   - Example: `ShreeAdvaya`

5. **ALLOWED_ORIGIN**: Your domain (optional, defaults to shreeadvaya.vercel.app)
   - Example: `https://shreeadvaya.vercel.app`

### GitHub Token Setup

1. Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Set expiration and repository access
4. Select permissions:
   - **Contents**: Read and write
   - **Metadata**: Read-only
5. Copy the token and add it to Vercel environment variables

### Accessing Admin Panel

1. Navigate to `https://your-domain.vercel.app/admin`
2. Enter your admin password
3. Manage your content:
   - **Products**: Add, edit, delete products
   - **Gallery**: Manage gallery images
   - **Hero Images**: Manage slideshow images
   - **Content**: Edit hero text, features, social links, contact info

### Admin Panel Features

- **Batch Save**: Make multiple changes and save all at once in a single Git commit
- **Dynamic Content Management**: Edit hero text, tagline, features, and social media links
- **Image Management**: Add/remove images for products, gallery, and hero slideshow
- **Content Editing**: Update about section, contact information, and social links
- **Token-based Authentication**: Secure access with 1-hour token expiration

## Security

### Implemented Security Measures

- ✅ **Content Security Policy (CSP)**: Prevents XSS attacks
- ✅ **CORS Restrictions**: Only allows requests from your domain
- ✅ **Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.
- ✅ **Token Expiration**: Tokens expire after 1 hour
- ✅ **Secure Token Generation**: Using crypto API for random tokens
- ✅ **HTTPS Enforcement**: Vercel automatically enforces HTTPS

### Security Considerations

**Token Storage**: Tokens are stored in localStorage, which is vulnerable to XSS attacks. However, CSP headers significantly reduce this risk.

**Remaining Risks**:
1. **XSS Attack**: If malicious JavaScript runs, it can access localStorage
   - Mitigation: CSP headers help prevent XSS
   - Better Solution: Use HttpOnly cookies (requires backend changes)

2. **Physical Access**: Someone with device access can see localStorage
   - Mitigation: Always log out on shared devices

3. **Browser Extensions**: Malicious extensions can access localStorage
   - Mitigation: Be careful with browser extensions

### Recommendations for Enhanced Security

1. **Rate Limiting**: Add rate limiting to login endpoint
2. **JWT Tokens**: Implement proper JWT with signature verification
3. **Password Hashing**: Use bcrypt/Argon2 for password hashing
4. **2FA**: Add two-factor authentication for admin accounts
5. **HttpOnly Cookies**: Move tokens from localStorage to secure cookies

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on every push to main branch

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add GITHUB_TOKEN
vercel env add ADMIN_PASSWORD
```

## Development

### Local Development

1. Clone the repository
2. Install dependencies (if any)
3. Use Vercel CLI for local development:
   ```bash
   vercel dev
   ```

### Adding New Features

- **Products**: Edit `data/products.json` or use admin panel
- **Gallery**: Edit `data/gallery.json` or use admin panel
- **Hero Images**: Edit `data/hero.json` or use admin panel
- **Content**: Edit `data/content.json` or use admin panel

## API Endpoints

All API endpoints are serverless functions in the `/api` directory:

- `GET /api/products` - Get all products
- `POST /api/products` - Create product (requires auth)
- `PUT /api/products?id={id}` - Update product (requires auth)
- `DELETE /api/products?id={id}` - Delete product (requires auth)

- `GET /api/gallery` - Get all gallery images
- `POST /api/gallery` - Add gallery image (requires auth)
- `PUT /api/gallery?id={id}` - Update gallery image (requires auth)
- `DELETE /api/gallery?id={id}` - Delete gallery image (requires auth)

- `GET /api/hero` - Get all hero images
- `POST /api/hero` - Add hero image (requires auth)
- `PUT /api/hero?id={id}` - Update hero image (requires auth)
- `DELETE /api/hero?id={id}` - Delete hero image (requires auth)

- `GET /api/content` - Get website content
- `PUT /api/content` - Update content (requires auth)

- `POST /api/batch` - Batch save all changes (requires auth)

- `POST /api/auth/login` - Admin login
- `POST /api/auth/verify` - Verify token

## Assets Folder

The `assets/` folder contains all website assets organized by type:

- **css/**: Stylesheets for main site and admin panel
- **js/**: JavaScript files for functionality
- **images/**: Logo, favicon, hero images, product images, gallery images

All images are optimized in WebP format for faster loading.

## Troubleshooting

### "GitHub token not configured" error
- Check that `GITHUB_TOKEN` is set in Vercel environment variables
- Make sure you've redeployed after adding environment variables

### "GitHub API error: 404"
- Check that `GITHUB_OWNER` and `GITHUB_REPO` are correct
- Verify the repository exists and is accessible

### "GitHub API error: 403"
- Your GitHub token might not have the right permissions
- Regenerate token with `Contents` read/write permissions

### Changes not appearing on website
- Vercel might need a few seconds to redeploy
- Check Vercel deployment logs
- Verify JSON files were updated in GitHub

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is private and proprietary.

---

**ShreeAdvaya** - Where tradition meets elegance.
