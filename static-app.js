(function () {
  'use strict';

  const api = {
    async loadJson(path) {
      try {
        console.log(`Attempting to load: ${path}`);
        const response = await fetch(path, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!data || (Array.isArray(data) && data.length === 0)) {
          throw new Error(`Empty or invalid data in ${path}`);
        }
        console.log(`Successfully loaded ${path}:`, data);
        return data;
      } catch (err) {
        console.error(`Error loading ${path}:`, err.message);
        ui.notify(`خطأ في تحميل ${path.split('/').pop()}، تأكد من المسار أو الاتصال بالإنترنت`);
        return null;
      }
    },
    async getSettings() {
      return this.loadJson('./settings.json');
    },
    async getCategories() {
      return this.loadJson('./categories.json');
    },
    async getProducts() {
      const products = await this.loadJson('./products.json');
      if (products) {
        // Validate product data
        const validProducts = products.filter(p => 
          p.id && p.name && typeof p.price === 'number' && p.mainImageUrl
        );
        if (validProducts.length === 0) {
          console.warn('No valid products found in products.json');
          ui.notify('لا توجد منتجات صالحة في الملف، تحقق من بيانات products.json');
        }
        return validProducts;
      }
      return [];
    },
    async getProductById(id) {
      const products = await this.getProducts();
      const product = products.find(p => String(p.id) === String(id));
      if (!product) {
        console.warn(`Product with ID ${id} not found`);
      }
      return product || null;
    }
  };

  let settings = {};

  const ui = {
    q(selector, root = document) { return root.querySelector(selector); },
    qa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); },
    formatPrice(value) { 
      return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: settings.currency || 'EGP' }).format(value); 
    },
    notify(message) {
      const el = document.createElement('div');
      el.className = 'notification animate__animated animate__slideInRight';
      el.textContent = message;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    },
    async loadSettings() {
      try {
        settings = await api.getSettings();
        if (!settings) {
          console.warn('Settings not loaded, using defaults');
          settings = {
            primaryColor: '#FF6B9B',
            secondaryColor: '#FFD1DC',
            accentColor: '#FFD700',
            logoUrl: 'https://via.placeholder.com/50',
            instagramUrl: '#',
            facebookUrl: '#',
            telegramBot: 'https://t.me/Tranwjj?fbclid=PAQ0xDSwMMp9pleHRuA2FlbQIxMQABp1udY8nGzTDQLZZOErrybpzN0lPiTlmRZRRCDwX12d1kJbwrkaQ8Z6TYnKqA_aem_j7DZ_BTf54htFvxygFQbfg',
            telegramGroupUrl: '#',
            whatsappNumber: '201050043254',
            currency: 'EGP',
            bannerImages: ['https://via.placeholder.com/1200x600'],
            bannerAnimations: ['animate__fadeIn'],
            bannerInterval: 5000
          };
        }
        document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
        document.documentElement.style.setProperty('--secondary-color', settings.secondaryColor);
        document.documentElement.style.setProperty('--accent-color', settings.accentColor);
        this.qa('#logo').forEach(logo => logo.src = settings.logoUrl);
        this.qa('#instagramLink').forEach(link => link.href = settings.instagramUrl);
        this.qa('#facebookLink').forEach(link => link.href = settings.facebookUrl);
        this.qa('#telegramLink').forEach(link => link.href = `https://t.me/${settings.telegramBot}`);
        this.qa('#telegramGroupLink').forEach(link => link.href = settings.telegramGroupUrl);
        this.updateCartCount();
        this.updateFavoritesCount();
      } catch (err) {
        console.error('Failed to load settings:', err);
        this.notify('خطأ في تحميل الإعدادات، سيتم استخدام الإعدادات الافتراضية');
      }
    },
    updateCartCount() {
      const cartCount = cart.getAll().reduce((sum, item) => sum + (item.quantity || 1), 0);
      this.qa('#cartCount').forEach(el => el.textContent = cartCount);
    },
    updateFavoritesCount() {
      const favoritesCount = favorites.getAll().length;
      this.qa('#favoritesCount').forEach(el => el.textContent = favoritesCount);
    },
    renderCategories(categories) {
      const container = this.q('#categoriesContainer');
      if (!container) {
        console.warn('Categories container not found');
        return;
      }
      if (!categories || categories.length === 0) {
        container.innerHTML = '<p class="text-center">لا توجد فئات متاحة</p>';
        return;
      }
      container.innerHTML = categories.map(c => `
        <div class="col-md-4 mb-4 animate__animated animate__fadeIn">
          <div class="category-card" onclick="location.href='products.html?categoryId=${c.id}'">
            <img src="${c.imageUrl}" class="card-img-top" alt="${c.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/250';">
            <div class="card-body">
              <h5>${c.name}</h5>
              <p class="text-muted">اكتشف مجموعة ${c.name} المميزة</p>
              <a href="products.html?categoryId=${c.id}" class="btn btn-primary"><i class="fas fa-eye me-1"></i> استعرض المنتجات</a>
            </div>
          </div>
        </div>
      `).join('');
    },
    renderProducts(products, containerId = 'productsContainer') {
      const container = this.q(`#${containerId}`);
      if (!container) {
        console.warn(`Products container not found: ${containerId}`);
        return;
      }
      if (!products || products.length === 0) {
        container.innerHTML = '<p class="text-center">لا توجد منتجات متاحة</p>';
        return;
      }
      container.innerHTML = products.map(p => `
        <div class="col-md-4 mb-4 animate__animated animate__fadeIn">
          <div class="product-card">
            <span class="availability ${p.isAvailable ? 'available' : 'unavailable'}">${p.isAvailable ? 'متوفر' : 'غير متوفر'}</span>
            <img src="${p.mainImageUrl}" class="card-img-top" alt="${p.name}" loading="lazy" onclick="location.href='product.html?id=${p.id}'" onerror="this.src='https://via.placeholder.com/250';">
            <div class="card-body">
              <h5>${p.name}</h5>
              <p class="text-primary">${this.formatPrice(p.price)}</p>
              <button class="btn btn-cart" data-id="${p.id}" data-name="${p.name}" ${!p.isAvailable ? 'disabled' : ''}><i class="fas fa-cart-plus me-1"></i> إضافة للسلة</button>
              <button class="btn ${favorites.getAll().some(f => String(f.id) === String(p.id)) ? 'btn-danger' : 'btn-outline-danger'} add-to-favorites" data-id="${p.id}" data-name="${p.name}"><i class="fas fa-heart me-1"></i> ${favorites.getAll().some(f => String(f.id) === String(p.id)) ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}</button>
            </div>
          </div>
        </div>
      `).join('');
    },
    renderProductDetails(product) {
      const mainImage = this.q('#mainImage');
      if (!mainImage || !product) {
        console.warn('Product or main image element not found');
        this.notify('المنتج غير موجود');
        return;
      }
      mainImage.src = product.mainImageUrl || 'https://via.placeholder.com/400';
      this.q('#productName').textContent = product.name || 'غير معروف';
      this.q('#productPrice').textContent = this.formatPrice(product.price || 0);
      this.q('#productDescription').textContent = product.description || 'لا يوجد وصف';
      this.q('#productColors').textContent = product.colors || '—';
      const availability = this.q('#productAvailability');
      if (availability) {
        availability.textContent = product.isAvailable ? 'متوفر' : 'غير متوفر';
        availability.classList.add(product.isAvailable ? 'bg-success' : 'bg-danger', 'text-white');
      }

      const thumbs = this.q('#thumbnails');
      if (thumbs) {
        thumbs.innerHTML = '';
        [product.mainImageUrl, product.image2Url, product.image3Url].filter(Boolean).forEach(src => {
          const col = document.createElement('div');
          col.className = 'col-4';
          col.innerHTML = `<img src="${src}" class="img-fluid thumbnail animate__animated animate__fadeIn" alt="صورة مصغرة" loading="lazy" onerror="this.src='https://via.placeholder.com/100';">`;
          col.querySelector('img').addEventListener('click', () => mainImage.src = src);
          thumbs.appendChild(col);
        });
      }

      const cartBtn = this.q('#addToCartBtn');
      if (cartBtn) {
        cartBtn.dataset.id = product.id;
        cartBtn.dataset.name = product.name;
        cartBtn.disabled = !product.isAvailable;
        cartBtn.addEventListener('click', () => {
          if (!product.isAvailable) return;
          cartBtn.disabled = true;
          cartBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> جاري الإضافة...';
          cart.add({ id: product.id, name: product.name });
          setTimeout(() => {
            cartBtn.disabled = !product.isAvailable;
            cartBtn.innerHTML = '<i class="fas fa-cart-plus me-1"></i> إضافة للسلة';
            this.updateCartCount();
          }, 800);
        });
      }

      const favoritesBtn = this.q('#addToFavoritesBtn');
      if (favoritesBtn) {
        favoritesBtn.dataset.id = product.id;
        favoritesBtn.dataset.name = product.name;
        favoritesBtn.textContent = favorites.getAll().some(f => String(f.id) === String(product.id)) ? 'إزالة من المفضلة' : 'إضافة للمفضلة';
        favoritesBtn.classList.toggle('btn-danger', favorites.getAll().some(f => String(f.id) === String(product.id)));
        favoritesBtn.classList.toggle('btn-outline-danger', !favorites.getAll().some(f => String(f.id) === String(product.id)));
        favoritesBtn.addEventListener('click', () => {
          favoritesBtn.disabled = true;
          favoritesBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> جاري الإضافة...';
          if (favorites.getAll().some(f => String(f.id) === String(product.id))) {
            favorites.remove(product.id);
            favoritesBtn.textContent = 'إضافة للمفضلة';
            favoritesBtn.classList.remove('btn-danger');
            favoritesBtn.classList.add('btn-outline-danger');
          } else {
            favorites.add({ id: product.id, name: product.name });
            favoritesBtn.textContent = 'إزالة من المفضلة';
            favoritesBtn.classList.remove('btn-outline-danger');
            favoritesBtn.classList.add('btn-danger');
          }
          setTimeout(() => {
            favoritesBtn.disabled = false;
            favoritesBtn.innerHTML = `<i class="fas fa-heart me-1"></i> ${favoritesBtn.textContent}`;
            this.updateFavoritesCount();
          }, 800);
        });
      }

      const wa = this.q('#whatsAppLink');
      if (wa) {
        const msg = `أريد طلب ${product.name}`;
        wa.href = `https://wa.me/${settings.whatsappNumber || '201050043254'}?text=${encodeURIComponent(msg)}`;
      }
      const tg = this.q('#telegramLink');
      if (tg) {
        const msg = `أريد طلب ${product.name}`;
        tg.href = `https://t.me/${settings.telegramBot || 'roaa_bot'}?text=${encodeURIComponent(msg)}`;
      }
    },
    renderCart(products) {
      const container = this.q('#cartContainer');
      const totalEl = this.q('#totalPrice');
      const buttonsContainer = this.q('#completeButtons');
      if (!container) {
        console.warn('Cart container not found');
        return;
      }
      if (!products || products.length === 0) {
        container.innerHTML = '<p class="text-center">لا توجد منتجات في السلة</p>';
        totalEl.textContent = this.formatPrice(0);
        if (buttonsContainer) buttonsContainer.innerHTML = '';
        return;
      }
      let total = 0;
      container.innerHTML = products.map(p => {
        total += p.price * (p.quantity || 1);
        return `
          <div class="col-md-4 mb-4 animate__animated animate__fadeIn">
            <div class="product-card">
              <img src="${p.mainImageUrl}" class="card-img-top" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/250';">
              <div class="card-body">
                <h5>${p.name}</h5>
                <p class="text-primary">${this.formatPrice(p.price)}</p>
                <div class="d-flex align-items-center justify-content-center">
                  <label class="me-2">الكمية:</label>
                  <input type="number" class="quantity-input form-control" data-id="${p.id}" value="${p.quantity || 1}" min="1">
                </div>
                <button class="btn btn-danger btn-remove mt-2" data-id="${p.id}"><i class="fas fa-trash me-1"></i> حذف</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
      if (totalEl) {
        totalEl.textContent = `إجمالي السعر: ${this.formatPrice(total)}`;
      }
      if (buttonsContainer) {
        buttonsContainer.innerHTML = `
          <a href="https://wa.me/${settings.whatsappNumber || '201050043254'}?text=${encodeURIComponent('طلبي:\n' + cart.generateOrderMessage(products) + '\nإجمالي: ' + (totalEl ? totalEl.textContent : this.formatPrice(total)))}" class="btn btn-complete btn-success"><i class="fab fa-whatsapp me-1"></i> إكمال عبر واتساب</a>
          <a href="https://t.me/${settings.telegramBot || 'roaa_bot'}?text=${encodeURIComponent('طلبي:\n' + cart.generateOrderMessage(products) + '\nإجمالي: ' + (totalEl ? totalEl.textContent : this.formatPrice(total)))}" class="btn btn-complete btn-info"><i class="fab fa-telegram-plane me-1"></i> إكمال عبر تليجرام</a>
        `;
      }
    },
    renderFavorites(products) {
      const container = this.q('#favoritesContainer');
      if (!container) {
        console.warn('Favorites container not found');
        return;
      }
      if (!products || products.length === 0) {
        container.innerHTML = '<p class="text-center">لا توجد منتجات في المفضلة</p>';
        return;
      }
      container.innerHTML = products.map(p => `
        <div class="col-md-4 mb-4 animate__animated animate__fadeIn">
          <div class="product-card">
            <span class="availability ${p.isAvailable ? 'available' : 'unavailable'}">${p.isAvailable ? 'متوفر' : 'غير متوفر'}</span>
            <img src="${p.mainImageUrl}" class="card-img-top" alt="${p.name}" loading="lazy" onclick="location.href='product.html?id=${p.id}'" onerror="this.src='https://via.placeholder.com/250';">
            <div class="card-body">
              <h5>${p.name}</h5>
              <p class="text-primary">${this.formatPrice(p.price)}</p>
              <button class="btn btn-danger btn-remove-favorite mt-2" data-id="${p.id}"><i class="fas fa-trash me-1"></i> حذف من المفضلة</button>
            </div>
          </div>
        </div>
      `).join('');
    },
    animateBanner() {
      const hero = this.q('#heroBanner');
      if (!hero) {
        console.warn('Hero banner not found');
        return;
      }
      let index = 0;
      const changeBanner = () => {
        const animClass = settings.bannerAnimations ? settings.bannerAnimations[index % settings.bannerAnimations.length] : 'animate__fadeIn';
        hero.style.backgroundImage = `url('${settings.bannerImages ? settings.bannerImages[index % settings.bannerImages.length] : 'https://via.placeholder.com/1200x600'}')`;
        hero.className = `hero animate__animated ${animClass}`;
        index++;
      };
      changeBanner();
      setInterval(changeBanner, settings.bannerInterval || 5000);
    }
  };

  const cart = {
    key: 'cartItems',
    getAll() {
      try {
        return JSON.parse(localStorage.getItem(this.key)) || [];
      } catch (err) {
        console.error('Error reading cart from localStorage:', err);
        return [];
      }
    },
    add(item) {
      try {
        let items = this.getAll();
        const existing = items.find(x => String(x.id) === String(item.id));
        if (existing) {
          existing.quantity = (existing.quantity || 1) + 1;
        } else {
          items.push({ id: item.id, name: item.name, quantity: 1 });
        }
        localStorage.setItem(this.key, JSON.stringify(items));
        ui.notify(`${item.name} تمت إضافته إلى السلة!`);
        ui.updateCartCount();
      } catch (err) {
        console.error('Error adding to cart:', err);
        ui.notify('خطأ في إضافة المنتج إلى السلة');
      }
    },
    updateQuantity(id, quantity) {
      try {
        const items = this.getAll();
        const item = items.find(x => String(x.id) === String(id));
        if (item && quantity > 0) {
          item.quantity = parseInt(quantity, 10);
          localStorage.setItem(this.key, JSON.stringify(items));
          ui.notify('تم تحديث الكمية!');
          ui.updateCartCount();
        }
      } catch (err) {
        console.error('Error updating cart quantity:', err);
        ui.notify('خطأ في تحديث الكمية');
      }
    },
    remove(id) {
      try {
        let items = this.getAll();
        const item = items.find(x => String(x.id) === String(id));
        if (item) {
          items = items.filter(x => String(x.id) !== String(id));
          localStorage.setItem(this.key, JSON.stringify(items));
          ui.notify(`تم حذف ${item.name} من السلة!`);
          ui.updateCartCount();
        }
      } catch (err) {
        console.error('Error removing from cart:', err);
        ui.notify('خطأ في حذف المنتج من السلة');
      }
    },
    mapToProducts(allProducts) {
      try {
        const items = this.getAll();
        return items.map(item => {
          const p = allProducts.find(pr => String(pr.id) === String(item.id));
          return p ? { ...p, quantity: item.quantity } : null;
        }).filter(p => p);
      } catch (err) {
        console.error('Error mapping cart to products:', err);
        return [];
      }
    },
    generateOrderMessage(products) {
      try {
        return products.map(p => `عدد (${p.quantity}) ${p.name} - السعر: ${ui.formatPrice(p.price * p.quantity)}`).join('\n');
      } catch (err) {
        console.error('Error generating order message:', err);
        return '';
      }
    }
  };

  const favorites = {
    key: 'favoritesItems',
    getAll() {
      try {
        return JSON.parse(localStorage.getItem(this.key)) || [];
      } catch (err) {
        console.error('Error reading favorites from localStorage:', err);
        return [];
      }
    },
    add(item) {
      try {
        let items = this.getAll();
        const existing = items.find(x => String(x.id) === String(item.id));
        if (existing) {
          ui.notify(`${item.name} موجود بالفعل في المفضلة!`);
          return;
        }
        items.push({ id: item.id, name: item.name });
        localStorage.setItem(this.key, JSON.stringify(items));
        ui.notify(`${item.name} تمت إضافته إلى المفضلة!`);
        ui.updateFavoritesCount();
      } catch (err) {
        console.error('Error adding to favorites:', err);
        ui.notify('خطأ في إضافة المنتج إلى المفضلة');
      }
    },
    remove(id) {
      try {
        let items = this.getAll();
        const item = items.find(x => String(x.id) === String(id));
        if (item) {
          items = items.filter(x => String(x.id) !== String(id));
          localStorage.setItem(this.key, JSON.stringify(items));
          ui.notify(`تم حذف ${item.name} من المفضلة!`);
          ui.updateFavoritesCount();
        }
      } catch (err) {
        console.error('Error removing from favorites:', err);
        ui.notify('خطأ في حذف المنتج من المفضلة');
      }
    },
    mapToProducts(allProducts) {
      try {
        const items = this.getAll();
        return items.map(item => {
          const p = allProducts.find(pr => String(pr.id) === String(item.id));
          return p ? { ...p } : null;
        }).filter(p => p);
      } catch (err) {
        console.error('Error mapping favorites to products:', err);
        return [];
      }
    }
  };

  function getQueryParam(name) {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get(name);
    } catch (err) {
      console.error('Error reading query param:', err);
      return null;
    }
  }

  // Debounce function to limit rapid input events
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

  async function initHome() {
    try {
      const categories = await api.getCategories();
      if (categories) {
        ui.renderCategories(categories);
      }
      ui.animateBanner();
    } catch (err) {
      console.error('Error initializing home:', err);
      ui.notify('خطأ في تحميل البيانات، حاول مرة أخرى');
    }
  }

  async function initProducts() {
    try {
      const [products, categoryId] = [await api.getProducts(), getQueryParam('categoryId')];
      if (!products || products.length === 0) {
        ui.notify('فشل في تحميل المنتجات، تأكد من وجود ملف products.json');
        return;
      }
      let filtered = products;
      if (categoryId) {
        filtered = filtered.filter(p => String(p.categoryId) === String(categoryId));
      }

      const searchInput = ui.q('#searchInput');
      const applySearch = debounce(async () => {
        const q = (searchInput?.value || '').toLowerCase().trim();
        const list = q ? filtered.filter(p => p.name.toLowerCase().includes(q)) : filtered;
        ui.renderProducts(list);
      }, 300);
      if (searchInput) {
        searchInput.addEventListener('input', applySearch);
      }
      await applySearch();

      // Wire up cart and favorites buttons for products page
      const container = ui.q('#productsContainer');
      if (container) {
        container.addEventListener('click', async (e) => {
          const cartBtn = e.target.closest('.btn-cart');
          const favBtn = e.target.closest('.add-to-favorites');
          if (cartBtn) {
            e.stopPropagation();
            const id = cartBtn.dataset.id;
            const name = cartBtn.dataset.name;
            cartBtn.disabled = true;
            cartBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> جاري الإضافة...';
            cart.add({ id, name });
            setTimeout(() => {
              cartBtn.disabled = false;
              cartBtn.innerHTML = '<i class="fas fa-cart-plus me-1"></i> إضافة للسلة';
              ui.updateCartCount();
            }, 800);
          } else if (favBtn) {
            e.stopPropagation();
            const id = favBtn.dataset.id;
            const name = favBtn.dataset.name;
            favBtn.disabled = true;
            favBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> جاري الإضافة...';
            const product = await api.getProductById(id);
            if (!product) {
              ui.notify('المنتج غير موجود');
              return;
            }
            if (favorites.getAll().some(f => String(f.id) === String(id))) {
              favorites.remove(id);
              favBtn.textContent = 'إضافة للمفضلة';
              favBtn.classList.remove('btn-danger');
              favBtn.classList.add('btn-outline-danger');
            } else {
              favorites.add({ id, name });
              favBtn.textContent = 'إزالة من المفضلة';
              favBtn.classList.remove('btn-outline-danger');
              favBtn.classList.add('btn-danger');
            }
            setTimeout(() => {
              favBtn.disabled = false;
              favBtn.innerHTML = `<i class="fas fa-heart me-1"></i> ${favBtn.textContent}`;
              ui.updateFavoritesCount();
            }, 800);
          }
        });
      }
    } catch (err) {
      console.error('Error initializing products:', err);
      ui.notify('خطأ في تحميل المنتجات، حاول مرة أخرى');
    }
  }

  async function initProductDetails() {
    try {
      const id = getQueryParam('id');
      if (!id) {
        console.warn('No product ID provided');
        ui.notify('لم يتم تحديد المنتج');
        return;
      }
      const product = await api.getProductById(id);
      if (!product) {
        console.warn(`Product with ID ${id} not found`);
        ui.notify('المنتج غير موجود');
        return;
      }
      ui.renderProductDetails(product);
    } catch (err) {
      console.error('Error initializing product details:', err);
      ui.notify('خطأ في تحميل تفاصيل المنتج، حاول مرة أخرى');
    }
  }

  async function initCart() {
    try {
      const all = await api.getProducts();
      if (!all || all.length === 0) {
        ui.notify('فشل في تحميل المنتجات، تأكد من وجود ملف products.json');
        return;
      }
      const cartProducts = cart.mapToProducts(all);
      ui.renderCart(cartProducts);

      const container = ui.q('#cartContainer');
      if (container) {
        container.addEventListener('input', debounce((e) => {
          if (e.target.classList.contains('quantity-input')) {
            const id = e.target.dataset.id;
            const quantity = parseInt(e.target.value, 10);
            if (quantity > 0) {
              cart.updateQuantity(id, quantity);
              initCart();
            }
          }
        }, 300));

        container.addEventListener('click', (e) => {
          const btn = e.target.closest('.btn-remove');
          if (btn) {
            const id = btn.dataset.id;
            cart.remove(id);
            initCart();
          }
        });
      }
    } catch (err) {
      console.error('Error initializing cart:', err);
      ui.notify('خطأ في تحميل السلة، حاول مرة أخرى');
    }
  }

  async function initFavorites() {
    try {
      const all = await api.getProducts();
      if (!all || all.length === 0) {
        ui.notify('فشل في تحميل المنتجات، تأكد من وجود ملف products.json');
        return;
      }
      const favoritesProducts = favorites.mapToProducts(all);
      ui.renderFavorites(favoritesProducts);

      const container = ui.q('#favoritesContainer');
      if (container) {
        container.addEventListener('click', (e) => {
          const btn = e.target.closest('.btn-remove-favorite');
          if (btn) {
            const id = btn.dataset.id;
            favorites.remove(id);
            initFavorites();
          }
        });
      }
    } catch (err) {
      console.error('Error initializing favorites:', err);
      ui.notify('خطأ في تحميل المفضلة، حاول مرة أخرى');
    }
  }

  function wireGlobalEvents() {
    window.addEventListener('scroll', () => {
      const navbar = document.querySelector('.navbar');
      if (navbar) {
        if (window.scrollY > 50) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
      }
    });
  }

  async function boot() {
    try {
      await ui.loadSettings();
      wireGlobalEvents();
      const path = location.pathname;
      console.log(`Initializing page: ${path}`);
      if (path === '/' || path.endsWith('/index.html') || path === '') {
        await initHome();
      } else if (path.endsWith('/products.html')) {
        await initProducts();
      } else if (path.endsWith('/product.html')) {
        await initProductDetails();
      } else if (path.endsWith('/cart.html')) {
        await initCart();
      } else if (path.endsWith('/favorites.html')) {
        await initFavorites();
      }
    } catch (err) {
      console.error('Bootstrap error:', err);
      ui.notify('حدث خطأ، برجاء إعادة المحاولة');
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();