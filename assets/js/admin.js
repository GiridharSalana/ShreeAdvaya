// Admin Panel JavaScript
const API_BASE = '/api';
const STORAGE_KEY = 'admin_token';
const THEME_KEY = 'admin_theme';

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

// User management functionality moved to admin panel

// Batch Save System - Track all changes locally
const pendingChanges = {
    products: { create: [], update: [], delete: [] },
    gallery: { create: [], update: [], delete: [] },
    hero: { create: [], update: [], delete: [] },
    content: { update: null },
    users: { create: [], update: [], delete: [] }
};

// Original data cache
const originalData = {
    products: [],
    gallery: [],
    hero: [],
    content: {},
    users: []
};

// Get current user role
function getUserRole() {
    const userStr = localStorage.getItem('admin_user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            return user.role || 'viewer';
        } catch (e) {
            return 'viewer';
        }
    }
    return 'viewer';
}

// Check if user has permission
function hasPermission(action) {
    const role = getUserRole();
    if (role === 'admin') return true;
    if (role === 'editor') {
        // Editors can edit content but not manage users
        return action !== 'manage_users';
    }
    // Viewers can only view
    return false;
}

// Setup theme toggle listeners (needs to work on login screen too)
function setupThemeListeners() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const theme = e.currentTarget.dataset.theme;
            switchTheme(theme);
        });
    });
}

// Check authentication on load
document.addEventListener('DOMContentLoaded', async () => {
    // Setup theme listeners immediately (works for both login and dashboard)
    setupThemeListeners();
    
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        showDashboard();
        setupEventListeners();
        applyRoleBasedAccess();
        
        // Restore pending changes from localStorage if any
        restoreFromLocalStorage();
        
        loadData();
    } else {
        showLogin();
    }
});

// Apply role-based access control - gray out elements instead of hiding
function applyRoleBasedAccess() {
    const role = getUserRole();
    const isAdmin = role === 'admin';
    const canEdit = hasPermission('edit');
    
    // Gray out User Management tab for non-admins (keep visible but disabled)
    const usersTab = document.querySelector('a[data-tab="users"]');
    if (usersTab) {
        if (!isAdmin) {
            usersTab.classList.add('disabled-tab');
            usersTab.style.opacity = '0.5';
            usersTab.style.pointerEvents = 'none';
            usersTab.style.cursor = 'not-allowed';
            usersTab.title = 'Admin access required';
        } else {
            usersTab.classList.remove('disabled-tab');
            usersTab.style.opacity = '1';
            usersTab.style.pointerEvents = 'auto';
            usersTab.style.cursor = 'pointer';
            usersTab.title = '';
        }
    }
    
    // Gray out add buttons for non-editors (keep visible but disabled)
    const addButtons = document.querySelectorAll('.add-button-container button');
    addButtons.forEach(btn => {
        if (canEdit) {
            btn.classList.remove('disabled-btn');
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.title = '';
        } else {
            btn.classList.add('disabled-btn');
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.title = `${role === 'viewer' ? 'Viewer' : 'Editor'} role: Editing not allowed`;
        }
    });
    
    // Gray out content form save button for non-editors
    const contentForm = document.getElementById('contentForm');
    if (contentForm) {
        const saveBtn = contentForm.querySelector('button[type="submit"]');
        if (saveBtn) {
            if (canEdit) {
                saveBtn.classList.remove('disabled-btn');
                saveBtn.disabled = false;
                saveBtn.style.opacity = '1';
                saveBtn.style.cursor = 'pointer';
                saveBtn.title = '';
            } else {
                saveBtn.classList.add('disabled-btn');
                saveBtn.disabled = true;
                saveBtn.style.opacity = '0.5';
                saveBtn.style.cursor = 'not-allowed';
                saveBtn.title = `${role === 'viewer' ? 'Viewer' : 'Editor'} role: Editing not allowed`;
            }
        }
    }
    
    // Gray out add feature button for non-editors
    const addFeatureBtn = document.querySelector('button[onclick="addFeatureField()"]');
    if (addFeatureBtn) {
        if (canEdit) {
            addFeatureBtn.classList.remove('disabled-btn');
            addFeatureBtn.disabled = false;
            addFeatureBtn.style.opacity = '1';
            addFeatureBtn.style.cursor = 'pointer';
            addFeatureBtn.title = '';
        } else {
            addFeatureBtn.classList.add('disabled-btn');
            addFeatureBtn.disabled = true;
            addFeatureBtn.style.opacity = '0.5';
            addFeatureBtn.style.cursor = 'not-allowed';
            addFeatureBtn.title = `${role === 'viewer' ? 'Viewer' : 'Editor'} role: Editing not allowed`;
        }
    }
    
    // Gray out save all changes button for non-editors
    const saveAllBtn = document.getElementById('saveAllBtn');
    if (saveAllBtn) {
        if (canEdit) {
            saveAllBtn.classList.remove('disabled-btn');
            saveAllBtn.disabled = false;
            saveAllBtn.style.opacity = '1';
            saveAllBtn.style.cursor = 'pointer';
            saveAllBtn.title = '';
        } else {
            saveAllBtn.classList.add('disabled-btn');
            saveAllBtn.disabled = true;
            saveAllBtn.style.opacity = '0.5';
            saveAllBtn.style.cursor = 'not-allowed';
            saveAllBtn.title = `${role === 'viewer' ? 'Viewer' : 'Editor'} role: Editing not allowed`;
        }
    }
    
    // Gray out all edit/delete buttons in cards
    const editButtons = document.querySelectorAll('.item-card-actions .btn-primary, .item-card-actions .btn-danger');
    editButtons.forEach(btn => {
        if (canEdit) {
            btn.classList.remove('disabled-btn');
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.title = '';
        } else {
            btn.classList.add('disabled-btn');
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.title = `${role === 'viewer' ? 'Viewer' : 'Editor'} role: Editing not allowed`;
        }
    });
}

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
        
        // Check if tab is disabled (grayed out)
        if (tab.style.pointerEvents === 'none') {
            return; // Don't allow navigation to disabled tabs
        }
        
        const targetTab = tab.getAttribute('data-tab');
        
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show correct content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${targetTab}Tab`).classList.add('active');
        
        // Load data for the active tab if needed
        if (targetTab === 'users') {
            loadUsers();
        }
    });
});

// API Functions with retry logic
async function apiCall(endpoint, method = 'GET', data = null, retryCount = 0) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    
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

        const response = await fetch(`${API_BASE}${endpoint}`, options);
        
        // Handle 401 Unauthorized
        if (response.status === 401) {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem('admin_user');
            showLogin();
            throw new Error('Session expired. Please login again.');
        }
        
        // Retry on server errors (5xx)
        if (response.status >= 500 && response.status < 600 && retryCount < MAX_RETRIES) {
            const delay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
            console.log(`Server error ${response.status}. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return await apiCall(endpoint, method, data, retryCount + 1);
        }

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        let result;
        
        if (contentType && contentType.includes('application/json')) {
            try {
                const text = await response.text();
                if (!text || text.trim() === '') {
                    throw new Error('Empty response from server');
                }
                result = JSON.parse(text);
            } catch (parseError) {
                // Retry on parse errors if we have retries left
                if (retryCount < MAX_RETRIES) {
                    const delay = RETRY_DELAY * Math.pow(2, retryCount);
                    console.log(`Parse error. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return await apiCall(endpoint, method, data, retryCount + 1);
                }
                throw new Error('Invalid JSON response from server: ' + parseError.message);
            }
        } else {
            const text = await response.text();
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        if (!response.ok) {
            throw new Error(result.error || `API request failed: ${response.status}`);
        }

        return result;
    } catch (error) {
        // Retry on network errors
        if ((error.name === 'TypeError' || error.message.includes('fetch')) && retryCount < MAX_RETRIES) {
            const delay = RETRY_DELAY * Math.pow(2, retryCount);
            console.log(`Network error. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return await apiCall(endpoint, method, data, retryCount + 1);
        }
        
        // Only show notification on final failure
        if (retryCount >= MAX_RETRIES || !error.message.includes('Session expired')) {
            showNotification(error.message, 'error');
        }
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
        
        // Apply role-based access after loading
        applyRoleBasedAccess();
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

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'item-card';
    const canEdit = hasPermission('edit');
    const productId = escapeHtml(String(product.id));
    const disabledAttr = canEdit ? '' : 'disabled';
    const disabledClass = canEdit ? '' : 'disabled-btn';
    const disabledStyle = canEdit ? '' : 'style="opacity: 0.5; cursor: not-allowed;"';
    const role = getUserRole();
    const disabledTitle = canEdit ? '' : `title="${role === 'viewer' ? 'Viewer' : 'Editor'} role: Editing not allowed"`;
    
    const actionsHTML = `
        <div class="item-card-actions">
            <button class="btn btn-primary ${disabledClass}" ${disabledAttr} ${disabledStyle} ${disabledTitle} onclick="${canEdit ? `editProduct('${productId.replace(/'/g, "\\'")}')` : 'return false;'}">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn btn-danger ${disabledClass}" ${disabledAttr} ${disabledStyle} ${disabledTitle} onclick="${canEdit ? `deleteProduct('${productId.replace(/'/g, "\\'")}')` : 'return false;'}">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    
    const productImage = escapeHtml(product.image || '');
    const productAlt = escapeHtml(product.alt || product.name || '');
    const productName = escapeHtml(product.name || '');
    const productCategory = escapeHtml(product.category || '');
    const productPrice = escapeHtml(String(product.price || ''));
    
    card.innerHTML = `
        <img src="${productImage}" alt="${productAlt}" onerror="this.src='assets/images/product-1.webp'">
        <div class="item-card-body">
            <div class="item-card-title">${productName}</div>
            <div class="item-card-info">
                <div>Category: ${productCategory}</div>
                <div>Price: ₹${productPrice}</div>
            </div>
            ${actionsHTML}
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
        
        // Apply role-based access after loading
        applyRoleBasedAccess();
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
    const canEdit = hasPermission('edit');
    const itemId = escapeHtml(String(item.id));
    const disabledAttr = canEdit ? '' : 'disabled';
    const disabledClass = canEdit ? '' : 'disabled-btn';
    const disabledStyle = canEdit ? '' : 'style="opacity: 0.5; cursor: not-allowed;"';
    const role = getUserRole();
    const disabledTitle = canEdit ? '' : `title="${role === 'viewer' ? 'Viewer' : 'Editor'} role: Editing not allowed"`;
    
    const actionsHTML = `
        <div class="item-card-actions">
            <button class="btn btn-danger ${disabledClass}" ${disabledAttr} ${disabledStyle} ${disabledTitle} onclick="${canEdit ? `deleteGalleryItem('${itemId.replace(/'/g, "\\'")}')` : 'return false;'}">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    
    const itemImage = escapeHtml(item.image || '');
    const itemAlt = escapeHtml(item.alt || '');
    
    card.innerHTML = `
        <img src="${itemImage}" alt="${itemAlt}" onerror="this.src='assets/images/new-1.webp'">
        <div class="item-card-body">
            <div class="item-card-title">${itemAlt}</div>
            ${actionsHTML}
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
        
        // Apply role-based access after loading
        applyRoleBasedAccess();
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
    const canEdit = hasPermission('edit');
    const itemId = escapeHtml(String(item.id));
    const disabledAttr = canEdit ? '' : 'disabled';
    const disabledClass = canEdit ? '' : 'disabled-btn';
    const disabledStyle = canEdit ? '' : 'style="opacity: 0.5; cursor: not-allowed;"';
    const role = getUserRole();
    const disabledTitle = canEdit ? '' : `title="${role === 'viewer' ? 'Viewer' : 'Editor'} role: Editing not allowed"`;
    
    const actionsHTML = `
        <div class="item-card-actions">
            <button class="btn btn-danger ${disabledClass}" ${disabledAttr} ${disabledStyle} ${disabledTitle} onclick="${canEdit ? `deleteHeroImage('${itemId.replace(/'/g, "\\'")}')` : 'return false;'}">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    
    const itemImage = escapeHtml(item.image || '');
    
    card.innerHTML = `
        <img src="${itemImage}" alt="Hero Image" onerror="this.src='assets/images/hero-1.webp'">
        <div class="item-card-body">
            <div class="item-card-title">Hero Image ${itemId}</div>
            ${actionsHTML}
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
        featureDiv.innerHTML = `
            <div class="feature-header">
                <h4>Feature ${index + 1}</h4>
                <button type="button" class="btn btn-danger btn-sm" onclick="removeFeatureField(this)">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
            <div class="form-group">
                <label>Icon Class (Font Awesome)</label>
                <input type="text" class="feature-icon" value="${escapeHtml(feature.icon || '')}" placeholder="fas fa-gem">
                <small>Example: fas fa-gem, fas fa-palette, fas fa-shipping-fast</small>
            </div>
            <div class="form-group">
                <label>Title</label>
                <input type="text" class="feature-title" value="${escapeHtml(feature.title || '')}" placeholder="Premium Quality">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea class="feature-description" rows="2" placeholder="Handpicked finest materials...">${escapeHtml(feature.description || '')}</textarea>
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
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
        showNotification('Invalid file type. Please upload a JPEG, PNG, WEBP, or GIF image.', 'error');
        event.target.value = ''; // Clear the input
        return;
    }
    
    // Validate file size (2MB limit)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
        showNotification('File size exceeds 2MB. Please choose a smaller image or compress it.', 'error');
        event.target.value = ''; // Clear the input
        return;
    }
    
    // Show warning if file is over 500KB
    if (file.size > 500 * 1024) {
        showNotification(`Image is ${(file.size / 1024 / 1024).toFixed(2)}MB. Consider compressing for better performance.`, 'warning');
    }
    
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
    reader.onerror = () => {
        showNotification('Error reading file. Please try again.', 'error');
    };
    reader.readAsDataURL(file);
}

// Notification system
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');

    // Longer timeout for warnings
    const timeout = type === 'warning' ? 5000 : 3000;
    setTimeout(() => {
        notification.classList.remove('show');
    }, timeout);
}

function setupEventListeners() {
    // Save All Changes button - shows preview
    document.getElementById('saveAllBtn')?.addEventListener('click', showPreviewModal);
    // Discard All Changes button
    document.getElementById('discardAllBtn')?.addEventListener('click', discardAllChanges);
    // Confirm Save button in preview modal
    document.getElementById('confirmSaveBtn')?.addEventListener('click', confirmAndSave);
    
    // Search functionality
    document.getElementById('searchProducts')?.addEventListener('input', filterProducts);
    document.getElementById('searchGallery')?.addEventListener('input', filterGallery);
    document.getElementById('searchUsers')?.addEventListener('input', filterUsers);
}

// Filter Products
function filterProducts(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const productCards = document.querySelectorAll('#productsList .item-card');
    
    productCards.forEach(card => {
        const name = card.querySelector('.item-card-title')?.textContent.toLowerCase() || '';
        const category = card.querySelector('.item-card-info')?.textContent.toLowerCase() || '';
        const matches = name.includes(searchTerm) || category.includes(searchTerm);
        
        card.style.display = matches ? '' : 'none';
    });
}

// Filter Gallery
function filterGallery(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const galleryCards = document.querySelectorAll('#galleryList .item-card');
    
    galleryCards.forEach(card => {
        const alt = card.querySelector('.item-card-title')?.textContent.toLowerCase() || '';
        const matches = alt.includes(searchTerm);
        
        card.style.display = matches ? '' : 'none';
    });
}

// Filter Users
function filterUsers(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const userCards = document.querySelectorAll('#usersList .item-card');
    
    userCards.forEach(card => {
        const username = card.querySelector('.item-card-title')?.textContent.toLowerCase() || '';
        const info = card.querySelector('.item-card-info')?.textContent.toLowerCase() || '';
        const matches = username.includes(searchTerm) || info.includes(searchTerm);
        
        card.style.display = matches ? '' : 'none';
    });
}

// Update pending changes count
function updatePendingCount() {
    let count = 0;
    count += pendingChanges.products.create.length + pendingChanges.products.update.length + pendingChanges.products.delete.length;
    count += pendingChanges.gallery.create.length + pendingChanges.gallery.update.length + pendingChanges.gallery.delete.length;
    count += pendingChanges.hero.create.length + pendingChanges.hero.update.length + pendingChanges.hero.delete.length;
    count += pendingChanges.users.create.length + pendingChanges.users.update.length + pendingChanges.users.delete.length;
    if (pendingChanges.content.update) count += 1;
    
    const saveBtn = document.getElementById('saveAllBtn');
    const discardBtn = document.getElementById('discardAllBtn');
    const countBadge = document.getElementById('pendingCount');
    
    if (count > 0) {
        saveBtn.style.display = 'inline-flex';
        discardBtn.style.display = 'inline-flex';
        countBadge.textContent = count;
        
        // Save to localStorage for recovery
        saveToLocalStorage();
    } else {
        saveBtn.style.display = 'none';
        discardBtn.style.display = 'none';
        
        // Clear localStorage
        clearLocalStorage();
    }
}

// LocalStorage backup functions
function saveToLocalStorage() {
    try {
        localStorage.setItem('admin_pending_changes', JSON.stringify(pendingChanges));
        localStorage.setItem('admin_pending_timestamp', new Date().toISOString());
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function restoreFromLocalStorage() {
    try {
        const savedChanges = localStorage.getItem('admin_pending_changes');
        const timestamp = localStorage.getItem('admin_pending_timestamp');
        
        if (savedChanges && timestamp) {
            const savedDate = new Date(timestamp);
            const now = new Date();
            const hoursSince = (now - savedDate) / (1000 * 60 * 60);
            
            // Only restore if less than 24 hours old
            if (hoursSince < 24) {
                const parsed = JSON.parse(savedChanges);
                Object.assign(pendingChanges, parsed);
                updatePendingCount();
                
                if (Object.values(parsed).some(v => v && (Array.isArray(v.create) ? v.create.length > 0 : v))) {
                    showNotification('Restored unsaved changes from previous session.', 'info');
                }
            } else {
                // Clear old data
                clearLocalStorage();
            }
        }
    } catch (error) {
        console.error('Error restoring from localStorage:', error);
        clearLocalStorage();
    }
}

function clearLocalStorage() {
    try {
        localStorage.removeItem('admin_pending_changes');
        localStorage.removeItem('admin_pending_timestamp');
    } catch (error) {
        console.error('Error clearing localStorage:', error);
    }
}

// Show preview modal before saving
function showPreviewModal() {
    const previewContent = document.getElementById('previewContent');
    let html = '';
    
    // Products
    if (pendingChanges.products.create.length > 0 || pendingChanges.products.update.length > 0 || pendingChanges.products.delete.length > 0) {
        html += '<div class="preview-section"><h3 class="preview-section-title"><i class="fas fa-box"></i> Products</h3>';
        if (pendingChanges.products.create.length > 0) {
            html += `<div class="preview-action preview-create">✅ Create: ${pendingChanges.products.create.length} new product(s)</div>`;
        }
        if (pendingChanges.products.update.length > 0) {
            html += `<div class="preview-action preview-update">📝 Update: ${pendingChanges.products.update.length} product(s)</div>`;
        }
        if (pendingChanges.products.delete.length > 0) {
            html += `<div class="preview-action preview-delete">🗑️ Delete: ${pendingChanges.products.delete.length} product(s)</div>`;
        }
        html += '</div>';
    }
    
    // Gallery
    if (pendingChanges.gallery.create.length > 0 || pendingChanges.gallery.update.length > 0 || pendingChanges.gallery.delete.length > 0) {
        html += '<div class="preview-section"><h3 class="preview-section-title"><i class="fas fa-images"></i> Gallery</h3>';
        if (pendingChanges.gallery.create.length > 0) {
            html += `<div class="preview-action preview-create">✅ Create: ${pendingChanges.gallery.create.length} new image(s)</div>`;
        }
        if (pendingChanges.gallery.update.length > 0) {
            html += `<div class="preview-action preview-update">📝 Update: ${pendingChanges.gallery.update.length} image(s)</div>`;
        }
        if (pendingChanges.gallery.delete.length > 0) {
            html += `<div class="preview-action preview-delete">🗑️ Delete: ${pendingChanges.gallery.delete.length} image(s)</div>`;
        }
        html += '</div>';
    }
    
    // Hero Images
    if (pendingChanges.hero.create.length > 0 || pendingChanges.hero.update.length > 0 || pendingChanges.hero.delete.length > 0) {
        html += '<div class="preview-section"><h3 class="preview-section-title"><i class="fas fa-image"></i> Hero Images</h3>';
        if (pendingChanges.hero.create.length > 0) {
            html += `<div class="preview-action preview-create">✅ Create: ${pendingChanges.hero.create.length} new hero image(s)</div>`;
        }
        if (pendingChanges.hero.update.length > 0) {
            html += `<div class="preview-action preview-update">📝 Update: ${pendingChanges.hero.update.length} hero image(s)</div>`;
        }
        if (pendingChanges.hero.delete.length > 0) {
            html += `<div class="preview-action preview-delete">🗑️ Delete: ${pendingChanges.hero.delete.length} hero image(s)</div>`;
        }
        html += '</div>';
    }
    
    // Users
    if (pendingChanges.users.create.length > 0 || pendingChanges.users.update.length > 0 || pendingChanges.users.delete.length > 0) {
        html += '<div class="preview-section"><h3 class="preview-section-title"><i class="fas fa-users"></i> Users</h3>';
        if (pendingChanges.users.create.length > 0) {
            html += `<div class="preview-action preview-create">✅ Create: ${pendingChanges.users.create.length} new user(s)</div>`;
        }
        if (pendingChanges.users.update.length > 0) {
            html += `<div class="preview-action preview-update">📝 Update: ${pendingChanges.users.update.length} user(s)</div>`;
        }
        if (pendingChanges.users.delete.length > 0) {
            html += `<div class="preview-action preview-delete">🗑️ Delete: ${pendingChanges.users.delete.length} user(s)</div>`;
        }
        html += '</div>';
    }
    
    // Content
    if (pendingChanges.content.update) {
        html += '<div class="preview-section"><h3 class="preview-section-title"><i class="fas fa-file-alt"></i> Content</h3>';
        html += '<div class="preview-action preview-update">📝 Update: Site content modified</div>';
        html += '</div>';
    }
    
    if (html === '') {
        html = '<p class="preview-empty">No pending changes to save.</p>';
    }
    
    previewContent.innerHTML = html;
    document.getElementById('previewModal').classList.add('active');
}

// Confirm and save from preview modal
async function confirmAndSave() {
    closeModal('previewModal');
    await saveAllChanges();
}

// Discard all pending changes
async function discardAllChanges() {
    if (!confirm('Are you sure you want to discard all pending changes? This action cannot be undone.')) {
        return;
    }
    
    // Clear all pending changes
    pendingChanges.products = { create: [], update: [], delete: [] };
    pendingChanges.gallery = { create: [], update: [], delete: [] };
    pendingChanges.hero = { create: [], update: [], delete: [] };
    pendingChanges.users = { create: [], update: [], delete: [] };
    pendingChanges.content.update = null;
    
    // Clear localStorage backup
    clearLocalStorage();
    
    // Update UI
    updatePendingCount();
    showNotification('All pending changes have been discarded.', 'info');
    
    // Reload data to reflect original state
    await loadData();
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
        
        // Users
        if (pendingChanges.users.create.length > 0 || 
            pendingChanges.users.update.length > 0 || 
            pendingChanges.users.delete.length > 0) {
            batchData.users = {
                create: pendingChanges.users.create,
                update: pendingChanges.users.update,
                delete: pendingChanges.users.delete
            };
        }
        
        // Send batch request
        const result = await apiCall('/data?action=batch', 'POST', batchData);
        
        // Clear pending changes
        pendingChanges.products = { create: [], update: [], delete: [] };
        pendingChanges.gallery = { create: [], update: [], delete: [] };
        pendingChanges.hero = { create: [], update: [], delete: [] };
        pendingChanges.users = { create: [], update: [], delete: [] };
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

// Get users with pending changes applied
function getDisplayUsers() {
    let users = JSON.parse(JSON.stringify(originalData.users));
    
    // Apply updates
    pendingChanges.users.update.forEach(update => {
        const index = users.findIndex(u => u.username.toLowerCase() === update.username.toLowerCase());
        if (index !== -1) {
            // Merge update into existing user (don't include password in display)
            users[index] = { ...users[index], ...update };
            if (update.password) {
                // Mark that password will be updated (don't show actual password)
                users[index]._passwordUpdated = true;
            }
        }
    });
    
    // Add new users
    users.push(...pendingChanges.users.create.map(u => ({ ...u, _isNew: true })));
    
    // Remove deleted users
    const deleteUsernames = pendingChanges.users.delete.map(u => u.toLowerCase());
    users = users.filter(u => !deleteUsernames.includes(u.username.toLowerCase()));
    
    return users;
}

async function loadUsers() {
    // Only load users if user is admin
    if (!hasPermission('manage_users')) {
        const container = document.getElementById('usersList');
        if (container) {
            container.innerHTML = '';
        }
        return;
    }
    
    try {
        const response = await apiCall('/auth?action=users');
        originalData.users = JSON.parse(JSON.stringify(response.users || [])); // Deep copy
        
        const displayUsers = getDisplayUsers();
        const container = document.getElementById('usersList');
        container.innerHTML = '';

        if (displayUsers.length === 0) {
            container.innerHTML = '<p>No users found. Add your first user!</p>';
            return;
        }

        displayUsers.forEach(user => {
            const card = createUserCard(user);
            container.appendChild(card);
        });
        
        // Apply role-based access after loading
        applyRoleBasedAccess();
    } catch (error) {
        const container = document.getElementById('usersList');
        if (container) {
            container.innerHTML = '<p class="error">Error loading users.</p>';
        }
    }
}

function createUserCard(user) {
    const card = document.createElement('div');
    card.className = 'item-card';
    
    const username = escapeHtml(user.username || '');
    const userRole = escapeHtml(user.role || '');
    const userEmail = escapeHtml(user.email || `${user.username}@shreeadvaya.com`);
    const safeUsername = username.replace(/'/g, "\\'");
    const isDefault = user.isDefault ? ' <i class="fas fa-shield-alt" style="color: #d4af37; margin-left: 8px;" title="Default Admin User"></i>' : '';
    const editDisabledClass = user.isDefault ? 'disabled-btn' : '';
    const deleteDisabledClass = user.isDefault ? 'disabled-btn' : '';
    const editDisabledAttr = user.isDefault ? 'disabled' : '';
    const deleteDisabledAttr = user.isDefault ? 'disabled' : '';
    const editDisabledStyle = user.isDefault ? 'style="opacity: 0.5; cursor: not-allowed;"' : '';
    const deleteDisabledStyle = user.isDefault ? 'style="opacity: 0.5; cursor: not-allowed;"' : '';
    const editTitle = user.isDefault ? 'title="Cannot edit default admin user"' : '';
    const deleteTitle = user.isDefault ? 'title="Cannot delete default admin user"' : '';
    
    card.innerHTML = `
        <div class="item-card-body">
            <div class="item-card-title">
                ${username}${isDefault}
            </div>
            <div class="item-card-info">
                <div>Role: ${userRole}</div>
                <div>Email: ${userEmail}</div>
            </div>
            <div class="item-card-actions">
                <button class="btn btn-primary ${editDisabledClass}" ${editDisabledAttr} ${editDisabledStyle} ${editTitle} onclick="${user.isDefault ? 'return false;' : `editUser('${safeUsername}')`}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger ${deleteDisabledClass}" ${deleteDisabledAttr} ${deleteDisabledStyle} ${deleteTitle} onclick="${user.isDefault ? 'return false;' : `deleteUser('${safeUsername}')`}">
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
        const displayUsers = getDisplayUsers();
        const user = displayUsers.find(u => u.username === username);
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
    
    try {
        if (isEdit) {
            // Remove from create if it was a new user
            pendingChanges.users.create = pendingChanges.users.create.filter(u => u.username.toLowerCase() !== username.toLowerCase());
            
            // Add to update queue
            const updateData = { username, role, email };
            if (password) {
                updateData.password = password;
            }
            
            const existingUpdateIndex = pendingChanges.users.update.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
            if (existingUpdateIndex !== -1) {
                pendingChanges.users.update[existingUpdateIndex] = updateData;
            } else {
                pendingChanges.users.update.push(updateData);
            }
            
            showNotification('User changes saved locally. Click "Save All Changes" to commit.', 'info');
        } else {
            // Check if username already exists in original or pending
            const displayUsers = getDisplayUsers();
            if (displayUsers.find(u => u.username.toLowerCase() === username.toLowerCase())) {
                errorMsg.textContent = 'Username already exists';
                errorMsg.classList.add('show');
                return;
            }
            
            // Add new user
            pendingChanges.users.create.push({
                username,
                password,
                email: email || `${username}@shreeadvaya.com`,
                role
            });
            showNotification('User added locally. Click "Save All Changes" to commit.', 'info');
        }
        
        closeModal('userModal');
        loadUsers();
        updatePendingCount();
    } catch (error) {
        errorMsg.textContent = error.message || 'Failed to save user';
        errorMsg.classList.add('show');
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
    
    // Check if user is default admin
    const displayUsers = getDisplayUsers();
    const user = displayUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user && user.isDefault) {
        showNotification('Cannot delete default admin user', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
        return;
    }

    try {
        // Remove from create queue if it's a new user
        const wasInCreate = pendingChanges.users.create.some(u => u.username.toLowerCase() === username.toLowerCase());
        pendingChanges.users.create = pendingChanges.users.create.filter(u => u.username.toLowerCase() !== username.toLowerCase());
        
        // Remove from update queue
        pendingChanges.users.update = pendingChanges.users.update.filter(u => u.username.toLowerCase() !== username.toLowerCase());
        
        // Add to delete queue (only if it was in original data)
        if (!wasInCreate && !pendingChanges.users.delete.some(u => u.toLowerCase() === username.toLowerCase())) {
            pendingChanges.users.delete.push(username);
        }
        
        showNotification('User marked for deletion. Click "Save All Changes" to commit.', 'info');
        loadUsers();
        updatePendingCount();
    } catch (error) {
        showNotification('Error deleting user: ' + error.message, 'error');
    }
}
