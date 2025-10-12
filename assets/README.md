# Assets Folder

This folder contains all website assets organized by type.

## Folder Structure

```
assets/
├── css/
│   └── styles.css          # Main stylesheet (20 KB)
├── js/
│   └── script.js           # Main JavaScript file (13 KB)
├── images/
│   ├── hero-1.jpg through hero-4.jpg      # HD slideshow backgrounds
│   ├── product-1.jpg through product-6.jpg # Product card images
│   └── gallery-1.jpg through gallery-6.jpg # Gallery section images
└── README.md               # This file
```

## Directory Details

### `/css` - Stylesheets
- **styles.css** (20 KB) - Main stylesheet containing:
  - Hero slideshow animations
  - Responsive layouts (desktop, tablet, mobile)
  - Modern gradient designs
  - All component styles
  - Custom animations and transitions

### `/js` - JavaScript Files
- **script.js** (13 KB) - Main JavaScript file with:
  - Mobile navigation toggle
  - Product category filtering
  - Gallery lightbox functionality
  - WhatsApp integration
  - Form validation and handling
  - Scroll-triggered animations
  - Keyboard navigation support

### `/images` - All Website Images

#### Logo & Branding
- **logo.svg** (3.0 KB) - Main logo with mandala pattern and "SA" monogram
- **favicon.svg** (1.7 KB) - Favicon/shortcut icon for browser tabs

#### Hero Slideshow (1920x1080 HD WebP - Optimized)
- **hero-1.webp** (53 KB) - Traditional Red Silk Saree
- **hero-2.webp** (251 KB) - Blue Handwoven Cotton Saree
- **hero-3.webp** (53 KB) - Traditional Red Silk Saree variation
- **hero-4.webp** (251 KB) - Blue Handwoven Cotton Saree variation

#### Product Cards (600px WebP)
- **product-1.webp** (16 KB) - Traditional Silk Saree
- **product-2.webp** (134 KB) - Handwoven Cotton Saree
- **product-3.webp** (16 KB) - Embroidered Designer Saree
- **product-4.webp** (16 KB) - Bridal Red & Gold Saree
- **product-5.webp** (26 KB) - Royal Purple Silk Saree
- **product-6.webp** (26 KB) - Printed Cotton Saree

#### Gallery (800px WebP)
- **gallery-1.webp** (23 KB) - Elegant Red Silk Saree Collection
- **gallery-2.webp** (214 KB) - Traditional Blue Saree Collection
- **gallery-3.webp** (23 KB) - Designer Saree Collection
- **gallery-4.webp** (214 KB) - Bridal Saree Collection
- **gallery-5.webp** (37 KB) - Purple Silk Saree Collection
- **gallery-6.webp** (37 KB) - Printed Cotton Saree Collection

## Total Size
**~1.5 MB** (all assets combined - 16 WebP images + 2 SVG logos)
**52% smaller** than original JPG format!
**Hero images optimized**: 1.9MB → 608KB (68% reduction)

## Path References

### In index.html:
```html
<link rel="stylesheet" href="assets/css/styles.css">
<script src="assets/js/script.js"></script>
<img src="assets/images/product-1.webp">
```

### In styles.css:
```css
background-image: url('../images/hero-1.webp');
/* Relative to css/ folder, goes up to assets/ then into images/ */
```

## Image Format & Optimization
All images are in **WebP format** with aggressive optimization:
- 🚀 **52% smaller** than original JPG format
- ⚡ **Hero images**: Resized to 1920x1080 and 70% quality (68% reduction!)
- 📱 **Product/Gallery**: 80% quality for best balance
- ✨ **Preloading**: First hero image preloads for instant display
- 💨 **No buffering**: Optimized file sizes load instantly
- 🔒 **Offline accessibility** - all images stored locally
- 📦 **No external dependencies**

## Benefits of This Structure
- **Organized**: Clear separation of concerns (CSS, JS, Images)
- **Maintainable**: Easy to find and update files
- **Scalable**: Easy to add more files in respective folders
- **Professional**: Follows industry best practices
