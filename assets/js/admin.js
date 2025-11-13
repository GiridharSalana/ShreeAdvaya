// Admin Panel JavaScript
const API_BASE = '/api';
const STORAGE_KEY = 'admin_token';

// User management functionality moved to admin panel

// Batch Save System - Track all changes locally
const pendingChanges = {
    products: { create: [], update: [], delete: [] },
    gallery: { create: [], update: [], delete: [] },
    hero: { create: [], update: [], delete: [] },
    content: { update: null }
};

// Original data cache
const originalData = {
    products: [],
    gallery: [],
    hero: [],
    content: {}
};

// Check authentication on load
document.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        showDashboard();
        setupEventListeners();
        loadData();
    } else {
        showLogin();
    }
});

async function checkAuth() {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
        return false;
    }

    try {
        // Use consolidated auth endpoint with verify action
        const response = await fetch(`${API_BASE}/auth?action=verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ token })
        });

        if (response.ok) {
            const data = await response.json();
            // Update user display if user info available
            if (data.user) {
                localStorage.setItem('admin_user', JSON.stringify(data.user));
                const userDisplay = document.getElementById('currentUser');
                if (userDisplay) {
                    userDisplay.textContent = `👤 ${data.user.username}`;
                }
            }
            return true;
        } else {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem('admin_user');
            return false;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('admin_user');
        return false;
    }
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
}

// Login form handler - supports both single password and multi-user
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username')?.value || '';
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('loginError');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Disable button during login
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';
    errorMsg.classList.remove('show');

    try {
        // Use consolidated auth endpoint with login action
        const loginData = username ? { username, password } : { password };
        const response = await fetch(`${API_BASE}/auth?action=login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            localStorage.setItem(STORAGE_KEY, data.token);
            // Store user info if available
            if (data.user) {
                localStorage.setItem('admin_user', JSON.stringify(data.user));
                const userDisplay = document.getElementById('currentUser');
                if (userDisplay) {
                    userDisplay.textContent = `👤 ${data.user.username}`;
                }
            }
            showDashboard();
            setupEventListeners();
            loadData();
            errorMsg.classList.remove('show');
        } else {
            errorMsg.textContent = data.error || 'Invalid credentials';
            errorMsg.classList.add('show');
        }
    } catch (error) {
        errorMsg.textContent = 'Login failed. Please try again.';
        errorMsg.classList.add('show');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('admin_user');
    showLogin();
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
});

// Tab navigation
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = tab.getAttribute('data-tab');
        
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show correct content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${targetTab}Tab`).classList.add('active');
    });
});

// API Functions
async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const token = localStorage.getItem(STORAGE_KEY);
        if (!token) {
            // Redirect to login if no token
            showLogin();
            throw new Error('Not authenticated');
        }

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        console.log('[DEBUG] API Call:', {
            endpoint: `${API_BASE}${endpoint}`,
            method: method,
            hasToken: !!token,
            hasData: !!data
        });
        
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        
        console.log('[DEBUG] API Response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
        });
        
        // Handle 401 Unauthorized
        if (response.status === 401) {
            console.log('[DEBUG] 401 Unauthorized - removing token');
            localStorage.removeItem(STORAGE_KEY);
            showLogin();
            throw new Error('Session expired. Please login again.');
        }

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        let result;
        
        if (contentType && contentType.includes('application/json')) {
            try {
                const text = await response.text();
                console.log('[DEBUG] Response text:', text.substring(0, 200)); // Log first 200 chars
                if (!text || text.trim() === '') {
                    throw new Error('Empty response from server');
                }
                result = JSON.parse(text);
            } catch (parseError) {
                console.error('[DEBUG] JSON Parse Error:', parseError);
                console.error('[DEBUG] Response was:', await response.clone().text());
                throw new Error('Invalid JSON response from server: ' + parseError.message);
            }
        } else {
            const text = await response.text();
            console.error('[DEBUG] Non-JSON response:', text.substring(0, 500));
            throw new Error(`Server error: ${response.status} ${response.statusText}. Response: ${text.substring(0, 100)}`);
        }
        
        console.log('[DEBUG] API Response data:', result);

        if (!response.ok) {
            console.error('[DEBUG] API Error response:', result);
            throw new Error(result.error || `API request failed: ${response.status}`);
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        showNotification(error.message, 'error');
        throw error;
    }
}

// Load all data
async function loadData() {
    try {
        await Promise.all([
            loadProducts(),
            loadGallery(),
            loadHeroImages(),
            loadContent(),
            loadUsers()
        ]);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Products Management
async function loadProducts() {
    try {
        const products = await apiCall('/products');
        originalData.products = JSON.parse(JSON.stringify(products)); // Deep copy
        
        // Merge with pending changes
        const displayProducts = getDisplayProducts();
        const container = document.getElementById('productsList');
        container.innerHTML = '';

        if (displayProducts.length === 0) {
            container.innerHTML = '<p>No products found. Add your first product!</p>';
            return;
        }

        displayProducts.forEach(product => {
            const card = createProductCard(product);
            container.appendChild(card);
        });
    } catch (error) {
        document.getElementById('productsList').innerHTML = 
            '<p class="error">Error loading products. Make sure API is configured.</p>';
    }
}

// Get products with pending changes applied
function getDisplayProducts() {
    let products = JSON.parse(JSON.stringify(originalData.products));
    
    // Apply updates
    pendingChanges.products.update.forEach(update => {
        const index = products.findIndex(p => p.id === update.id);
        if (index !== -1) {
            products[index] = { ...products[index], ...update };
        }
    });
    
    // Add new items
    products.push(...pendingChanges.products.create);
    
    // Remove deleted items
    products = products.filter(p => !pendingChanges.products.delete.includes(p.id));
    
    return products;
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
        <img src="${product.image}" alt="${product.alt || product.name}" onerror="this.src='assets/images/product-1.webp'">
        <div class="item-card-body">
            <div class="item-card-title">${product.name}</div>
            <div class="item-card-info">
                <div>Category: ${product.category}</div>
                <div>Price: ₹${product.price}</div>
            </div>
            <div class="item-card-actions">
                <button class="btn btn-primary" onclick="editProduct('${product.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="deleteProduct('${product.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
    return card;
}

function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const title = document.getElementById('productModalTitle');

    form.reset();
    document.getElementById('productImagePreview').innerHTML = '';
    uploadedImages.product = null;
    document.getElementById('productImage').removeAttribute('required');

    if (productId) {
        title.textContent = 'Edit Product';
        // Load product data
        loadProductData(productId);
    } else {
        title.textContent = 'Add Product';
        document.getElementById('productId').value = '';
    }

    modal.classList.add('active');
}

async function loadProductData(productId) {
    try {
        const displayProducts = getDisplayProducts();
        const product = displayProducts.find(p => p.id === productId);
        
        if (!product) {
            showNotification('Product not found', 'error');
            return;
        }
        
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productImage').value = product.image;
        document.getElementById('productAlt').value = product.alt || '';
    } catch (error) {
        showNotification('Error loading product', 'error');
    }
}

document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const productId = document.getElementById('productId').value;
    const imageUrl = document.getElementById('productImage').value;
    const uploadedImage = uploadedImages.product;
    
    // Use uploaded image if available, otherwise use URL
    if (!imageUrl && !uploadedImage) {
        showNotification('Please provide either an image URL or upload an image', 'error');
        return;
    }
    
    const productData = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        price: document.getElementById('productPrice').value,
        image: uploadedImage || imageUrl,
        alt: document.getElementById('productAlt').value
    };
    
    // Clear uploaded image after use
    uploadedImages.product = null;

    try {
        if (productId) {
            // Remove from create if it was a new item
            pendingChanges.products.create = pendingChanges.products.create.filter(p => p.id !== productId);
            
            // Add to update queue
            const existingUpdateIndex = pendingChanges.products.update.findIndex(p => p.id === productId);
            if (existingUpdateIndex !== -1) {
                pendingChanges.products.update[existingUpdateIndex] = { ...productData, id: productId };
            } else {
                pendingChanges.products.update.push({ ...productData, id: productId });
            }
            
            showNotification('Product changes saved locally. Click "Save All Changes" to commit.', 'info');
        } else {
            // Add new product with temporary ID
            const newId = 'temp_' + Date.now();
            pendingChanges.products.create.push({ ...productData, id: newId });
            showNotification('Product added locally. Click "Save All Changes" to commit.', 'info');
        }
        
        closeModal('productModal');
        loadProducts();
        updatePendingCount();
    } catch (error) {
        showNotification('Error saving product', 'error');
    }
});

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        // Remove from create queue if it's a new item
        pendingChanges.products.create = pendingChanges.products.create.filter(p => p.id !== productId);
        
        // Remove from update queue
        pendingChanges.products.update = pendingChanges.products.update.filter(p => p.id !== productId);
        
        // Add to delete queue (if not already there)
        if (!pendingChanges.products.delete.includes(productId) && !productId.startsWith('temp_')) {
            pendingChanges.products.delete.push(productId);
        }
        
        showNotification('Product marked for deletion. Click "Save All Changes" to commit.', 'info');
        loadProducts();
        updatePendingCount();
    } catch (error) {
        showNotification('Error deleting product', 'error');
    }
}

function editProduct(productId) {
    openProductModal(productId);
}

// Gallery Management
async function loadGallery() {
    try {
        const gallery = await apiCall('/gallery');
        originalData.gallery = JSON.parse(JSON.stringify(gallery)); // Deep copy
        
        const displayGallery = getDisplayGallery();
        const container = document.getElementById('galleryList');
        container.innerHTML = '';

        if (displayGallery.length === 0) {
            container.innerHTML = '<p>No gallery images found. Add your first image!</p>';
            return;
        }

        displayGallery.forEach(item => {
            const card = createGalleryCard(item);
            container.appendChild(card);
        });
    } catch (error) {
        document.getElementById('galleryList').innerHTML = 
            '<p class="error">Error loading gallery. Make sure API is configured.</p>';
    }
}

function getDisplayGallery() {
    let gallery = JSON.parse(JSON.stringify(originalData.gallery));
    
    pendingChanges.gallery.update.forEach(update => {
        const index = gallery.findIndex(g => g.id === update.id);
        if (index !== -1) {
            gallery[index] = { ...gallery[index], ...update };
        }
    });
    
    gallery.push(...pendingChanges.gallery.create);
    gallery = gallery.filter(g => !pendingChanges.gallery.delete.includes(g.id));
    
    return gallery;
}

function createGalleryCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
        <img src="${item.image}" alt="${item.alt}" onerror="this.src='assets/images/new-1.webp'">
        <div class="item-card-body">
            <div class="item-card-title">${item.alt}</div>
            <div class="item-card-actions">
                <button class="btn btn-danger" onclick="deleteGalleryItem('${item.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
    return card;
}

function openGalleryModal(itemId = null) {
    const modal = document.getElementById('galleryModal');
    const form = document.getElementById('galleryForm');
    const title = document.getElementById('galleryModalTitle');

    form.reset();
    document.getElementById('galleryImagePreview').innerHTML = '';
    uploadedImages.gallery = null;
    document.getElementById('galleryImage').removeAttribute('required');

    if (itemId) {
        title.textContent = 'Edit Gallery Image';
        document.getElementById('galleryId').value = itemId;
    } else {
        title.textContent = 'Add Gallery Image';
        document.getElementById('galleryId').value = '';
    }

    modal.classList.add('active');
}

document.getElementById('galleryForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const itemId = document.getElementById('galleryId').value;
    const imageUrl = document.getElementById('galleryImage').value;
    const uploadedImage = uploadedImages.gallery;
    
    // Use uploaded image if available, otherwise use URL
    if (!imageUrl && !uploadedImage) {
        showNotification('Please provide either an image URL or upload an image', 'error');
        return;
    }
    
    const galleryData = {
        image: uploadedImage || imageUrl,
        alt: document.getElementById('galleryAlt').value
    };
    
    // Clear uploaded image after use
    uploadedImages.gallery = null;

    try {
        if (itemId) {
            pendingChanges.gallery.create = pendingChanges.gallery.create.filter(g => g.id !== itemId);
            const existingUpdateIndex = pendingChanges.gallery.update.findIndex(g => g.id === itemId);
            if (existingUpdateIndex !== -1) {
                pendingChanges.gallery.update[existingUpdateIndex] = { ...galleryData, id: itemId };
            } else {
                pendingChanges.gallery.update.push({ ...galleryData, id: itemId });
            }
            showNotification('Gallery changes saved locally. Click "Save All Changes" to commit.', 'info');
        } else {
            const newId = 'temp_' + Date.now();
            pendingChanges.gallery.create.push({ ...galleryData, id: newId });
            showNotification('Gallery image added locally. Click "Save All Changes" to commit.', 'info');
        }
        
        closeModal('galleryModal');
        loadGallery();
        updatePendingCount();
    } catch (error) {
        showNotification('Error saving gallery image', 'error');
    }
});

async function deleteGalleryItem(itemId) {
    console.log('[DEBUG] deleteGalleryItem called with ID:', itemId);
    
    if (!confirm('Are you sure you want to delete this image?')) {
        console.log('[DEBUG] User cancelled deletion');
        return;
    }

    try {
        pendingChanges.gallery.create = pendingChanges.gallery.create.filter(g => g.id !== itemId);
        pendingChanges.gallery.update = pendingChanges.gallery.update.filter(g => g.id !== itemId);
        
        if (!pendingChanges.gallery.delete.includes(itemId) && !itemId.startsWith('temp_')) {
            pendingChanges.gallery.delete.push(itemId);
        }
        
        showNotification('Gallery image marked for deletion. Click "Save All Changes" to commit.', 'info');
        loadGallery();
        updatePendingCount();
    } catch (error) {
        console.error('[DEBUG] Error deleting gallery item:', error);
        showNotification('Error deleting gallery image: ' + error.message, 'error');
    }
}

// Hero Images Management
async function loadHeroImages() {
    try {
        const heroes = await apiCall('/hero');
        originalData.hero = JSON.parse(JSON.stringify(heroes)); // Deep copy
        
        const displayHeroes = getDisplayHeroes();
        const container = document.getElementById('heroList');
        container.innerHTML = '';

        if (displayHeroes.length === 0) {
            container.innerHTML = '<p>No hero images found. Add your first hero image!</p>';
            return;
        }

        displayHeroes.forEach(item => {
            const card = createHeroCard(item);
            container.appendChild(card);
        });
    } catch (error) {
        document.getElementById('heroList').innerHTML = 
            '<p class="error">Error loading hero images. Make sure API is configured.</p>';
    }
}

function getDisplayHeroes() {
    let heroes = JSON.parse(JSON.stringify(originalData.hero));
    
    pendingChanges.hero.update.forEach(update => {
        const index = heroes.findIndex(h => h.id === update.id);
        if (index !== -1) {
            heroes[index] = { ...heroes[index], ...update };
        }
    });
    
    heroes.push(...pendingChanges.hero.create);
    heroes = heroes.filter(h => !pendingChanges.hero.delete.includes(h.id));
    
    return heroes;
}

function createHeroCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
        <img src="${item.image}" alt="Hero Image" onerror="this.src='assets/images/hero-1.webp'">
        <div class="item-card-body">
            <div class="item-card-title">Hero Image ${item.id}</div>
            <div class="item-card-actions">
                <button class="btn btn-danger" onclick="deleteHeroImage('${item.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
    return card;
}

function openHeroModal(itemId = null) {
    const modal = document.getElementById('heroModal');
    const form = document.getElementById('heroForm');
    const title = document.getElementById('heroModalTitle');

    form.reset();
    document.getElementById('heroImagePreview').innerHTML = '';
    uploadedImages.hero = null;
    document.getElementById('heroImage').removeAttribute('required');

    if (itemId) {
        title.textContent = 'Edit Hero Image';
        document.getElementById('heroId').value = itemId;
    } else {
        title.textContent = 'Add Hero Image';
        document.getElementById('heroId').value = '';
    }

    modal.classList.add('active');
}

document.getElementById('heroForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const itemId = document.getElementById('heroId').value;
    const imageUrl = document.getElementById('heroImage').value;
    const uploadedImage = uploadedImages.hero;
    
    // Use uploaded image if available, otherwise use URL
    if (!imageUrl && !uploadedImage) {
        showNotification('Please provide either an image URL or upload an image', 'error');
        return;
    }
    
    const heroData = {
        image: uploadedImage || imageUrl
    };
    
    // Clear uploaded image after use
    uploadedImages.hero = null;

    try {
        if (itemId) {
            pendingChanges.hero.create = pendingChanges.hero.create.filter(h => h.id !== itemId);
            const existingUpdateIndex = pendingChanges.hero.update.findIndex(h => h.id === itemId);
            if (existingUpdateIndex !== -1) {
                pendingChanges.hero.update[existingUpdateIndex] = { ...heroData, id: itemId };
            } else {
                pendingChanges.hero.update.push({ ...heroData, id: itemId });
            }
            showNotification('Hero image changes saved locally. Click "Save All Changes" to commit.', 'info');
        } else {
            const newId = 'temp_' + Date.now();
            pendingChanges.hero.create.push({ ...heroData, id: newId });
            showNotification('Hero image added locally. Click "Save All Changes" to commit.', 'info');
        }
        
        closeModal('heroModal');
        loadHeroImages();
        updatePendingCount();
    } catch (error) {
        showNotification('Error saving hero image', 'error');
    }
});

async function deleteHeroImage(itemId) {
    if (!confirm('Are you sure you want to delete this hero image?')) return;

    try {
        pendingChanges.hero.create = pendingChanges.hero.create.filter(h => h.id !== itemId);
        pendingChanges.hero.update = pendingChanges.hero.update.filter(h => h.id !== itemId);
        
        if (!pendingChanges.hero.delete.includes(itemId) && !itemId.startsWith('temp_')) {
            pendingChanges.hero.delete.push(itemId);
        }
        
        showNotification('Hero image marked for deletion. Click "Save All Changes" to commit.', 'info');
        loadHeroImages();
        updatePendingCount();
    } catch (error) {
        showNotification('Error deleting hero image', 'error');
    }
}

// Content Management
async function loadContent() {
    try {
        const content = await apiCall('/data?action=content');
        originalData.content = JSON.parse(JSON.stringify(content)); // Deep copy
        
        // Show pending changes if any, otherwise show original
        const displayContent = pendingChanges.content.update || originalData.content;
        
        // Hero section
        if (displayContent.hero) {
            if (displayContent.hero.title) document.getElementById('heroTitle').value = displayContent.hero.title;
            if (displayContent.hero.subtitle) document.getElementById('heroSubtitle').value = displayContent.hero.subtitle;
        }
        
        // Features section
        if (displayContent.features && Array.isArray(displayContent.features)) {
            renderFeaturesForm(displayContent.features);
        } else {
            renderFeaturesForm([]);
        }
        
        // Social links
        if (displayContent.social) {
            if (displayContent.social.facebook) document.getElementById('socialFacebook').value = displayContent.social.facebook;
            if (displayContent.social.instagram) document.getElementById('socialInstagram').value = displayContent.social.instagram;
            if (displayContent.social.twitter) document.getElementById('socialTwitter').value = displayContent.social.twitter;
            if (displayContent.social.youtube) document.getElementById('socialYouTube').value = displayContent.social.youtube;
            if (displayContent.social.pinterest) document.getElementById('socialPinterest').value = displayContent.social.pinterest;
        }
        
        // Contact information
        if (displayContent.about) document.getElementById('aboutText').value = displayContent.about;
        if (displayContent.email) document.getElementById('contactEmail').value = displayContent.email;
        if (displayContent.phone) document.getElementById('contactPhone').value = displayContent.phone;
        if (displayContent.whatsapp) document.getElementById('whatsappNumber').value = displayContent.whatsapp;
    } catch (error) {
        console.error('Error loading content:', error);
    }
}

function renderFeaturesForm(features) {
    const container = document.getElementById('featuresForm');
    container.innerHTML = '';
    
    features.forEach((feature, index) => {
        const featureDiv = document.createElement('div');
        featureDiv.className = 'feature-form-item';
        featureDiv.style.cssText = 'border: 2px solid #e0e0e0; padding: 20px; margin-bottom: 15px; border-radius: 8px; background: #f9f9f9;';
        featureDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h4 style="margin: 0; color: #2c1810;">Feature ${index + 1}</h4>
                <button type="button" class="btn btn-danger" onclick="removeFeatureField(this)" style="padding: 5px 15px; font-size: 0.85rem;">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
            <div class="form-group">
                <label>Icon Class (Font Awesome)</label>
                <input type="text" class="feature-icon" value="${feature.icon || ''}" placeholder="fas fa-gem">
                <small>Example: fas fa-gem, fas fa-palette, fas fa-shipping-fast</small>
            </div>
            <div class="form-group">
                <label>Title</label>
                <input type="text" class="feature-title" value="${feature.title || ''}" placeholder="Premium Quality">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea class="feature-description" rows="2" placeholder="Handpicked finest materials...">${feature.description || ''}</textarea>
            </div>
        `;
        container.appendChild(featureDiv);
    });
}

function addFeatureField() {
    const container = document.getElementById('featuresForm');
    const features = getFeaturesFromForm();
    features.push({ icon: '', title: '', description: '' });
    renderFeaturesForm(features);
}

function removeFeatureField(button) {
    const featureDiv = button.closest('.feature-form-item');
    featureDiv.remove();
}

function getFeaturesFromForm() {
    const features = [];
    const featureItems = document.querySelectorAll('.feature-form-item');
    featureItems.forEach(item => {
        const icon = item.querySelector('.feature-icon').value.trim();
        const title = item.querySelector('.feature-title').value.trim();
        const description = item.querySelector('.feature-description').value.trim();
        if (icon || title || description) {
            features.push({ icon, title, description });
        }
    });
    return features;
}

document.getElementById('contentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const contentData = {
        hero: {
            title: document.getElementById('heroTitle').value.trim(),
            subtitle: document.getElementById('heroSubtitle').value.trim()
        },
        features: getFeaturesFromForm(),
        social: {
            facebook: document.getElementById('socialFacebook').value.trim(),
            instagram: document.getElementById('socialInstagram').value.trim(),
            twitter: document.getElementById('socialTwitter').value.trim(),
            youtube: document.getElementById('socialYouTube').value.trim(),
            pinterest: document.getElementById('socialPinterest').value.trim()
        },
        about: document.getElementById('aboutText').value.trim(),
        email: document.getElementById('contactEmail').value.trim(),
        phone: document.getElementById('contactPhone').value.trim(),
        whatsapp: document.getElementById('whatsappNumber').value.trim()
    };

    try {
        pendingChanges.content.update = contentData;
        showNotification('Content changes saved locally. Click "Save All Changes" to commit.', 'info');
        updatePendingCount();
    } catch (error) {
        showNotification('Error updating content', 'error');
    }
});

// Modal functions
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modal on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}

// Image preview handlers
document.getElementById('productImageUpload')?.addEventListener('change', (e) => {
    handleImagePreview(e, 'productImagePreview', 'product');
});

document.getElementById('galleryImageUpload')?.addEventListener('change', (e) => {
    handleImagePreview(e, 'galleryImagePreview', 'gallery');
});

document.getElementById('heroImageUpload')?.addEventListener('change', (e) => {
    handleImagePreview(e, 'heroImagePreview', 'hero');
});

// Store uploaded image data
const uploadedImages = {
    product: null,
    gallery: null,
    hero: null
};

function handleImagePreview(event, previewId, type) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById(previewId);
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; border-radius: 8px;">`;
            
            // Store the base64 data URL for use in form submission
            if (type === 'product') {
                uploadedImages.product = e.target.result;
                document.getElementById('productImage').removeAttribute('required');
            } else if (type === 'gallery') {
                uploadedImages.gallery = e.target.result;
                document.getElementById('galleryImage').removeAttribute('required');
            } else if (type === 'hero') {
                uploadedImages.hero = e.target.result;
                document.getElementById('heroImage').removeAttribute('required');
            }
        };
        reader.readAsDataURL(file);
    }
}

// Notification system
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function setupEventListeners() {
    // Save All Changes button
    document.getElementById('saveAllBtn')?.addEventListener('click', saveAllChanges);
}

// Update pending changes count
function updatePendingCount() {
    let count = 0;
    count += pendingChanges.products.create.length + pendingChanges.products.update.length + pendingChanges.products.delete.length;
    count += pendingChanges.gallery.create.length + pendingChanges.gallery.update.length + pendingChanges.gallery.delete.length;
    count += pendingChanges.hero.create.length + pendingChanges.hero.update.length + pendingChanges.hero.delete.length;
    if (pendingChanges.content.update) count += 1;
    
    const saveBtn = document.getElementById('saveAllBtn');
    const countBadge = document.getElementById('pendingCount');
    
    if (count > 0) {
        saveBtn.style.display = 'inline-flex';
        countBadge.textContent = count;
    } else {
        saveBtn.style.display = 'none';
    }
}

// Save all pending changes in a single batch commit
async function saveAllChanges() {
    const saveBtn = document.getElementById('saveAllBtn');
    const originalText = saveBtn.innerHTML;
    
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    try {
        // Prepare batch payload
        const batchData = {};
        
        // Products
        if (pendingChanges.products.create.length > 0 || 
            pendingChanges.products.update.length > 0 || 
            pendingChanges.products.delete.length > 0) {
            batchData.products = {
                create: pendingChanges.products.create.map(item => {
                    const { id, ...itemData } = item; // Remove temp ID
                    return itemData;
                }),
                update: pendingChanges.products.update,
                delete: pendingChanges.products.delete.filter(id => !id.startsWith('temp_'))
            };
        }
        
        // Gallery
        if (pendingChanges.gallery.create.length > 0 || 
            pendingChanges.gallery.update.length > 0 || 
            pendingChanges.gallery.delete.length > 0) {
            batchData.gallery = {
                create: pendingChanges.gallery.create.map(item => {
                    const { id, ...itemData } = item; // Remove temp ID
                    return itemData;
                }),
                update: pendingChanges.gallery.update,
                delete: pendingChanges.gallery.delete.filter(id => !id.startsWith('temp_'))
            };
        }
        
        // Hero Images
        if (pendingChanges.hero.create.length > 0 || 
            pendingChanges.hero.update.length > 0 || 
            pendingChanges.hero.delete.length > 0) {
            batchData.hero = {
                create: pendingChanges.hero.create.map(item => {
                    const { id, ...itemData } = item; // Remove temp ID
                    return itemData;
                }),
                update: pendingChanges.hero.update,
                delete: pendingChanges.hero.delete.filter(id => !id.startsWith('temp_'))
            };
        }
        
        // Content
        if (pendingChanges.content.update) {
            batchData.content = {
                update: pendingChanges.content.update
            };
        }
        
        // Send batch request
        const result = await apiCall('/data?action=batch', 'POST', batchData);
        
        // Clear pending changes
        pendingChanges.products = { create: [], update: [], delete: [] };
        pendingChanges.gallery = { create: [], update: [], delete: [] };
        pendingChanges.hero = { create: [], update: [], delete: [] };
        pendingChanges.content.update = null;
        
        updatePendingCount();
        showNotification('All changes saved successfully in a single commit!', 'success');
        
        // Reload data to reflect changes
        await loadData();
        
    } catch (error) {
        console.error('Error saving changes:', error);
        showNotification('Error saving changes: ' + error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

// User Management
let usersData = [];

async function loadUsers() {
    try {
        const response = await apiCall('/auth?action=users');
        usersData = response.users || [];
        
        const container = document.getElementById('usersList');
        container.innerHTML = '';

        if (usersData.length === 0) {
            container.innerHTML = '<p>No users found. Add your first user!</p>';
            return;
        }

        usersData.forEach(user => {
            const card = createUserCard(user);
            container.appendChild(card);
        });
    } catch (error) {
        document.getElementById('usersList').innerHTML = 
            '<p class="error">Error loading users. Make sure you have admin access.</p>';
    }
}

function createUserCard(user) {
    const card = document.createElement('div');
    card.className = 'item-card';
    
    card.innerHTML = `
        <div class="item-card-body">
            <div class="item-card-title">
                ${user.username}
                ${user.isDefault ? ' <i class="fas fa-shield-alt" style="color: #d4af37; margin-left: 8px;" title="Default Admin User"></i>' : ''}
            </div>
            <div class="item-card-info">
                <div>Role: ${user.role}</div>
                <div>Email: ${user.email || `${user.username}@shreeadvaya.com`}</div>
            </div>
            <div class="item-card-actions">
                <button class="btn btn-primary" onclick="editUser('${user.username}')" ${user.isDefault ? 'disabled title="Cannot edit default admin user"' : ''}>
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="deleteUser('${user.username}')" ${user.isDefault ? 'disabled title="Cannot delete default admin user"' : ''}>
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
    return card;
}

function openUserModal(username = null) {
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    const title = document.getElementById('userModalTitle');
    const errorMsg = document.getElementById('userError');

    form.reset();
    errorMsg.classList.remove('show');
    document.getElementById('userUsername').value = '';

    if (username) {
        title.textContent = 'Edit User';
        const user = usersData.find(u => u.username === username);
        if (user) {
            document.getElementById('userUsername').value = user.username;
            document.getElementById('userName').value = user.username;
            document.getElementById('userName').disabled = true; // Can't change username
            document.getElementById('userPassword').required = false; // Password optional when editing
            document.getElementById('userPassword').removeAttribute('minlength'); // Remove minlength requirement
            document.getElementById('passwordRequired').style.display = 'none'; // Hide required asterisk
            document.getElementById('userEmail').value = user.email || '';
            document.getElementById('userRole').value = user.role;
        }
    } else {
        title.textContent = 'Add User';
        document.getElementById('userName').disabled = false;
        document.getElementById('userPassword').required = true;
        document.getElementById('userPassword').setAttribute('minlength', '6');
        document.getElementById('passwordRequired').style.display = 'inline';
    }

    modal.classList.add('active');
}

function editUser(username) {
    openUserModal(username);
}

document.getElementById('userForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('userUsername').value || document.getElementById('userName').value.trim();
    const password = document.getElementById('userPassword').value;
    const email = document.getElementById('userEmail').value.trim();
    const role = document.getElementById('userRole').value;
    const isEdit = !!document.getElementById('userUsername').value;
    
    const errorMsg = document.getElementById('userError');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    errorMsg.classList.remove('show');
    
    // Validation
    if (!isEdit && (!password || password.length < 6)) {
        errorMsg.textContent = 'Password is required and must be at least 6 characters';
        errorMsg.classList.add('show');
        return;
    }
    
    if (isEdit && password && password.length < 6) {
        errorMsg.textContent = 'Password must be at least 6 characters if provided';
        errorMsg.classList.add('show');
        return;
    }
    
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        errorMsg.textContent = 'Username must be 3-20 characters and contain only letters, numbers, and underscores';
        errorMsg.classList.add('show');
        return;
    }
    
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    try {
        if (isEdit) {
            // Update user
            const updateData = { username, role, email };
            if (password) {
                updateData.password = password;
            }
            
            await apiCall('/auth?action=users', 'PUT', updateData);
            showNotification('User updated successfully!', 'success');
        } else {
            // Create new user
            await apiCall('/auth?action=register', 'POST', {
                username,
                password,
                email: email || undefined,
                role
            });
            showNotification('User created successfully!', 'success');
        }
        
        closeModal('userModal');
        await loadUsers();
    } catch (error) {
        errorMsg.textContent = error.message || 'Failed to save user';
        errorMsg.classList.add('show');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

async function deleteUser(username) {
    // Get current user from localStorage
    const currentUserStr = localStorage.getItem('admin_user');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    
    if (currentUser && currentUser.username.toLowerCase() === username.toLowerCase()) {
        showNotification('Cannot delete your own account', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
        return;
    }

    try {
        await apiCall('/auth?action=users', 'DELETE', { username });
        showNotification('User deleted successfully!', 'success');
        await loadUsers();
    } catch (error) {
        showNotification('Error deleting user: ' + error.message, 'error');
    }
}
