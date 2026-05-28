'use strict';

// ============================================
// STATE — persisted in localStorage
// ============================================
let cart     = JSON.parse(localStorage.getItem('estore_cart')     || '[]');
let wishlist = JSON.parse(localStorage.getItem('estore_wishlist') || '[]');

const saveState = () => {
  localStorage.setItem('estore_cart',     JSON.stringify(cart));
  localStorage.setItem('estore_wishlist', JSON.stringify(wishlist));
};

// ============================================
// HELPERS
// ============================================

/** Stable ID from product title */
const makeId = (title) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Extract product data from a .showcase DOM element */
const getProductFromShowcase = (showcase) => {
  const titleEl = showcase.querySelector('.showcase-title');
  const priceEl = showcase.querySelector('.price-box .price');
  const imgEl   = showcase.querySelector('.product-img.default')
                || showcase.querySelector('.showcase-banner img')
                || showcase.querySelector('.showcase-img')
                || showcase.querySelector('img');

  const title = titleEl ? titleEl.textContent.trim() : 'Product';
  const price = parseFloat((priceEl ? priceEl.textContent : '0').replace(/[^0-9.]/g, '')) || 0;
  const image = imgEl ? imgEl.getAttribute('src') : '';

  return { id: makeId(title), title, price, image };
};

// ============================================
// CART OPERATIONS
// ============================================
const addToCart = (product) => {
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  saveState();
  renderCart();
  showNotification(`"${product.title}" added to cart`, 'cart');
};

// Exposed on window so onclick="" in dynamic HTML can call them
window.removeFromCart = (id) => {
  cart = cart.filter(i => i.id !== id);
  saveState();
  renderCart();
};

window.changeQty = (id, delta) => {
  const item = cart.find(i => i.id === id);
  if (item) {
    item.quantity = Math.max(1, item.quantity + delta);
    saveState();
    renderCart();
  }
};

const cartTotal = () => cart.reduce((s, i) => s + i.price * i.quantity, 0);
const cartCount = () => cart.reduce((s, i) => s + i.quantity, 0);

// ============================================
// WISHLIST OPERATIONS
// ============================================
const toggleWishlist = (product) => {
  const idx = wishlist.findIndex(i => i.id === product.id);
  if (idx > -1) {
    wishlist.splice(idx, 1);
    saveState();
    renderWishlist();
    showNotification(`"${product.title}" removed from wishlist`, 'heart');
    return false;
  } else {
    wishlist.push(product);
    saveState();
    renderWishlist();
    showNotification(`"${product.title}" added to wishlist`, 'heart');
    return true;
  }
};

const isWishlisted = (id) => wishlist.some(i => i.id === id);

window.removeFromWishlist = (id) => {
  wishlist = wishlist.filter(i => i.id !== id);
  saveState();
  renderWishlist();
};

window.moveToCart = (id) => {
  const item = wishlist.find(i => i.id === id);
  if (item) {
    addToCart(item);
    window.removeFromWishlist(id);
  }
};

// ============================================
// RENDER — CART
// ============================================
const renderCart = () => {
  // Badge counts
  document.querySelectorAll('[data-cart-count]').forEach(el => {
    el.textContent = cartCount();
  });

  const wrapper = document.getElementById('cartItemsWrapper');
  if (!wrapper) return;

  if (cart.length === 0) {
    wrapper.innerHTML = `
      <div class="empty-state">
        <ion-icon name="bag-handle-outline"></ion-icon>
        <p>Your cart is empty</p>
      </div>`;
  } else {
    wrapper.innerHTML = cart.map(item => `
      <div class="sidebar-item">
        <img src="${item.image}" alt="${item.title}"
             class="sidebar-item-img"
             onerror="this.src='./assets/images/products/1.jpg'">
        <div class="sidebar-item-info">
          <h4 class="sidebar-item-title">${item.title}</h4>
          <p class="sidebar-item-price">$${(item.price * item.quantity).toFixed(2)}</p>
          <div class="qty-control">
            <button class="qty-btn" onclick="changeQty('${item.id}', -1)">&#8722;</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn" onclick="changeQty('${item.id}', 1)">&#43;</button>
          </div>
        </div>
        <button class="item-remove-btn" onclick="removeFromCart('${item.id}')" title="Remove">
          <ion-icon name="close-outline"></ion-icon>
        </button>
      </div>
    `).join('');
  }

  const subtotalEl = document.getElementById('cartSubtotal');
  if (subtotalEl) subtotalEl.textContent = `$${cartTotal().toFixed(2)}`;
};

// ============================================
// RENDER — WISHLIST
// ============================================
const renderWishlist = () => {
  // Badge counts
  document.querySelectorAll('[data-wishlist-count]').forEach(el => {
    el.textContent = wishlist.length;
  });

  // Sync heart-button active states across product cards
  document.querySelectorAll('.showcase-actions').forEach(actions => {
    const showcase  = actions.closest('.showcase');
    if (!showcase) return;
    const titleEl   = showcase.querySelector('.showcase-title');
    if (!titleEl) return;
    const id        = makeId(titleEl.textContent.trim());
    const heartBtn  = actions.querySelector('.btn-action:first-child');
    if (heartBtn) heartBtn.classList.toggle('wishlisted', isWishlisted(id));
  });

  const wrapper = document.getElementById('wishlistItemsWrapper');
  if (!wrapper) return;

  if (wishlist.length === 0) {
    wrapper.innerHTML = `
      <div class="empty-state">
        <ion-icon name="heart-outline"></ion-icon>
        <p>Your wishlist is empty</p>
      </div>`;
  } else {
    wrapper.innerHTML = wishlist.map(item => `
      <div class="sidebar-item">
        <img src="${item.image}" alt="${item.title}"
             class="sidebar-item-img"
             onerror="this.src='./assets/images/products/1.jpg'">
        <div class="sidebar-item-info">
          <h4 class="sidebar-item-title">${item.title}</h4>
          <p class="sidebar-item-price">$${item.price.toFixed(2)}</p>
          <button class="btn-move-to-cart" onclick="moveToCart('${item.id}')">
            Add to Cart
          </button>
        </div>
        <button class="item-remove-btn" onclick="removeFromWishlist('${item.id}')" title="Remove">
          <ion-icon name="close-outline"></ion-icon>
        </button>
      </div>
    `).join('');
  }
};

// ============================================
// CHECKOUT RENDER
// ============================================
const renderCheckout = () => {
  const itemsEl = document.getElementById('checkoutOrderItems');
  const totalEl = document.getElementById('checkoutTotal');

  if (itemsEl) {
    const rows = cart.map(item => `
      <div class="checkout-item-row">
        <span class="checkout-item-name">
          ${item.title}
          <span class="checkout-item-qty"> ×${item.quantity}</span>
        </span>
        <span class="checkout-item-amount">$${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `).join('');

    itemsEl.innerHTML = rows + `
      <hr style="border:none;border-top:1px dashed #ddd;margin:8px 0">
      <div class="checkout-item-row checkout-shipping-row">
        <span>Shipping</span>
        <span class="free-shipping">FREE</span>
      </div>`;
  }

  if (totalEl) totalEl.textContent = `$${cartTotal().toFixed(2)}`;
};

// ============================================
// NOTIFICATION TOAST
// ============================================
const showNotification = (message, type) => {
  const notif  = document.getElementById('cartNotification');
  if (!notif) return;

  const iconEl = notif.querySelector('ion-icon');
  const textEl = document.getElementById('cartNotificationText');

  if (iconEl) iconEl.setAttribute('name',
    type === 'heart' ? 'heart' : 'bag-check-outline');
  if (textEl) textEl.textContent = message;

  notif.classList.add('show');
  clearTimeout(notif._timer);
  notif._timer = setTimeout(() => notif.classList.remove('show'), 2800);
};

// ============================================
// PANEL / OVERLAY HELPERS
// ============================================
const getOverlayEl = () => document.querySelector('[data-overlay]');

const openPanel = (id) => {
  document.getElementById(id)?.classList.add('open');
  getOverlayEl()?.classList.add('active');
};

const closePanel = (id) => {
  document.getElementById(id)?.classList.remove('open');
  const anyOpen = document.querySelector('.cart-sidebar.open, .wishlist-sidebar.open');
  if (!anyOpen) getOverlayEl()?.classList.remove('active');
};

const openCheckout = () => {
  if (cart.length === 0) {
    showNotification('Your cart is empty!', 'cart');
    return;
  }
  renderCheckout();
  document.getElementById('checkoutOverlay')?.classList.add('open');
  closePanel('cartSidebar');
};

const closeCheckout = () => {
  document.getElementById('checkoutOverlay')?.classList.remove('open');
};

// ============================================
// PAYMENT INPUT FORMATTING
// ============================================
const formatCardNumber = (e) => {
  let v = e.target.value.replace(/\D/g, '').substring(0, 16);
  e.target.value = v.replace(/(.{4})/g, '$1 ').trim();
};

const formatExpiry = (e) => {
  let v = e.target.value.replace(/\D/g, '').substring(0, 4);
  if (v.length > 2) v = v.substring(0, 2) + ' / ' + v.substring(2);
  e.target.value = v;
};

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {

  // ---- Cart sidebar open / close ----
  document.querySelectorAll('[data-cart-open]').forEach(btn =>
    btn.addEventListener('click', () => openPanel('cartSidebar'))
  );
  document.querySelectorAll('[data-cart-close]').forEach(btn =>
    btn.addEventListener('click', () => closePanel('cartSidebar'))
  );

  // ---- Wishlist sidebar open / close ----
  document.querySelectorAll('[data-wishlist-open]').forEach(btn =>
    btn.addEventListener('click', () => openPanel('wishlistSidebar'))
  );
  document.querySelectorAll('[data-wishlist-close]').forEach(btn =>
    btn.addEventListener('click', () => closePanel('wishlistSidebar'))
  );

  // ---- Overlay closes sidebars ----
  getOverlayEl()?.addEventListener('click', () => {
    closePanel('cartSidebar');
    closePanel('wishlistSidebar');
  });

  // ---- Cart footer buttons ----
  document.getElementById('checkoutBtn')?.addEventListener('click', openCheckout);
  document.getElementById('continueShoppingBtn')?.addEventListener('click',
    () => closePanel('cartSidebar')
  );

  // ---- Checkout modal ----
  document.getElementById('checkoutCloseBtn')?.addEventListener('click', closeCheckout);
  document.getElementById('checkoutOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeCheckout();
  });

  // ---- Checkout form submit ----
  document.getElementById('checkoutForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    closeCheckout();
    cart = [];
    saveState();
    renderCart();
    document.getElementById('successOverlay')?.classList.add('open');
  });

  // ---- Success modal dismiss ----
  document.getElementById('successContinueBtn')?.addEventListener('click', () => {
    document.getElementById('successOverlay')?.classList.remove('open');
  });

  // ---- Card input formatting ----
  document.getElementById('cardNumber')?.addEventListener('input', formatCardNumber);
  document.getElementById('cardExpiry')?.addEventListener('input', formatExpiry);

  // ---- Product showcase action buttons (event delegation) ----
  // Button order inside .showcase-actions:  0=wishlist  1=eye  2=compare  3=add-to-cart
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-action');
    if (!btn) return;

    const actions  = btn.closest('.showcase-actions');
    if (!actions) return;

    const showcase = btn.closest('.showcase');
    if (!showcase) return;

    const siblings = Array.from(actions.querySelectorAll('.btn-action'));
    const idx      = siblings.indexOf(btn);

    if (idx === 0) {
      // Wishlist toggle
      e.preventDefault();
      const product = getProductFromShowcase(showcase);
      const added   = toggleWishlist(product);
      btn.classList.toggle('wishlisted', added);

    } else if (idx === 3) {
      // Add to cart
      e.preventDefault();
      addToCart(getProductFromShowcase(showcase));
    }
  });

  // ---- "Add to cart" buttons in Deal-of-the-Day featured cards ----
  document.querySelectorAll('.add-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const showcase = btn.closest('.showcase');
      if (showcase) addToCart(getProductFromShowcase(showcase));
    });
  });

  // ---- Initial render from saved state ----
  renderCart();
  renderWishlist();
});
