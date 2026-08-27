/* ==============================================================
   Skanda Enterprises — Core E-Commerce Script
   Contains state management, cart logic, language toggle, and UI bindings.
   ============================================================== */

// State Management
let state = {
  currentLanguage: 'te', // Default language is Telugu ('te')
  allProducts: [],
  cart: [],
  currentFilter: 'all',
  searchQuery: '',
  businessContact: '919000055035', // Fallback WhatsApp number
  shippingThreshold: 600, // Subtotal required for free delivery
  farmerSeeds: [], // Seeds list loaded from data.json for calculation
};

// SVG Icons for product placeholders
const SVGIcons = {
  oil: `<svg class="product-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 2h6"/>
    <path d="M10 2v3.5L6.5 9C5.5 10 5 11.3 5 12.6V20a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7.4c0-1.3-.5-2.6-1.5-3.6L14 5.5V2"/>
    <path d="M6 15h12"/>
  </svg>`,
  leaf: `<svg class="product-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 20c8 0 15-6 16-16C10 4 4 11 4 20Z"/>
    <path d="M5 19c3.5-4 6-7 11-11.5"/>
  </svg>`,
  seed: `<svg class="product-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="12" cy="12" rx="5.5" ry="8"/>
    <path d="M12 4v16"/>
  </svg>`
};

// Initialize App
// Always start at the top of the page on reload
// 1) Stop the browser from restoring the previous scroll position
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// 2) Strip any #section hash from the URL so the browser doesn't jump to it
if (window.location.hash) {
  history.replaceState(null, '', window.location.pathname + window.location.search);
}
window.scrollTo(0, 0);

// 3) Force top again after everything (images/fonts) finishes loading
window.addEventListener('load', () => window.scrollTo(0, 0));

async function init() {
  setupEventListeners();
  loadCartFromLocalStorage();
  await loadData();
  applyLanguageClass();
  setupFAQAccordions();
  renderApp();
  initScrollReveal();
  updateScrollUI();
}

// Helpers to open/close drawers with body scroll lock
function syncScrollLock() {
  const anyOpen = document.querySelector('.cart-drawer.open, .mobile-sidebar.open');
  document.body.classList.toggle('no-scroll', !!anyOpen);
}

function closeAllDrawers() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('mobile-sidebar').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('active');
  syncScrollLock();
}

// Setup Event Listeners
function setupEventListeners() {
  // Consolidated scroll handler (rAF-throttled for smoothness)
  window.addEventListener('scroll', onScrollRaf, { passive: true });

  // Back-to-top button
  const backToTopBtn = document.getElementById('back-to-top-btn');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Escape key closes drawers
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllDrawers();
  });

  // Language Toggle Button
  const langBtn = document.getElementById('lang-toggle-btn');
  langBtn.addEventListener('click', toggleLanguage);

  // Cart Drawer open/close
  const cartBtn = document.getElementById('cart-toggle-btn');
  const cartCloseBtn = document.getElementById('cart-drawer-close');
  const cartDrawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('drawer-overlay');

  cartBtn.addEventListener('click', () => {
    cartDrawer.classList.add('open');
    overlay.classList.add('active');
    syncScrollLock();
  });

  cartCloseBtn.addEventListener('click', closeAllDrawers);

  // Mobile sidebar open/close
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileSidebar = document.getElementById('mobile-sidebar');

  mobileMenuBtn.addEventListener('click', () => {
    mobileSidebar.classList.add('open');
    overlay.classList.add('active');
    syncScrollLock();
  });

  document.getElementById('mobile-sidebar-close').addEventListener('click', closeAllDrawers);

  // Close mobile menu when a nav link is clicked
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', closeAllDrawers);
  });

  // Backdrop overlay click action (closes drawer & menu)
  overlay.addEventListener('click', closeAllDrawers);

  // Tabs filtering click binding
  const tabs = document.querySelectorAll('.filter-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      state.currentFilter = e.target.getAttribute('data-filter');
      renderProducts();
    });
  });

  // Real-time Search input binding
  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');
  
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    if (state.searchQuery.length > 0) {
      searchClearBtn.style.display = 'block';
    } else {
      searchClearBtn.style.display = 'none';
    }
    renderProducts();
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    searchClearBtn.style.display = 'none';
    renderProducts();
    searchInput.focus();
  });

  // WhatsApp Checkout button binding
  const checkoutBtn = document.getElementById('whatsapp-checkout-btn');
  checkoutBtn.addEventListener('click', checkoutWhatsApp);
}

// Toggle language state between te and en
function toggleLanguage() {
  state.currentLanguage = state.currentLanguage === 'te' ? 'en' : 'te';
  
  // Update button label
  const label = document.getElementById('current-lang-label');
  label.textContent = state.currentLanguage === 'te' ? 'TELUGU' : 'ENGLISH';
  
  applyLanguageClass();
  renderApp();
}

// Set CSS classes for dynamic lang visibility
function applyLanguageClass() {
  document.body.classList.remove('lang-te', 'lang-en');
  if (state.currentLanguage === 'te') {
    document.body.classList.add('lang-te');
  } else {
    document.body.classList.add('lang-en');
  }
}

// Fetch content from data.json
async function loadData() {
  try {
    const res = await fetch("data.json");
    const data = await res.json();
    
    // Bind Business metadata to page
    const biz = data.business;
    state.businessContact = biz.whatsapp || '919000055035';
    
    document.getElementById("business-name-te").textContent = biz.name.te;
    document.getElementById("business-name-en").textContent = biz.name.en.toUpperCase();
    document.getElementById("business-tagline-te").textContent = biz.tagline.te;    document.getElementById("business-tagline-en").textContent = biz.tagline.en;
    document.getElementById("business-intro-te").textContent = biz.intro.te;
    document.getElementById("business-intro-en").textContent = biz.intro.en;
    
    // Update Document Title
    document.title = `${biz.name.en} · Premium Cold-Pressed Oils`;

    // Process Sells & Buys section
    const sellSection = data.sections.find(s => s.key === 'sell');
    if (sellSection) {
      // Flatten items across all categories for catalog store, tagging their category icon type
      state.allProducts = [];
      sellSection.categories.forEach(cat => {
        cat.items.forEach(item => {
          // Keep category icon as filter tag (e.g. 'oil' or 'leaf')
          state.allProducts.push({
            ...item,
            categoryIcon: cat.icon
          });
        });
      });
    }

    const buySection = data.sections.find(s => s.key === 'buy');
    if (buySection) {
      state.farmerSeeds = buySection.categories[0].items;
      renderFarmerSeedsGrid(state.farmerSeeds);
    }

    // Set WhatsApp FAB Link
    const whatsappLink = document.getElementById("whatsapp-fab-link");
    if (whatsappLink) {
      whatsappLink.setAttribute("href", `https://wa.me/${state.businessContact}`);
    }

  } catch (err) {
    console.error("Could not load data.json or initialize layout", err);
  }
}

// Unified scroll-driven UI: header shrink, progress bar, back-to-top, active nav, hero parallax
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function updateScrollUI() {
  const header = document.getElementById('main-header');
  const progressBar = document.getElementById('scroll-progress');
  const backToTopBtn = document.getElementById('back-to-top-btn');

  const scrollY = window.scrollY;
  if (header) header.classList.toggle('scrolled', scrollY > 50);

  if (progressBar) {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
    progressBar.style.width = `${progress}%`;
  }

  if (backToTopBtn) backToTopBtn.classList.toggle('visible', scrollY > 600);

  // Hero parallax — content drifts up and fades as you scroll away
  if (!prefersReducedMotion) {
    const heroContent = document.querySelector('.hero-content');
    if (heroContent && scrollY <= window.innerHeight) {
      heroContent.style.transform = `translateY(${scrollY * 0.18}px)`;
      heroContent.style.opacity = Math.max(0, 1 - scrollY / (window.innerHeight * 0.75));
    }
  }

  // Highlight the nav link of the section currently in view
  const sections = document.querySelectorAll('main section[id]');
  let activeId = '';
  sections.forEach(section => {
    if (scrollY >= section.offsetTop - 140) activeId = section.id;
  });
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${activeId}`);
  });
}

// requestAnimationFrame throttle — keeps scrolling buttery smooth
let scrollTicking = false;
function onScrollRaf() {
  if (!scrollTicking) {
    window.requestAnimationFrame(() => {
      updateScrollUI();
      scrollTicking = false;
    });
    scrollTicking = true;
  }
}

// Scroll-reveal animations with staggered entrance
function initScrollReveal() {
  if (prefersReducedMotion) return; // Skip animations entirely for reduced-motion users

  const revealTargets = document.querySelectorAll(
    '.section-header, .product-card, .seed-card, .testimonial-card, ' +
    '.process-step, .trust-card, .faq-item, .benefit-item'
  );
  revealTargets.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const siblings = Array.from(entry.target.parentElement.children)
        .filter(c => c.classList.contains('reveal'));
      entry.target.style.transitionDelay = `${Math.min(siblings.indexOf(entry.target), 6) * 90}ms`;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  revealTargets.forEach(el => observer.observe(el));
}

// Setup FAQ Accordion Toggles (dynamic height so long answers never clip)
function setupFAQAccordions() {
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.parentElement;
      const answer = parent.querySelector('.faq-answer');
      const isActive = parent.classList.contains('active');

      // Close other opened FAQs
      document.querySelectorAll('.faq-item.active').forEach(item => {
        item.classList.remove('active');
        item.querySelector('.faq-answer').style.maxHeight = null;
      });

      if (!isActive) {
        parent.classList.add('active');
        answer.style.maxHeight = `${answer.scrollHeight}px`;
      }
    });
  });

  // Recalculate open FAQ height on resize
  window.addEventListener('resize', () => {
    const openAnswer = document.querySelector('.faq-item.active .faq-answer');
    if (openAnswer) openAnswer.style.maxHeight = `${openAnswer.scrollHeight}px`;
  });
}

// Show micro-toast status notification (auto-dismisses, max 3 stacked)
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  // Keep at most 3 toasts on screen
  while (container.children.length >= 3) {
    container.firstElementChild.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-triangle-exclamation"></i>';
  toast.innerHTML = `${icon} <span>${message}</span>`;

  container.appendChild(toast);

  // Auto-dismiss after 2s, then remove from DOM after the fade completes
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 400);
  }, 2000);
}

// Render Sourcing Seeds Grid with Images (Farmer Corner)
function renderFarmerSeedsGrid(items) {
  const container = document.getElementById("seeds-grid");
  if (!container) return;
  container.innerHTML = "";

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "product-card seed-card"; // Reuse product card visual styles

    const badgeMarkup = `<span class="product-badge gold">Spot Payout</span>`;

    // Check media
    let mediaMarkup;
    if (item.image) {
      mediaMarkup = `<img class="product-image" src="${item.image}" alt="${item.en}" loading="lazy">`;
    } else {
      mediaMarkup = `<div class="product-placeholder-icon">${SVGIcons.seed}</div>`;
    }

    card.innerHTML = `
      ${badgeMarkup}
      <div class="product-image-container">
        ${mediaMarkup}
      </div>
      <div class="product-info">
        <h3 class="product-title-te">${item.te}</h3>
        <span class="product-title-en">${item.en}</span>
        
        <div class="product-price" style="margin-top: 0.6rem; margin-bottom: 0.8rem;">
          <span class="price-current" style="color: var(--accent-gold); font-size: 1.3rem;">${item.buyingPrice}</span>
        </div>
        
        <p class="product-description te" style="min-height: auto; font-weight: 550; font-size: 0.85rem;"><i class="fa-solid fa-circle-check icon-green"></i> ${item.requirement.te}</p>
        <p class="product-description en" style="display:none; min-height: auto; font-weight: 550; font-size: 0.85rem;"><i class="fa-solid fa-circle-check icon-green"></i> ${item.requirement.en}</p>
      </div>
    `;
    container.appendChild(card);

    // Same fallback for seed cards
    const seedImgEl = card.querySelector('img.product-image');
    if (seedImgEl) {
      seedImgEl.addEventListener('error', () => {
        const ph = document.createElement('div');
        ph.className = 'product-placeholder-icon';
        ph.innerHTML = SVGIcons.seed;
        seedImgEl.replaceWith(ph);
      }, { once: true });
    }
  });
}

// Render Products Grid based on active category filter and search term
function renderProducts() {
  const grid = document.getElementById("products-grid");
  if (!grid) return;
  grid.innerHTML = "";

  // Perform search and category filtering
  const filtered = state.allProducts.filter(prod => {
    // 1. Category Filter
    if (state.currentFilter !== 'all' && prod.categoryIcon !== state.currentFilter) {
      return false;
    }
    // 2. Search Query Filter
    if (state.searchQuery.length > 0) {
      const matchNameEn = prod.en.toLowerCase().includes(state.searchQuery);
      const matchNameTe = prod.te.includes(state.searchQuery);
      const matchDescEn = prod.description.en.toLowerCase().includes(state.searchQuery);
      const matchDescTe = prod.description.te.includes(state.searchQuery);
      return matchNameEn || matchNameTe || matchDescEn || matchDescTe;
    }
    return true;
  });

  // Display empty search state
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="no-results-card">
        <i class="fa-solid fa-magnifying-glass-slash"></i>
        <h3>No Products Found</h3>
        <p>Try searching for other terms like 'Neem', 'Oil', 'కొబ్బరి' or reset filters.</p>
        <button class="btn btn-primary btn-sm" onclick="document.getElementById('search-input').value=''; state.searchQuery=''; renderProducts(); document.getElementById('search-clear-btn').style.display='none';">Reset Search</button>
      </div>
    `;
    return;
  }

  filtered.forEach((prod) => {
    const card = document.createElement("div");
    card.className = "product-card";

    // Set custom ID for binding
    const productId = `prod-${prod.en.toLowerCase().replace(/\s+/g, '-')}`;

    // Select product default details
    const defaultSize = prod.sizes[0];
    const itemRating = prod.rating || 4.8;
    const itemReviews = prod.reviewsCount || 100;
    const discountPct = defaultSize.originalPrice > defaultSize.price
      ? Math.round((1 - defaultSize.price / defaultSize.originalPrice) * 100)
      : 0;
    
    // Check if there is a badge
    const badgeMarkup = prod.badge 
      ? `<span class="product-badge ${prod.badge.toLowerCase().includes('best') ? 'gold' : ''}">${prod.badge}</span>` 
      : '';

    // Check media
    let mediaMarkup;
    if (prod.image) {
      mediaMarkup = `<img class="product-image" src="${prod.image}" alt="${prod.en}" loading="lazy">`;
    } else {
      mediaMarkup = `<div class="product-placeholder-icon">${SVGIcons[prod.categoryIcon]}</div>`;
    }

    // Build Select sizes dropdown
    let sizeOptions = '';
    prod.sizes.forEach((size, idx) => {
      sizeOptions += `<option value="${idx}">${size.label} - ₹${size.price}</option>`;
    });

    card.innerHTML = `
      ${badgeMarkup}
      <div class="product-image-container">
        ${mediaMarkup}
      </div>
      <div class="product-info">
        <div class="product-rating">
          <i class="fa-solid fa-star"></i>
          <span>${itemRating}</span>
          <span class="rating-count">(${itemReviews} reviews)</span>
        </div>
        <h3 class="product-title-te">${prod.te}</h3>
        <span class="product-title-en">${prod.en}</span>
        
        <p class="product-description te">${prod.description.te}</p>
        <p class="product-description en" style="display:none;">${prod.description.en}</p>
        
        <div class="product-size-selector">
          <select id="${productId}-size" class="size-select" data-prod-index="${state.allProducts.indexOf(prod)}">
            ${sizeOptions}
          </select>
        </div>
        
        <div class="product-footer">
          <div class="product-price">
            <span class="price-current" id="${productId}-price">₹${defaultSize.price}</span>
            <span class="price-original" id="${productId}-original-price">₹${defaultSize.originalPrice}</span>
          </div>
          ${discountPct > 0 ? `<span class="price-discount">${discountPct}% OFF</span>` : ''}
          <div id="${productId}-action-container" class="action-btn-cell">
            <!-- Add button or controller injected here dynamically -->
          </div>
        </div>
      </div>
    `;

    grid.appendChild(card);

    // If the product image fails to load, swap in the category placeholder icon
    const imgEl = card.querySelector('img.product-image');
    if (imgEl) {
      imgEl.addEventListener('error', () => {
        const ph = document.createElement('div');
        ph.className = 'product-placeholder-icon';
        ph.innerHTML = SVGIcons[prod.categoryIcon];
        imgEl.replaceWith(ph);
      }, { once: true });
    }

    // Setup select list dynamic change listener to update rates and action buttons
    const sizeSelect = document.getElementById(`${productId}-size`);
    
    const updatePricesAndButton = () => {
      const sizeIdx = parseInt(sizeSelect.value);
      const prodData = state.allProducts[state.allProducts.indexOf(prod)];
      const selectedSize = prodData.sizes[sizeIdx];
      
      document.getElementById(`${productId}-price`).textContent = `₹${selectedSize.price}`;
      document.getElementById(`${productId}-original-price`).textContent = `₹${selectedSize.originalPrice}`;

      // Update discount badge for the selected size
      const discountEl = card.querySelector('.price-discount');
      if (discountEl) {
        const pct = selectedSize.originalPrice > selectedSize.price
          ? Math.round((1 - selectedSize.price / selectedSize.originalPrice) * 100)
          : 0;
        discountEl.textContent = `${pct}% OFF`;
        discountEl.style.display = pct > 0 ? '' : 'none';
      }
      
      // Update inline button according to selected size item in cart
      renderInlineAction(prod, selectedSize.label, productId, sizeSelect);
    };

    sizeSelect.addEventListener('change', updatePricesAndButton);
    
    // Initial action button display render
    updatePricesAndButton();
  });
}

// Render dynamic Inline Button logic: Add / Quantity Controller
function renderInlineAction(product, sizeLabel, productId, sizeSelectElement) {
  const cell = document.getElementById(`${productId}-action-container`);
  if (!cell) return;

  const cartItemId = `${product.en.toLowerCase().replace(/\s+/g, '-')}-${sizeLabel.replace(/\s+/g, '-')}`;
  const cartItem = state.cart.find(i => i.cartItemId === cartItemId);

  if (cartItem) {
    // If item is in cart, morph into quantity controls
    cell.innerHTML = `
      <div class="storefront-qty-selector">
        <button class="storefront-qty-dec" data-cart-id="${cartItemId}"><i class="fa-solid fa-minus"></i></button>
        <span>${cartItem.quantity}</span>
        <button class="storefront-qty-inc" data-cart-id="${cartItemId}"><i class="fa-solid fa-plus"></i></button>
      </div>
    `;

    // Bind events to storefront qty triggers
    cell.querySelector('.storefront-qty-dec').addEventListener('click', () => {
      updateItemQuantity(cartItemId, -1);
    });
    cell.querySelector('.storefront-qty-inc').addEventListener('click', () => {
      updateItemQuantity(cartItemId, 1);
    });
  } else {
    // Render default Add button
    cell.innerHTML = `
      <button class="btn-add-cart">
        <i class="fa-solid fa-plus"></i> Add
      </button>
    `;

    cell.querySelector('.btn-add-cart').addEventListener('click', () => {
      const prodIdx = state.allProducts.indexOf(product);
      const sizeIdx = parseInt(sizeSelectElement.value);
      addToCart(prodIdx, sizeIdx);
    });
  }
}

// Add Item to E-Commerce Cart
function addToCart(productIndex, sizeIndex) {
  const product = state.allProducts[productIndex];
  const sizeOption = product.sizes[sizeIndex];

  // Match unique cart id as: prodName + label
  const cartItemId = `${product.en.toLowerCase().replace(/\s+/g, '-')}-${sizeOption.label.replace(/\s+/g, '-')}`;

  const existing = state.cart.find(item => item.cartItemId === cartItemId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      cartItemId: cartItemId,
      te: product.te,
      en: product.en,
      size: sizeOption.label,
      price: sizeOption.price,
      quantity: 1,
      categoryIcon: product.categoryIcon,
      image: product.image
    });
  }

  saveCartToLocalStorage();
  renderCart();
  renderProducts(); // Update inline controller state in catalog grid
  
  // Show toast notification feedback
  const toastMsg = state.currentLanguage === 'te' 
    ? `${product.te} (${sizeOption.label}) బుట్టలో చేర్చబడింది!` 
    : `${product.en} (${sizeOption.label}) added to basket!`;
  showToast(toastMsg, 'success');
}

// Remove item entirely from Cart
function removeFromCart(cartItemId) {
  const item = state.cart.find(i => i.cartItemId === cartItemId);
  state.cart = state.cart.filter(i => i.cartItemId !== cartItemId);
  
  saveCartToLocalStorage();
  renderCart();
  renderProducts(); // Refresh catalog grid buttons
  
  if (item) {
    const name = state.currentLanguage === 'te' ? item.te : item.en;
    showToast(`${name} removed from basket.`, 'info');
  }
}

// Modify item quantity directly
function updateItemQuantity(cartItemId, amount) {
  const item = state.cart.find(i => i.cartItemId === cartItemId);
  if (!item) return;

  item.quantity += amount;
  if (item.quantity <= 0) {
    removeFromCart(cartItemId);
  } else {
    saveCartToLocalStorage();
    renderCart();
    renderProducts(); // Keep catalog grid inline inputs in perfect sync
  }
}

// Render Slide-Out Cart list and calculate Free Delivery target
function renderCart() {
  const container = document.getElementById('cart-drawer-items');
  const footer = document.getElementById('cart-drawer-footer');
  const subtotalEl = document.getElementById('cart-subtotal-price');
  const navCountEl = document.getElementById('cart-count');

  if (!container || !footer || !subtotalEl || !navCountEl) return;

  // Clear container
  container.innerHTML = "";

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart-message">
        <i class="fa-solid fa-basket-shopping"></i>
        <p class="te">మీ బుట్ట ఖాళీగా ఉంది.</p>
        <p class="en" style="display:none;">Your basket is currently empty.</p>
        <button class="btn btn-primary" onclick="document.getElementById('cart-drawer').classList.remove('open'); document.getElementById('drawer-overlay').classList.remove('active'); document.body.classList.remove('no-scroll');">
          <span class="te">ఉత్పత్తులను చూడండి</span>
          <span class="en" style="display:none;">Browse Products</span>
        </button>
      </div>
    `;
    footer.style.display = "none";
    navCountEl.textContent = "0";
    applyLanguageClass(); // Refilters visibility
    return;
  }

  // Populate list
  let totalQty = 0;
  let subtotal = 0;

  state.cart.forEach(item => {
    totalQty += item.quantity;
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    const row = document.createElement("div");
    row.className = "cart-item";

    let imgMarkup;
    if (item.image) {
      imgMarkup = `<img src="${item.image}" alt="${item.en}">`;
    } else {
      imgMarkup = `<div class="product-placeholder-icon">${SVGIcons[item.categoryIcon]}</div>`;
    }

    row.innerHTML = `
      <div class="cart-item-img">${imgMarkup}</div>
      <div class="cart-item-details">
        <h4>
          <span class="te">${item.te}</span>
          <span class="en" style="display:none;">${item.en}</span>
        </h4>
        <div class="cart-item-size">${item.size}</div>
        <div class="cart-item-price">₹${item.price}</div>
        <div class="cart-item-quantity">
          <button class="qty-btn" onclick="updateItemQuantity('${item.cartItemId}', -1)">-</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" onclick="updateItemQuantity('${item.cartItemId}', 1)">+</button>
        </div>
      </div>
      <button class="btn-remove-item" onclick="removeFromCart('${item.cartItemId}')" aria-label="Remove Item">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    `;

    container.appendChild(row);
  });

  // Calculate Free Shipping Progress Bar
  const trackerMsg = document.getElementById('shipping-tracker-msg');
  const trackerBar = document.getElementById('shipping-tracker-bar');
  
  if (trackerMsg && trackerBar) {
    const isTe = state.currentLanguage === 'te';
    if (subtotal >= state.shippingThreshold) {
      trackerBar.style.width = '100%';
      trackerBar.style.background = '#4E6548'; // Pure green
      trackerMsg.innerHTML = isTe 
        ? `🎉 <strong>అభినందనలు! మీకు ఉచిత డెలివరీ లభిస్తుంది</strong>` 
        : `🎉 <strong>Congratulations! You qualify for Free Delivery</strong>`;
    } else {
      const remaining = state.shippingThreshold - subtotal;
      const percentage = (subtotal / state.shippingThreshold) * 100;
      trackerBar.style.width = `${percentage}%`;
      trackerBar.style.background = '#C58B12'; // Honey amber warning
      trackerMsg.innerHTML = isTe 
        ? `ఉచిత డెలివరీ కొరకు ఇంకా <strong>₹${remaining}</strong> విలువైన ఉత్పత్తులను జోడించండి` 
        : `Add <strong>₹${remaining}</strong> more for <strong>Free Delivery</strong>`;
    }
  }

  // Update totals
  navCountEl.textContent = totalQty;
  subtotalEl.textContent = `₹${subtotal}`;
  footer.style.display = "block";
  
  applyLanguageClass(); // Re-apply toggle selectors
}

// Generate message and link to WhatsApp Checkout
function checkoutWhatsApp() {
  if (state.cart.length === 0) return;

  const isTe = state.currentLanguage === 'te';
  let message = "";
  let subtotal = 0;

  if (isTe) {
    message += "నమస్తే స్కంద ఎంటర్‌ప్రైజెస్! నేను ఈ క్రింది వస్తువులను ఆర్డర్ చేయాలనుకుంటున్నాను:\n\n";
  } else {
    message += "Namaste Skanda Enterprises! I would like to order the following products:\n\n";
  }

  state.cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    const name = isTe ? item.te : item.en;
    message += `${index + 1}. ${name} (${item.size}) x ${item.quantity} - ₹${itemTotal}\n`;
  });

  message += "\n";
  
  // Free delivery tag inside billing message
  const getsFreeDelivery = subtotal >= state.shippingThreshold;
  const deliveryCharge = getsFreeDelivery ? 0 : 50;

  if (isTe) {
    message += `ఉత్పత్తుల విలువ: ₹${subtotal}\n`;
    message += `డెలివరీ ఛార్జీలు: ${getsFreeDelivery ? "ఉచితం (Free)" : "₹50"}\n`;
    message += `మొత్తం చెల్లించవలసినది: ₹${subtotal + deliveryCharge}\n\n`;
    message += "దయచేసి నా ఆర్డర్‌ను ధృవీకరించి, డెలివరీ వివరాలను పంపగలరు. ధన్యవాదాలు!";
  } else {
    message += `Items Subtotal: ₹${subtotal}\n`;
    message += `Delivery Fee: ${getsFreeDelivery ? "FREE" : "₹50"}\n`;
    message += `Total Order Value: ₹${subtotal + deliveryCharge}\n\n`;
    message += "Please confirm my order and share delivery schedules. Thank you!";
  }

  const encodedText = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${state.businessContact}?text=${encodedText}`;

  // Open Checkout in new window
  window.open(whatsappUrl, '_blank');
  showToast("Opening WhatsApp Web...", "success");
}

// Save Cart State to LocalStorage
function saveCartToLocalStorage() {
  localStorage.setItem('skanda_cart', JSON.stringify(state.cart));
}

// Load Cart State from LocalStorage
function loadCartFromLocalStorage() {
  const data = localStorage.getItem('skanda_cart');
  if (data) {
    try {
      state.cart = JSON.parse(data);
    } catch (e) {
      state.cart = [];
    }
  }
}

// Render dynamic parts of application
function renderApp() {
  renderProducts();
  renderCart();
  
  // Reapply correct translations to static texts
  const elementsToTranslate = document.querySelectorAll('[data-te-text]');
  elementsToTranslate.forEach(el => {
    const valTe = el.getAttribute('data-te-text');
    const valEn = el.getAttribute('data-en-text');
    if (state.currentLanguage === 'te') {
      el.textContent = valTe;
    } else {
      el.textContent = valEn;
    }
  });
}

// Boot application
init();
