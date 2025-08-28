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
        // Validate product data and use isAvailable
        const validProducts = products.filter(p => 
          p.id && p.name && typeof p.price === 'number' && p.mainImageUrl
        ).map(p => ({
          ...p,
          available: p.isAvailable ?? true,
          colors: typeof p.colors === 'string' ? p.colors.split('-').map(c => c.trim()) : (p.colors || [])
        }));
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
            bannerInterval: 4000
          };
        }
        document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
        document.documentElement.style.setProperty('--secondary-color', settings.secondaryColor);
        document.documentElement.style.setProperty('--accent-color', settings.accentColor);
        this.qa('#logo').forEach(logo => {
          logo.src = settings.logoUrl;
          logo.onerror = () => logo.src = 'https://via.placeholder.com/50';
        });
        this.qa('#instagramLink').forEach(link => link.href = settings.instagramUrl);
        this.qa('#facebookLink').forEach(link => link.href = settings.facebookUrl);
        this.qa('#telegramLink').forEach(link => link.href = `https://t.me/${settings.telegramBot}`);
        this.qa('#telegramGroupLink').forEach(link => link.href = settings.telegramGroupUrl);
        this.qa('#whatsappLink').forEach(link => link.href = `https://wa.me/${settings.whatsappNumber}`);
        // Preload banner images
        settings.bannerImages.forEach(url => {
          const img = new Image();
          img.src = url;
          img.onerror = () => img.src = 'https://via.placeholder.com/1200x600';
        });
        this.updateCartCount();
      } catch (err) {
        console.error('Failed to load settings:', err);
        this.notify('خطأ في تحميل الإعدادات، سيتم استخدام الإعدادات الافتراضية');
      }
    },
    updateCartCount() {
      const cartCount = cart.getAll().reduce((sum, item) => sum + (item.quantity || 1), 0);
      this.qa('#cartCount').forEach(el => el.textContent = cartCount);
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
        <div class="col-md-4 col-6 mb-4 animate__animated animate__fadeIn">
          <div class="category-card" onclick="location.href='products.html?categoryId=${c.id}'">
            <img src="${c.imageUrl}" class="card-img-top" alt="${c.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/250';">
            <div class="card-body">
              <h5>${c.name}</h5>
            </div>
          </div>
        </div>
      `).join('');
    },
    renderBanner() {
      const hero = this.q('.hero');
      if (!hero) return;
      let currentIndex = 0;
      const changeBanner = () => {
        hero.style.opacity = 0;
        setTimeout(() => {
          hero.style.backgroundImage = `url(${settings.bannerImages[currentIndex]})`;
          hero.classList.remove(...settings.bannerAnimations);
          hero.classList.add('animate__animated', settings.bannerAnimations[currentIndex % settings.bannerAnimations.length]);
          hero.style.opacity = 1;
          currentIndex = (currentIndex + 1) % settings.bannerImages.length;
        }, 800); // Increased transition time for smoother effect
      };
      changeBanner();
      setInterval(changeBanner, settings.bannerInterval || 4000);
    },
    renderProducts(products) {
      const container = this.q('#productsContainer');
      if (!container) {
        console.warn('Products container not found');
        return;
      }
      if (!products || products.length === 0) {
        container.innerHTML = '<p class="text-center">لا توجد منتجات متاحة</p>';
        return;
      }
      container.innerHTML = products.map(p => `
        <div class="col-md-4 col-6 mb-4 animate__animated animate__fadeInUp">
          <div class="product-card">
            <img src="${p.mainImageUrl}" class="card-img-top" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/250';">
            <div class="card-body">
              <h5>${p.name}</h5>
              <p>${this.formatPrice(p.price)}</p>
              <span class="availability ${p.available ? 'available' : 'unavailable'}">${p.available ? 'متوفر' : 'غير متوفر'}</span>
              <button class="btn btn-cart mt-2" data-id="${p.id}" data-name="${p.name}" ${!p.available ? 'disabled' : ''}><i class="fas fa-cart-plus me-1"></i> إضافة للسلة</button>
              <a href="product.html?id=${p.id}" class="btn btn-outline-primary mt-2"><i class="fas fa-eye me-1"></i> التفاصيل</a>
            </div>
          </div>
        </div>
      `).join('');
    },
    renderProductDetails(product) {
      this.q('#productName').textContent = product.name;
      this.q('#productPrice').textContent = this.formatPrice(product.price);
      this.q('#productDescription').textContent = product.description || 'لا يوجد وصف';
      this.q('#productColors').textContent = Array.isArray(product.colors) && product.colors.length > 0 ? product.colors.join(', ') : 'غير متوفر';
      this.q('#productAvailability').textContent = product.available ? 'متوفر' : 'غير متوفر';
      const mainImage = this.q('#mainImage');
      mainImage.src = product.mainImageUrl || 'https://via.placeholder.com/300';
      mainImage.onerror = () => mainImage.src = 'https://via.placeholder.com/300';
      const thumbnails = this.q('#thumbnails');
      const images = [product.mainImageUrl, product.image2Url, product.image3Url].filter(img => img && img !== product.mainImageUrl);
      thumbnails.innerHTML = [product.mainImageUrl, ...images].map((img, index) => `
        <img src="${img}" class="thumbnail m-2 ${index === 0 ? 'active' : ''}" alt="صورة مصغرة ${index + 1}" loading="lazy" onerror="this.src='https://via.placeholder.com/80';">
      `).join('');
      thumbnails.addEventListener('click', (e) => {
        const thumbnail = e.target.closest('.thumbnail');
        if (thumbnail && thumbnail.src !== mainImage.src) {
          this.qa('.thumbnail').forEach(t => t.classList.remove('active'));
          thumbnail.classList.add('active');
          mainImage.src = thumbnail.src;
          mainImage.onerror = () => mainImage.src = 'https://via.placeholder.com/300';
        }
      });
      const addToCartBtn = this.q('#addToCartBtn');
      addToCartBtn.dataset.id = product.id;
      addToCartBtn.dataset.name = product.name;
      addToCartBtn.disabled = !product.available;
    },
    renderCart(cartProducts) {
      const container = this.q('#cartContainer');
      if (!container) {
        console.warn('Cart container not found');
        return;
      }
      if (!cartProducts || cartProducts.length === 0) {
        container.innerHTML = '<p class="text-center">السلة فارغة</p>';
        this.q('#cartTotal').textContent = this.formatPrice(0);
        return;
      }
      container.innerHTML = cartProducts.map(p => `
        <div class="row mb-3 align-items-center">
          <div class="col-md-2 col-4">
            <img src="${p.mainImageUrl}" class="img-fluid rounded" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/100';">
          </div>
          <div class="col-md-4 col-8">
            <h5>${p.name}</h5>
          </div>
          <div class="col-md-2 col-6">
            <input type="number" class="form-control quantity-input" data-id="${p.id}" value="${p.quantity || 1}" min="1">
          </div>
          <div class="col-md-2 col-6">
            ${this.formatPrice((p.price || 0) * (p.quantity || 1))}
          </div>
          <div class="col-md-2 col-12 text-center">
            <button class="btn btn-outline-danger btn-remove" data-id="${p.id}"><i class="fas fa-trash"></i> إزالة</button>
          </div>
        </div>
      `).join('');
      const total = cartProducts.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 1), 0);
      this.q('#cartTotal').textContent = this.formatPrice(total);
    },
    searchProducts(products, query) {
      return products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    }
  };

  const cart = {
    getAll() { return JSON.parse(localStorage.getItem('cart') || '[]'); },
    add(item) {
      const all = this.getAll();
      const existing = all.find(i => String(i.id) === String(item.id));
      if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
      } else {
        all.push({ ...item, quantity: 1 });
      }
      localStorage.setItem('cart', JSON.stringify(all));
      ui.notify('تمت الإضافة إلى السلة');
      ui.updateCartCount();
    },
    remove(id) {
      const all = this.getAll().filter(i => String(i.id) !== String(id));
      localStorage.setItem('cart', JSON.stringify(all));
      ui.notify('تمت الإزالة من السلة');
    },
    updateQuantity(id, quantity) {
      const all = this.getAll();
      const item = all.find(i => String(i.id) === String(id));
      if (item) item.quantity = quantity;
      localStorage.setItem('cart', JSON.stringify(all));
    },
    clear() {
      localStorage.removeItem('cart');
      ui.notify('تم مسح السلة');
    },
    mapToProducts(products) {
      return this.getAll().map(c => {
        const p = products.find(pr => String(pr.id) === String(c.id));
        return { ...p, quantity: c.quantity };
      }).filter(p => p);
    }
  };

  function getQueryParam(param) {
    return new URLSearchParams(location.search).get(param);
  }

  function debounce(fn, ms) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), ms);
    };
  }

  async function initHome() {
    try {
      const categories = await api.getCategories();
      ui.renderCategories(categories);
      ui.renderBanner();
    } catch (err) {
      console.error('Error initializing home:', err);
      ui.notify('خطأ في تحميل الصفحة الرئيسية، حاول مرة أخرى');
    }
  }

  async function initProducts() {
    try {
      const categoryId = getQueryParam('categoryId');
      let products = await api.getProducts();
      if (categoryId) {
        products = products.filter(p => String(p.categoryId) === String(categoryId));
      }
      ui.renderProducts(products);

      const searchInput = ui.q('#searchInput');
      if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
          const query = e.target.value;
          const filtered = ui.searchProducts(products, query);
          ui.renderProducts(filtered);
        }, 300));
      }

      const container = ui.q('#productsContainer');
      if (container) {
        container.addEventListener('click', async (e) => {
          const cartBtn = e.target.closest('.btn-cart');
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

      const addToCartBtn = ui.q('#addToCartBtn');
      if (addToCartBtn) {
        addToCartBtn.addEventListener('click', async () => {
          if (!product.available) {
            ui.notify('المنتج غير متوفر');
            return;
          }
          addToCartBtn.disabled = true;
          addToCartBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> جاري الإضافة...';
          const cartItem = {
            id: product.id,
            name: product.name,
            price: product.price,
            mainImageUrl: product.mainImageUrl
          };
          cart.add(cartItem);
          setTimeout(() => {
            addToCartBtn.disabled = false;
            addToCartBtn.innerHTML = '<i class="fas fa-cart-plus me-1"></i> إضافة للسلة';
          }, 800);
        });
      }
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

      const clearCartBtn = ui.q('#clearCartBtn');
      if (clearCartBtn) {
        clearCartBtn.addEventListener('click', () => {
          cart.clear();
          initCart();
        });
      }

      const checkoutForm = ui.q('#checkoutForm');
      if (checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const name = ui.q('#nameInput').value.trim();
          const mobile = ui.q('#mobileInput').value.trim();
          const address = ui.q('#addressInput').value.trim();
          const notes = ui.q('#notesInput').value.trim();
          if (!name || !mobile || !address) {
            ui.notify('يرجى ملء جميع الحقول الإلزامية');
            return;
          }
          const total = cartProducts.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 1), 0);
          let message = `*طلب جديد من روى!*\n\n*المنتجات:*\n`;
          cartProducts.forEach((p, index) => {
            message += `${index + 1}) عدد (${p.quantity || 1}) ${p.name} - ${ui.formatPrice((p.price || 0) * (p.quantity || 1))}\n`;
          });
          message += `\n*الإجمالي:* ${ui.formatPrice(total)}\n\n`;
          message += `*بيانات العميل:*\n`;
          message += `*الاسم:* ${name}\n`;
          message += `*الموبايل:* ${mobile}\n`;
          message += `*العنوان:* ${address}\n`;
          message += `*ملاحظات:* ${notes || 'لا يوجد'}`;
          const whatsappUrl = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(message)}`;
          window.open(whatsappUrl, '_blank');
          cart.clear();
          initCart();
          ui.notify('تم إرسال الطلب عبر واتساب!');
        });
      }
    } catch (err) {
      console.error('Error initializing cart:', err);
      ui.notify('خطأ في تحميل السلة، حاول مرة أخرى');
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
      }
    } catch (err) {
      console.error('Bootstrap error:', err);
      ui.notify('حدث خطأ، برجاء إعادة المحاولة');
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();