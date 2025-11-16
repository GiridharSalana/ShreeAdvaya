// API Base URL
const API_BASE = '/api';
const THEME_KEY = 'site_theme';

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'system';
    applyTheme(savedTheme);
    updateThemeButtons(savedTheme);
}

function applyTheme(theme) {
    if (theme === 'system') {
        // Detect system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
}

function updateThemeButtons(theme) {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

function switchTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
    updateThemeButtons(theme);
}

// Listen for system theme changes when set to 'system'
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const savedTheme = localStorage.getItem(THEME_KEY) || 'system';
        if (savedTheme === 'system') {
            applyTheme('system');
        }
    });
}

// Initialize theme immediately (before DOM loads)
initTheme();

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (text == null) return ''; // Handle null/undefined
    if (typeof text !== 'string') {
        // Convert to string for non-string types (numbers, etc.)
        text = String(text);
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load all dynamic content
async function loadDynamicContent() {
    // Load all content in parallel, errors are handled individually
    await Promise.allSettled([
        loadProducts(),
        loadGallery(),
        loadHeroImages(),
        loadContent()
    ]);
}

// Helper function to fetch with fallback to local JSON
async function fetchWithFallback(apiPath, fallbackPath) {
    // Try API first
    try {
        const response = await fetch(`${API_BASE}${apiPath}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        if (response.ok) {
            return await response.json();
        }
        // If API returns 404, immediately try fallback without logging
        if (response.status === 404) {
            // Silently fall through to fallback
        }
    } catch (error) {
        // Network error or other issue - try fallback
    }
    
    // Fallback to local JSON file
    try {
        const fallbackResponse = await fetch(fallbackPath, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        if (fallbackResponse.ok) {
            return await fallbackResponse.json();
        }
    } catch (error) {
        // If fallback also fails, return null
    }
    return null;
}

// Load Products
async function loadProducts() {
    try {
        const products = await fetchWithFallback('/products', '/data/products.json');
        if (!products) {
            throw new Error('Failed to load products');
        }
        
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;
        
        productsGrid.innerHTML = '';
        
        if (products.length === 0) {
            productsGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 40px;">No products available at the moment.</p>';
            return;
        }
        
        products.forEach((product, index) => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.setAttribute('data-category', escapeHtml(product.category || ''));
            
            // Support both single image (backward compatibility) and multiple images
            const productImages = product.images && Array.isArray(product.images) && product.images.length > 0 
                ? product.images 
                : (product.image ? [product.image] : ['assets/images/product-1.webp']);
            
            const productAlt = escapeHtml(product.alt || product.name || '');
            const productName = escapeHtml(product.name || '');
            const productPrice = escapeHtml(String(product.price || ''));
            const safeProductName = productName.replace(/'/g, "\\'");
            const cardId = `product-${product.id || index}`;
            
            // Build image carousel HTML if multiple images, otherwise single image
            let imageHTML = '';
            if (productImages.length > 1) {
                // Multiple images - carousel
                let slidesHTML = '';
                let dotsHTML = '';
                productImages.forEach((img, imgIndex) => {
                    const safeImg = escapeHtml(img);
                    const isActive = imgIndex === 0 ? 'active' : '';
                    slidesHTML += `
                        <div class="product-image-slide ${isActive}">
                            <img src="${safeImg}" alt="${productAlt}" loading="lazy" onerror="this.src='assets/images/product-1.webp'">
                        </div>
                    `;
                    dotsHTML += `<button class="product-image-dot ${isActive}" onclick="showProductImage('${cardId}', ${imgIndex})"></button>`;
                });
                
                imageHTML = `
                    <div class="product-image-carousel" id="${cardId}-carousel">
                        ${slidesHTML}
                        <button class="product-image-nav prev" onclick="changeProductImage('${cardId}', -1)">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="product-image-nav next" onclick="changeProductImage('${cardId}', 1)">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        <div class="product-image-dots">
                            ${dotsHTML}
                        </div>
                    </div>
                `;
            } else {
                // Single image - simple display
                const safeImg = escapeHtml(productImages[0]);
                imageHTML = `
                    <img src="${safeImg}" alt="${productAlt}" loading="lazy" onerror="this.src='assets/images/product-1.webp'">
                `;
            }
            
            card.innerHTML = `
                <div class="product-image">
                    ${imageHTML}
                    <div class="product-overlay">
                        <button class="btn btn-primary" onclick="openWhatsApp('${safeProductName}')">Inquire Now</button>
                    </div>
                </div>
                <div class="product-info">
                    <h3>${productName}</h3>
                    <p class="product-price">₹${productPrice}</p>
                </div>
            `;
            productsGrid.appendChild(card);
        });
        
        // Reinitialize product cards for animations
        const newProductCards = document.querySelectorAll('.product-card');
        initProductCards(newProductCards);
    } catch (error) {
        // Silently handle error - show fallback message
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) {
            productsGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 40px; color: #999;">No products available at the moment.</p>';
        }
    }
}

// Load Gallery
async function loadGallery() {
    try {
        const gallery = await fetchWithFallback('/gallery', '/data/gallery.json');
        if (!gallery) {
            throw new Error('Failed to load gallery');
        }
        
        const galleryGrid = document.getElementById('galleryGrid');
        if (!galleryGrid) return;
        
        galleryGrid.innerHTML = '';
        
        if (gallery.length === 0) {
            galleryGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 40px;">No gallery images available.</p>';
            return;
        }
        
        gallery.forEach((item) => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            const itemImage = escapeHtml(item.image || '');
            const itemAlt = escapeHtml(item.alt || '');
            galleryItem.innerHTML = `<img src="${itemImage}" alt="${itemAlt}" loading="lazy" onerror="this.src='assets/images/new-1.webp'">`;
            galleryGrid.appendChild(galleryItem);
        });
        
        // Reinitialize gallery lightbox
        initGalleryLightbox();
    } catch (error) {
        // Silently handle error - gallery will remain empty
    }
}

// Load Hero Images
async function loadHeroImages() {
    try {
        const heroes = await fetchWithFallback('/hero', '/data/hero.json');
        if (!heroes) {
            throw new Error('Failed to load hero images');
        }
        
        const heroSlideshow = document.getElementById('heroSlideshow');
        if (!heroSlideshow) return;
        
        heroSlideshow.innerHTML = '';
        
        if (heroes.length === 0) {
            // Default hero image if none available
            heroSlideshow.innerHTML = '<div class="hero-slide active" style="background-image: url(\'assets/images/hero-1.webp\')"></div>';
            return;
        }
        
        heroes.forEach((hero, index) => {
            const slide = document.createElement('div');
            slide.className = 'hero-slide';
            if (index === 0) slide.classList.add('active');
            slide.style.backgroundImage = `url(${hero.image})`;
            heroSlideshow.appendChild(slide);
        });
        
        // Initialize hero slideshow
        initHeroSlideshow();
    } catch (error) {
        // Silently handle error - use default hero image
        const heroSlideshow = document.getElementById('heroSlideshow');
        if (heroSlideshow) {
            heroSlideshow.innerHTML = '<div class="hero-slide active" style="background-image: url(\'assets/images/hero-1.webp\')"></div>';
            initHeroSlideshow();
        }
    }
}

// Load Content (About, Contact Info, Hero, Features, Social)
async function loadContent() {
    try {
        const content = await fetchWithFallback('/content', '/data/content.json');
        if (!content) {
            throw new Error('Failed to load content');
        }
        
        // Default values
        const defaults = {
            hero: {
                title: 'Elegance Redefined',
                subtitle: 'Discover our exquisite collection of premium sarees that blend traditional craftsmanship with modern sophistication'
            },
            features: [
                { icon: 'fas fa-gem', title: 'Premium Quality', description: 'Handpicked finest materials and craftsmanship' },
                { icon: 'fas fa-palette', title: 'Unique Designs', description: 'Exclusive patterns and traditional motifs' },
                { icon: 'fas fa-shipping-fast', title: 'Fast Delivery', description: 'Secure and timely delivery across India' },
                { icon: 'fas fa-certificate', title: 'Authentic Collection', description: '100% genuine and certified sarees' }
            ],
            social: {
                facebook: '',
                instagram: '',
                twitter: '',
                youtube: '',
                pinterest: ''
            },
            whatsapp: '919876543210',
            email: 'info@shreeadvaya.com',
            phone: '+91 98765 43210',
            about: 'ShreeAdvaya represents the perfect fusion of traditional Indian craftsmanship and contemporary design. We curate the finest collection of sarees, each piece telling a story of heritage, elegance, and timeless beauty. Our commitment to quality and authenticity ensures that every saree in our collection is a masterpiece, carefully selected to celebrate the rich cultural heritage of India while meeting modern fashion sensibilities.'
        };
        
        // Update hero section
        const heroTitle = document.getElementById('heroTitle');
        const heroSubtitle = document.getElementById('heroSubtitle');
        if (heroTitle) heroTitle.textContent = content.hero?.title || defaults.hero.title;
        if (heroSubtitle) heroSubtitle.textContent = content.hero?.subtitle || defaults.hero.subtitle;
        
        // Update features section
        const featuresContainer = document.getElementById('featuresContainer');
        if (featuresContainer) {
            const features = content.features && content.features.length > 0 ? content.features : defaults.features;
            featuresContainer.innerHTML = '';
            features.forEach(feature => {
                const featureDiv = document.createElement('div');
                featureDiv.className = 'feature';
                featureDiv.innerHTML = `
                    <i class="${feature.icon || 'fas fa-star'}"></i>
                    <h3>${feature.title || ''}</h3>
                    <p>${feature.description || ''}</p>
                `;
                featuresContainer.appendChild(featureDiv);
            });
        }
        
        // Update social links
        const social = content.social || defaults.social;
        const socialFacebook = document.getElementById('socialFacebook');
        const socialInstagram = document.getElementById('socialInstagram');
        const socialTwitter = document.getElementById('socialTwitter');
        const socialYouTube = document.getElementById('socialYouTube');
        const socialPinterest = document.getElementById('socialPinterest');
        
        if (socialFacebook && social.facebook) {
            socialFacebook.href = social.facebook;
            socialFacebook.style.display = 'inline-flex';
        } else if (socialFacebook) {
            socialFacebook.style.display = 'none';
        }
        
        if (socialInstagram && social.instagram) {
            socialInstagram.href = social.instagram;
            socialInstagram.style.display = 'inline-flex';
        } else if (socialInstagram) {
            socialInstagram.style.display = 'none';
        }
        
        if (socialTwitter && social.twitter) {
            socialTwitter.href = social.twitter;
            socialTwitter.style.display = 'inline-flex';
        } else if (socialTwitter) {
            socialTwitter.style.display = 'none';
        }
        
        if (socialYouTube && social.youtube) {
            socialYouTube.href = social.youtube;
            socialYouTube.style.display = 'inline-flex';
        } else if (socialYouTube) {
            socialYouTube.style.display = 'none';
        }
        
        if (socialPinterest && social.pinterest) {
            socialPinterest.href = social.pinterest;
            socialPinterest.style.display = 'inline-flex';
        } else if (socialPinterest) {
            socialPinterest.style.display = 'none';
        }
        
        // Update WhatsApp link (use WhatsApp number for WhatsApp social link)
        const whatsapp = content.whatsapp || defaults.whatsapp;
        const whatsappSocial = document.querySelector('#socialLinks a[aria-label="WhatsApp"]');
        if (whatsappSocial && whatsapp) {
            whatsappSocial.href = `https://wa.me/${whatsapp}`;
        }
        
        // Update about description
        const aboutDesc = document.getElementById('aboutDescription');
        if (aboutDesc) {
            aboutDesc.textContent = content.about || defaults.about;
        }
        
        // Update contact information
        const whatsappEl = document.getElementById('whatsappNumber');
        const whatsappLink = document.getElementById('whatsappLink');
        if (whatsappEl) {
            // Format WhatsApp number: remove all non-digits, then format
            const digitsOnly = whatsapp.replace(/\D/g, '');
            let formatted = whatsapp;
            if (digitsOnly.length === 10) {
                // Format as Indian number: +91 XX XXX XXXX
                formatted = `+91 ${digitsOnly.substring(0, 2)} ${digitsOnly.substring(2, 7)} ${digitsOnly.substring(7)}`;
            } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
                // Format as +91 XX XXX XXXX
                formatted = `+91 ${digitsOnly.substring(2, 4)} ${digitsOnly.substring(4, 9)} ${digitsOnly.substring(9)}`;
            } else if (digitsOnly.length > 0) {
                // Fallback: just add + if not present
                formatted = whatsapp.startsWith('+') ? whatsapp : `+${digitsOnly}`;
            }
            whatsappEl.textContent = formatted;
        }
        if (whatsappLink) {
            // Ensure WhatsApp link uses only digits (no + or spaces)
            const digitsOnly = whatsapp.replace(/\D/g, '');
            whatsappLink.href = `https://wa.me/${digitsOnly}`;
        }
        // Update global WhatsApp function
        window.whatsappNumber = whatsapp;
        
        const email = content.email || defaults.email;
        const emailEl = document.getElementById('contactEmail');
        if (emailEl) emailEl.textContent = email;
        
        const phone = content.phone || defaults.phone;
        const phoneEl = document.getElementById('contactPhone');
        if (phoneEl) phoneEl.textContent = phone;
        
        // Update footer contact info
        const footerPhone = document.querySelector('.footer-section ul.contact-list li:nth-child(1)');
        const footerEmail = document.querySelector('.footer-section ul.contact-list li:nth-child(2)');
        if (footerPhone) footerPhone.innerHTML = `<i class="fas fa-phone"></i> ${phone}`;
        if (footerEmail) footerEmail.innerHTML = `<i class="fas fa-envelope"></i> ${email}`;
    } catch (error) {
        // Silently handle error - defaults will be used
        // Set defaults on error
        const defaults = {
            hero: {
                title: 'Elegance Redefined',
                subtitle: 'Discover our exquisite collection of premium sarees that blend traditional craftsmanship with modern sophistication'
            },
            features: [
                { icon: 'fas fa-gem', title: 'Premium Quality', description: 'Handpicked finest materials and craftsmanship' },
                { icon: 'fas fa-palette', title: 'Unique Designs', description: 'Exclusive patterns and traditional motifs' },
                { icon: 'fas fa-shipping-fast', title: 'Fast Delivery', description: 'Secure and timely delivery across India' },
                { icon: 'fas fa-certificate', title: 'Authentic Collection', description: '100% genuine and certified sarees' }
            ],
            whatsapp: '919876543210',
            email: 'info@shreeadvaya.com',
            phone: '+91 98765 43210',
            about: 'ShreeAdvaya represents the perfect fusion of traditional Indian craftsmanship and contemporary design. We curate the finest collection of sarees, each piece telling a story of heritage, elegance, and timeless beauty. Our commitment to quality and authenticity ensures that every saree in our collection is a masterpiece, carefully selected to celebrate the rich cultural heritage of India while meeting modern fashion sensibilities.'
        };
        
        const heroTitle = document.getElementById('heroTitle');
        const heroSubtitle = document.getElementById('heroSubtitle');
        if (heroTitle) heroTitle.textContent = defaults.hero.title;
        if (heroSubtitle) heroSubtitle.textContent = defaults.hero.subtitle;
        
        const featuresContainer = document.getElementById('featuresContainer');
        if (featuresContainer) {
            featuresContainer.innerHTML = '';
            defaults.features.forEach(feature => {
                const featureDiv = document.createElement('div');
                featureDiv.className = 'feature';
                featureDiv.innerHTML = `
                    <i class="${feature.icon}"></i>
                    <h3>${feature.title}</h3>
                    <p>${feature.description}</p>
                `;
                featuresContainer.appendChild(featureDiv);
            });
        }
        
        const aboutDesc = document.getElementById('aboutDescription');
        if (aboutDesc) aboutDesc.textContent = defaults.about;
        
        const whatsappEl = document.getElementById('whatsappNumber');
        const whatsappLink = document.getElementById('whatsappLink');
        if (whatsappEl) whatsappEl.textContent = '+91 98 765 43210';
        if (whatsappLink) whatsappLink.href = `https://wa.me/${defaults.whatsapp}`;
        window.whatsappNumber = defaults.whatsapp;
        
        const emailEl = document.getElementById('contactEmail');
        if (emailEl) emailEl.textContent = defaults.email;
        
        const phoneEl = document.getElementById('contactPhone');
        if (phoneEl) phoneEl.textContent = defaults.phone;
        
        // Update footer contact info
        const footerPhone = document.getElementById('footerPhone');
        const footerEmail = document.getElementById('footerEmail');
        if (footerPhone) footerPhone.innerHTML = `<i class="fas fa-phone"></i> ${defaults.phone}`;
        if (footerEmail) footerEmail.innerHTML = `<i class="fas fa-envelope"></i> ${defaults.email}`;
    }
}

// Initialize hero slideshow
function initHeroSlideshow() {
    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length === 0) return;
    
    let currentSlide = 0;
    
    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.remove('active');
            if (i === index) {
                slide.classList.add('active');
            }
        });
    }
    
    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }
    
    // Auto-advance slides every 5 seconds
    if (slides.length > 1) {
        setInterval(nextSlide, 5000);
    }
}

// Initialize product cards for filtering
function initProductCards(cards) {
    const categoryBtns = document.querySelectorAll(".category-btn");
    
    categoryBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            categoryBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            
            const category = btn.getAttribute("data-category");
            
            // First, hide all cards instantly without animation to prevent layout jumps
            cards.forEach((card) => {
                card.style.display = "none";
                card.style.opacity = "0";
                card.style.transform = "translateY(0)";
                card.style.transition = "none";
            });
            
            // Then show matching cards with animation
            const visibleCards = Array.from(cards).filter(card => 
                category === "all" || card.getAttribute("data-category") === category
            );
            
            visibleCards.forEach((card, index) => {
                card.style.display = "block";
                card.style.opacity = "0";
                card.style.transform = "translateY(20px)";
                
                // Use requestAnimationFrame for smoother animation
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        card.style.transition = "opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
                        card.style.opacity = "1";
                        card.style.transform = "translateY(0)";
                    }, index * 50);
                });
            });
        });
    });
}

// Initialize gallery lightbox
function initGalleryLightbox() {
    const galleryItems = document.querySelectorAll(".gallery-item");
    galleryItems.forEach((item) => {
        item.addEventListener("click", () => {
            const img = item.querySelector("img");
            const lightbox = createLightbox(img.src, img.alt);
            document.body.appendChild(lightbox);
            
            setTimeout(() => {
                lightbox.style.opacity = "1";
            }, 10);
        });
    });
}

// DOM Elements - Wait for DOM to be ready
let hamburger, navMenu, navLinks, categoryBtns, productCards;

// Initialize DOM elements and event listeners
function initDOM() {
    hamburger = document.querySelector(".hamburger");
    navMenu = document.querySelector(".nav-menu");
    navLinks = document.querySelectorAll(".nav-link");
    categoryBtns = document.querySelectorAll(".category-btn");
    productCards = document.querySelectorAll(".product-card");

    if (!hamburger || !navMenu) {
        console.warn('Navigation elements not found');
        return;
    }

    // Theme switcher buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const theme = e.currentTarget.dataset.theme;
            switchTheme(theme);
        });
    });
    
    // Mobile Navigation Toggle
    hamburger.addEventListener("click", () => {
        hamburger.classList.toggle("active");
        navMenu.classList.toggle("active");
    });

    // Close mobile menu when clicking on a link
    navLinks.forEach((link) => {
        link.addEventListener("click", () => {
            hamburger.classList.remove("active");
            navMenu.classList.remove("active");
        });
    });

    // Smooth scrolling for navigation links
    navLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
            const targetId = link.getAttribute("href");

            // Skip smooth scrolling for external links (admin, etc)
            if (!targetId.startsWith("#")) {
                return; // Let the browser handle normal navigation
            }

            e.preventDefault();
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: "smooth"
                });
            }
        });
    });

    // Product Category Filtering with Smooth Animation
    if (categoryBtns.length > 0) {
        categoryBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
                // Remove active class from all buttons
                categoryBtns.forEach((b) => b.classList.remove("active"));
                // Add active class to clicked button
                btn.classList.add("active");

                const category = btn.getAttribute("data-category");

                if (productCards && productCards.length > 0) {
                    productCards.forEach((card, index) => {
                        if (
                            category === "all" ||
                            card.getAttribute("data-category") === category
                        ) {
                            card.style.display = "block";
                            card.style.opacity = "0";
                            card.style.transform = "translateY(30px)";

                            // Animate in with stagger effect
                            setTimeout(() => {
                                card.style.transition =
                                    "opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
                                card.style.opacity = "1";
                                card.style.transform = "translateY(0)";
                            }, index * 80);
                        } else {
                            card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
                            card.style.opacity = "0";
                            card.style.transform = "translateY(20px)";
                            setTimeout(() => {
                                card.style.display = "none";
                            }, 300);
                        }
                    });
                }
            });
        });
    }
}

// WhatsApp Integration
function openWhatsApp(productName = "") {
  const phoneNumber = window.whatsappNumber || "919876543210";
  const message = productName
    ? `Hi! I'm interested in: ${productName}`
    : "Hi! I would like to know more about your saree collection.";
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
    message
  )}`;
  window.open(whatsappUrl, "_blank");
}

// Enhanced Navbar background on scroll
window.addEventListener("scroll", () => {
  const navbar = document.querySelector(".navbar");
  if (window.scrollY > 50) {
    navbar.style.background = "rgba(255, 255, 255, 0.98)";
    navbar.style.boxShadow = "0 4px 30px rgba(0, 0, 0, 0.08)";
  } else {
    navbar.style.background = "rgba(255, 255, 255, 0.98)";
    navbar.style.boxShadow = "0 2px 20px rgba(0, 0, 0, 0.05)";
  }
});

// Gallery Lightbox Functionality
const galleryItems = document.querySelectorAll(".gallery-item");
galleryItems.forEach((item) => {
  item.addEventListener("click", () => {
    const img = item.querySelector("img");
    const lightbox = createLightbox(img.src, img.alt);
    document.body.appendChild(lightbox);

    // Fade in animation
    setTimeout(() => {
      lightbox.style.opacity = "1";
    }, 10);
  });
});

function createLightbox(src, alt) {
  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.innerHTML = `
        <div class="lightbox-content">
            <span class="lightbox-close">&times;</span>
            <img src="${src}" alt="${alt}">
        </div>
    `;

  lightbox.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

  const content = lightbox.querySelector(".lightbox-content");
  content.style.cssText = `
        position: relative;
        max-width: 90vw;
        max-height: 90vh;
        cursor: default;
        animation: zoomIn 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

  const img = lightbox.querySelector("img");
  img.style.cssText = `
        max-width: 100%;
        max-height: 90vh;
        width: auto;
        height: auto;
        object-fit: contain;
        border-radius: 10px;
        display: block;
    `;

  const closeBtn = lightbox.querySelector(".lightbox-close");
  closeBtn.style.cssText = `
        position: absolute;
        top: -50px;
        right: 0;
        color: white;
        font-size: 40px;
        cursor: pointer;
        z-index: 10001;
        transition: transform 0.3s ease;
        background: rgba(0, 0, 0, 0.5);
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
    `;

  closeBtn.addEventListener("mouseenter", () => {
    closeBtn.style.transform = "rotate(90deg)";
  });

  closeBtn.addEventListener("mouseleave", () => {
    closeBtn.style.transform = "rotate(0deg)";
  });

  // Close lightbox
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) {
      closeLightbox(lightbox);
    }
  });

  closeBtn.addEventListener("click", () => {
    closeLightbox(lightbox);
  });

  // Close with Escape key
  const escapeHandler = (e) => {
    if (e.key === "Escape") {
      closeLightbox(lightbox);
      document.removeEventListener("keydown", escapeHandler);
    }
  };
  document.addEventListener("keydown", escapeHandler);

  return lightbox;
}

function closeLightbox(lightbox) {
  lightbox.style.opacity = "0";
  setTimeout(() => {
    if (lightbox.parentNode) {
      document.body.removeChild(lightbox);
    }
  }, 300);
}

// Add zoom animation for lightbox
const style = document.createElement("style");
style.textContent = `
    @keyframes zoomIn {
        from {
            transform: scale(0.5);
            opacity: 0;
        }
        to {
            transform: scale(1);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Form validation and submission
const contactForm = document.querySelector(".contact-form form");
if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = contactForm.querySelector('input[type="text"]').value;
    const email = contactForm.querySelector('input[type="email"]').value;
    const phone = contactForm.querySelector('input[type="tel"]').value;
    const sareeType = contactForm.querySelector("select").value;
    const message = contactForm.querySelector("textarea").value;

    if (!name || !email || !phone || !sareeType) {
      showNotification("Please fill in all required fields.", "error");
      return;
    }

    const whatsappMessage = `New Inquiry from Website:
Name: ${name}
Email: ${email}
Phone: ${phone}
Saree Type: ${sareeType}
Message: ${message || "No additional message"}`;

    openWhatsApp(whatsappMessage);
  });
}

// Notification System
function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 30px;
        background: ${
          type === "success"
            ? "linear-gradient(135deg, #4CAF50, #45a049)"
            : "linear-gradient(135deg, #f44336, #da190b)"
        };
        color: white;
        padding: 16px 24px;
        border-radius: 50px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-weight: 500;
        opacity: 0;
        transform: translateX(400px);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "1";
    notification.style.transform = "translateX(0)";
  }, 10);

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateX(400px)";
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 400);
  }, 3000);
}

// Add WhatsApp floating button
function createWhatsAppFloat() {
  const whatsappFloat = document.createElement("a");
  whatsappFloat.href = "https://wa.me/919876543210";
  whatsappFloat.target = "_blank";
  whatsappFloat.className = "whatsapp-float";
  whatsappFloat.innerHTML = '<i class="fab fa-whatsapp"></i>';
  whatsappFloat.title = "Chat with us on WhatsApp";

  document.body.appendChild(whatsappFloat);
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    // Initialize DOM elements and event listeners
    initDOM();
    
    // Load dynamic content from APIs
    loadDynamicContent();
    
    // Initialize scroll animations
    initScrollAnimations();
});

// Smooth Scroll Reveal Animations
function initScrollAnimations() {
  const animateElements = document.querySelectorAll(
    ".product-card, .feature, .gallery-item, .contact-item"
  );

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
          }, index * 50);
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    }
  );

  animateElements.forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(30px)";
    el.style.transition =
      "opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
    observer.observe(el);
  });
}

// Smooth parallax effect for hero section
window.addEventListener("scroll", () => {
  const scrolled = window.pageYOffset;
  const heroContent = document.querySelector(".hero-content");
  const heroImage = document.querySelector(".hero-image");

  if (heroContent && scrolled < 800) {
    heroContent.style.transform = `translateY(${scrolled * 0.3}px)`;
    heroContent.style.opacity = 1 - scrolled * 0.001;
  }

  if (heroImage && scrolled < 800) {
    heroImage.style.transform = `translateY(${scrolled * 0.2}px)`;
  }
});


// Keyboard navigation support
document.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    document.body.classList.add("keyboard-navigation");
  }
});

document.addEventListener("mousedown", () => {
  document.body.classList.remove("keyboard-navigation");
});

// Add focus styles for accessibility
const focusStyle = document.createElement("style");
focusStyle.textContent = `
    .keyboard-navigation *:focus {
        outline: 3px solid #d4af37 !important;
        outline-offset: 3px !important;
        border-radius: 5px;
    }
`;
document.head.appendChild(focusStyle);

// Performance optimization: Debounce scroll events
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Smooth fade-in for images when they load
document.querySelectorAll("img").forEach((img) => {
  img.style.opacity = "0";
  img.style.transition = "opacity 0.5s ease";

  if (img.complete) {
    img.style.opacity = "1";
  } else {
    img.addEventListener("load", () => {
      img.style.opacity = "1";
    });
  }
});

// Add click tracking for analytics
function trackClick(element, action) {
  console.log(`Analytics: ${action} - Element:`, element);
  // Add your analytics tracking code here (Google Analytics, etc.)
}

// Track important button clicks
document.addEventListener("click", (e) => {
  if (e.target.matches(".btn-primary")) {
    trackClick(e.target, "Primary Button Click");
  } else if (e.target.matches(".whatsapp-float")) {
    trackClick(e.target, "WhatsApp Float Click");
  } else if (e.target.matches(".product-overlay button")) {
    trackClick(e.target, "Product Inquiry Click");
  } else if (e.target.matches(".category-btn")) {
    trackClick(e.target, "Category Filter Click");
  }
});

// Initialize product cards animation on page load
window.addEventListener("load", () => {
    if (productCards && productCards.length > 0) {
        productCards.forEach((card, index) => {
            setTimeout(() => {
                card.style.opacity = "1";
                card.style.transform = "translateY(0)";
            }, index * 100);
        });
    }
});

// Product Image Carousel Functions
const productCarousels = {};

function initProductCarousel(cardId, totalImages) {
    if (totalImages <= 1) return;
    productCarousels[cardId] = {
        currentIndex: 0,
        totalImages: totalImages
    };
}

function changeProductImage(cardId, direction) {
    if (!productCarousels[cardId]) return;
    
    const carousel = productCarousels[cardId];
    carousel.currentIndex += direction;
    
    if (carousel.currentIndex < 0) {
        carousel.currentIndex = carousel.totalImages - 1;
    } else if (carousel.currentIndex >= carousel.totalImages) {
        carousel.currentIndex = 0;
    }
    
    showProductImage(cardId, carousel.currentIndex);
}

function showProductImage(cardId, index) {
    const carouselEl = document.getElementById(`${cardId}-carousel`);
    if (!carouselEl) return;
    
    const slides = carouselEl.querySelectorAll('.product-image-slide');
    const dots = carouselEl.querySelectorAll('.product-image-dot');
    
    if (slides.length === 0) return;
    
    // Update slides
    slides.forEach((slide, i) => {
        if (i === index) {
            slide.classList.add('active');
        } else {
            slide.classList.remove('active');
        }
    });
    
    // Update dots
    dots.forEach((dot, i) => {
        if (i === index) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
    
    // Update carousel state
    if (productCarousels[cardId]) {
        productCarousels[cardId].currentIndex = index;
    }
}

// Initialize carousels after products are loaded
const originalLoadProducts = loadProducts;
loadProducts = async function() {
    await originalLoadProducts();
    
    // Initialize carousels for products with multiple images
    document.querySelectorAll('.product-image-carousel').forEach(carousel => {
        const cardId = carousel.id.replace('-carousel', '');
        const slides = carousel.querySelectorAll('.product-image-slide');
        if (slides.length > 1) {
            initProductCarousel(cardId, slides.length);
        }
    });
};
