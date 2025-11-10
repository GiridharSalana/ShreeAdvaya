// API Base URL
const API_BASE = '/api';

// Load all dynamic content
async function loadDynamicContent() {
    try {
        await Promise.all([
            loadProducts(),
            loadGallery(),
            loadHeroImages(),
            loadContent()
        ]);
    } catch (error) {
        console.error('Error loading dynamic content:', error);
    }
}

// Load Products
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        if (!response.ok) throw new Error('Failed to load products');
        const products = await response.json();
        
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
            card.setAttribute('data-category', product.category);
            card.innerHTML = `
                <div class="product-image">
                    <img src="${product.image}" alt="${product.alt || product.name}" loading="lazy" onerror="this.src='assets/images/product-1.webp'">
                    <div class="product-overlay">
                        <button class="btn btn-primary" onclick="openWhatsApp('${product.name}')">Inquire Now</button>
                    </div>
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="product-price">₹${product.price}</p>
                </div>
            `;
            productsGrid.appendChild(card);
        });
        
        // Reinitialize product cards for animations
        const newProductCards = document.querySelectorAll('.product-card');
        initProductCards(newProductCards);
    } catch (error) {
        console.error('Error loading products:', error);
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) {
            productsGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 40px; color: #999;">Unable to load products. Please try again later.</p>';
        }
    }
}

// Load Gallery
async function loadGallery() {
    try {
        const response = await fetch(`${API_BASE}/gallery`);
        if (!response.ok) throw new Error('Failed to load gallery');
        const gallery = await response.json();
        
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
            galleryItem.innerHTML = `<img src="${item.image}" alt="${item.alt}" loading="lazy" onerror="this.src='assets/images/new-1.webp'">`;
            galleryGrid.appendChild(galleryItem);
        });
        
        // Reinitialize gallery lightbox
        initGalleryLightbox();
    } catch (error) {
        console.error('Error loading gallery:', error);
    }
}

// Load Hero Images
async function loadHeroImages() {
    try {
        const response = await fetch(`${API_BASE}/hero`);
        if (!response.ok) throw new Error('Failed to load hero images');
        const heroes = await response.json();
        
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
        console.error('Error loading hero images:', error);
        const heroSlideshow = document.getElementById('heroSlideshow');
        if (heroSlideshow) {
            heroSlideshow.innerHTML = '<div class="hero-slide active" style="background-image: url(\'assets/images/hero-1.webp\')"></div>';
        }
    }
}

// Load Content (About, Contact Info)
async function loadContent() {
    try {
        const response = await fetch(`${API_BASE}/content`);
        if (!response.ok) throw new Error('Failed to load content');
        const content = await response.json();
        
        // Default values
        const defaults = {
            whatsapp: '919876543210',
            email: 'info@shreeadvaya.com',
            phone: '+91 98765 43210',
            about: 'ShreeAdvaya represents the perfect fusion of traditional Indian craftsmanship and contemporary design. We curate the finest collection of sarees, each piece telling a story of heritage, elegance, and timeless beauty. Our commitment to quality and authenticity ensures that every saree in our collection is a masterpiece, carefully selected to celebrate the rich cultural heritage of India while meeting modern fashion sensibilities.'
        };
        
        // Update about description
        const aboutDesc = document.getElementById('aboutDescription');
        if (aboutDesc) {
            aboutDesc.textContent = content.about || defaults.about;
        }
        
        // Update contact information
        const whatsapp = content.whatsapp || defaults.whatsapp;
        const whatsappEl = document.getElementById('whatsappNumber');
        const whatsappLink = document.getElementById('whatsappLink');
        if (whatsappEl) {
            const formatted = whatsapp.replace(/(\d{2})(\d{5})(\d{5})/, '+91 $1 $2 $3');
            whatsappEl.textContent = formatted;
        }
        if (whatsappLink) {
            whatsappLink.href = `https://wa.me/${whatsapp}`;
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
        console.error('Error loading content:', error);
        // Set defaults on error
        const defaults = {
            whatsapp: '919876543210',
            email: 'info@shreeadvaya.com',
            phone: '+91 98765 43210',
            about: 'ShreeAdvaya represents the perfect fusion of traditional Indian craftsmanship and contemporary design. We curate the finest collection of sarees, each piece telling a story of heritage, elegance, and timeless beauty. Our commitment to quality and authenticity ensures that every saree in our collection is a masterpiece, carefully selected to celebrate the rich cultural heritage of India while meeting modern fashion sensibilities.'
        };
        
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
            
            cards.forEach((card, index) => {
                if (category === "all" || card.getAttribute("data-category") === category) {
                    card.style.display = "block";
                    card.style.opacity = "0";
                    card.style.transform = "translateY(30px)";
                    
                    setTimeout(() => {
                        card.style.transition = "opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
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

// DOM Elements
const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-menu");
const navLinks = document.querySelectorAll(".nav-link");
const categoryBtns = document.querySelectorAll(".category-btn");
const productCards = document.querySelectorAll(".product-card");

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
categoryBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Remove active class from all buttons
    categoryBtns.forEach((b) => b.classList.remove("active"));
    // Add active class to clicked button
    btn.classList.add("active");

    const category = btn.getAttribute("data-category");

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
  });
});

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

// Add smooth hover effect for product cards
productCards.forEach((card) => {
  card.addEventListener("mouseenter", function () {
    this.style.transform = "translateY(-15px)";
  });

  card.addEventListener("mouseleave", function () {
    this.style.transform = "translateY(0)";
  });
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
  productCards.forEach((card, index) => {
    setTimeout(() => {
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, index * 100);
  });
});
