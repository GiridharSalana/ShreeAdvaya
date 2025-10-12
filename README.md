# ShreeAdvaya - Saree Portfolio Website

A modern, responsive static website for ShreeAdvaya, showcasing premium saree collections with seamless WhatsApp integration for business inquiries.

## Features

### 🎨 Design & UI
- **Modern & Traditional**: Blends contemporary design with traditional Indian aesthetics
- **Responsive Design**: Optimized for all devices (desktop, tablet, mobile)
- **Beautiful Typography**: Uses Playfair Display for headings and Inter for body text
- **Smooth Animations**: Scroll-triggered animations and hover effects
- **Color Scheme**: Gold (#d4af37) and cream (#fef7e0) with elegant gradients

### 📱 Functionality
- **Product Showcase**: Filterable product categories (Silk, Cotton, Designer, Bridal)
- **Image Gallery**: Lightbox functionality for product images
- **WhatsApp Integration**: Direct messaging for business inquiries
- **Contact Form**: Quick inquiry form with WhatsApp integration
- **Smooth Scrolling**: Navigation with smooth scroll behavior
- **Mobile Menu**: Hamburger menu for mobile devices

### 🚀 Performance
- **Static Site**: Fast loading with no backend dependencies
- **Optimized Images**: High-quality images from Unsplash
- **Lazy Loading**: Images load as they come into view
- **Minimal Dependencies**: Only essential external resources

## File Structure

```
ShreeAdvaya/
├── index.html          # Main HTML file
├── styles.css          # CSS styles and responsive design
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## Customization Guide

### 1. Business Information
Update the following in `index.html`:
- **Phone Number**: Replace `+91 98765 43210` with your WhatsApp business number
- **Email**: Update `info@shreeadvaya.com` with your email
- **Location**: Change `Mumbai, Maharashtra, India` to your location
- **Business Name**: Update `ShreeAdvaya` throughout the site

### 2. WhatsApp Integration
In `script.js`, update the phone number:
```javascript
const phoneNumber = '919876543210'; // Replace with your WhatsApp number
```

### 3. Product Information
Update product cards in the Products section:
- **Product Names**: Change the product titles
- **Prices**: Update the pricing
- **Images**: Replace Unsplash URLs with your product images
- **Categories**: Modify or add new product categories

### 4. Images
Replace placeholder images with your own:
- **Hero Image**: Main showcase image
- **About Image**: Business/workshop image
- **Product Images**: Your saree collection photos
- **Gallery Images**: Additional product photos

### 5. Content
Update text content:
- **Hero Section**: Main headline and description
- **About Section**: Your business story and features
- **Contact Information**: All contact details

### 6. Styling
Customize colors and fonts in `styles.css`:
- **Primary Color**: Change `#d4af37` (gold) to your brand color
- **Background**: Modify gradient colors
- **Fonts**: Update Google Fonts imports

## Deployment

### Option 1: GitHub Pages
1. Create a GitHub repository
2. Upload all files to the repository
3. Enable GitHub Pages in repository settings
4. Your site will be available at `https://username.github.io/repository-name`

### Option 2: Netlify
1. Go to [Netlify](https://netlify.com)
2. Drag and drop your project folder
3. Your site will be deployed automatically

### Option 3: Vercel
1. Go to [Vercel](https://vercel.com)
2. Import your project
3. Deploy with one click

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Tips

1. **Optimize Images**: Compress images before uploading
2. **Use WebP Format**: Convert images to WebP for better performance
3. **Minify Files**: Minify CSS and JavaScript for production
4. **CDN**: Use a CDN for faster global delivery

## SEO Features

- Semantic HTML structure
- Meta descriptions and titles
- Alt text for all images
- Proper heading hierarchy
- Mobile-friendly design

## Support

For customization help or questions, refer to the code comments or contact your developer.

## License

This project is created for ShreeAdvaya. All rights reserved.

---

**Note**: Remember to replace all placeholder content with your actual business information before going live.