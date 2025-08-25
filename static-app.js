(function () {
  const api = {
    async loadJson(path) {
      try {
        const response = await fetch(path, { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load ' + path);
        return response.json();
      } catch (err) {
        console.error(err);
        ui.notify('خطأ في تحميل البيانات، حاول مرة أخرى');
        throw err;
      }
    },
    async getCategories() {
      return this.loadJson('/categories.json');
    },
    async getProducts() {
      return this.loadJson('/products.json');
    },
    async getProductById(id) {
      const products = await this.getProducts();
      return products.find(p => String(p.id) === String(id));
    }
  };

  const ui = {
    q(selector, root = document) { return root.querySelector(selector); },
    qa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); },
    formatPrice(value) { return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(value); },
    renderCategories(categories) {
      const container = this.q('#categoriesContainer');
      if (!container) return;
      container.innerHTML = categories.map(c => `
        <div class="col-md-4 mb-4">
          <div class="category-card">
            <img src="${c.imageUrl}" class="card-img-top" alt="${c.name}">
            <div class="card-body">
              <h5>${c.name}</h5>
              <p class="text-muted">اكتشف مجموعة ${c.name} المميزة</p>
              <a href="products.html?categoryId=${c.id}" class="btn btn-primary">استعرض المنتجات</a>
            </div>
          </div>
        </div>
      `).join('');
    },
    renderProducts(products, containerId = 'productsContainer') {
      const container = this.q(`#${containerId}`);
      if (!container) return;
      container.innerHTML = products.map(p => `
        <div class="col-md-4 mb-4">
          <div class="product-card">
            <img src="${p.mainImageUrl}" class="card-img-top" alt="${p.name}">
            <div class="card-body">
              <h5>${p.name}</h5>
              <p>${this.formatPrice(p.price)}</p>
              <button class="btn btn-cart" data-id="${p.id}" data-name="${p.name}">إضافة للسلة</button>
              <a href="product.html?id=${p.id}" class="btn btn-details">عرض التفاصيل</a>
            </div>
          </div>
        </div>
      `).join('');
    },
    renderProductDetails(product) {
      const mainImage = this.q('#mainImage');
      if (!mainImage || !product) {
        ui.notify('المنتج غير موجود');
        return;
      }
      mainImage.src = product.mainImageUrl;
      this.q('#productName').textContent = product.name;
      this.q('#productPrice').textContent = this.formatPrice(product.price);
      this.q('#productDescription').textContent = product.description || 'لا يوجد وصف';
      this.q('#productColors').textContent = product.colors || '—';
      this.q('#productAvailability').textContent = product.isAvailable ? 'متوفر' : 'غير متوفر';

      const thumbs = this.q('#thumbnails');
      if (thumbs) {
        thumbs.innerHTML = '';
        [product.mainImageUrl, product.image2Url, product.image3Url].filter(Boolean).forEach(src => {
          const col = document.createElement('div');
          col.className = 'col-4';
          col.innerHTML = `<img src="${src}" class="img-fluid thumbnail" alt="صورة مصغرة">`;
          col.querySelector('img').addEventListener('click', () => mainImage.src = src);
          thumbs.appendChild(col);
        });
      }

      const cartBtn = this.q('#addToCartBtn');
      if (cartBtn) {
        cartBtn.dataset.id = product.id;
        cartBtn.dataset.name = product.name;
        cartBtn.addEventListener('click', () => {
          cartBtn.disabled = true;
          cartBtn.textContent = 'جاري الإضافة...';
          cart.add({ id: product.id, name: product.name });
          setTimeout(() => {
            cartBtn.disabled = false;
            cartBtn.textContent = 'إضافة للسلة';
          }, 800);
        });
      }
      const wa = this.q('#whatsAppLink');
      if (wa) {
        const msg = `أريد طلب ${product.name}`;
        wa.href = `https://wa.me/201050043254?text=${encodeURIComponent(msg)}`;
      }
      const tg = this.q('#telegramLink');
      if (tg) {
        const msg = `أريد طلب ${product.name}`;
        tg.href = `https://t.me/roaa_bot?text=${encodeURIComponent(msg)}`;
      }
    },
    renderCart(products) {
      const container = this.q('#cartContainer');
      const totalEl = this.q('#totalPrice');
      const buttonsContainer = this.q('#completeButtons');
      if (!container) return;
      if (products.length === 0) {
        container.innerHTML = '<p class="text-center">لا توجد منتجات في السلة</p>';
        totalEl.textContent = this.formatPrice(0);
        if (buttonsContainer) buttonsContainer.innerHTML = '';
        return;
      }
      let total = 0;
      container.innerHTML = products.map(p => {
        total += p.price * p.quantity;
        return `
          <div class="col-md-4 mb-4">
            <div class="product-card">
              <img src="${p.mainImageUrl}" class="card-img-top" alt="${p.name}">
              <div class="card-body">
                <h5>${p.name}</h5>
                <p>${this.formatPrice(p.price)}</p>
                <label>الكمية:</label>
                <input type="number" class="quantity-input" data-id="${p.id}" value="${p.quantity}" min="1">
                <button class="btn btn-danger btn-remove" data-id="${p.id}">حذف</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
      totalEl.textContent = this.formatPrice(total);
      if (buttonsContainer) {
        buttonsContainer.innerHTML = `
          <a id="completeWhatsApp" class="btn btn-complete">إتمام الطلب عبر واتساب</a>
          <a id="completeTelegram" class="btn btn-complete">إتمام الطلب عبر تليجرام</a>
        `;
      }
    },
    notify(message) {
      const note = document.createElement('div');
      note.className = 'notification';
      note.textContent = message;
      document.body.appendChild(note);
      setTimeout(() => note.remove(), 2000);
    }
  };

  const cart = {
    key: 'cart',
    getAll() {
      try {
        return JSON.parse(localStorage.getItem(this.key)) || [];
      } catch {
        return [];
      }
    },
    add(item) {
      const items = this.getAll();
      let existing = items.find(x => String(x.id) === String(item.id));
      if (existing) {
        existing.quantity += 1;
      } else {
        items.push({ id: item.id, name: item.name, quantity: 1 });
      }
      localStorage.setItem(this.key, JSON.stringify(items));
      ui.notify(`${item.name} تمت إضافته إلى السلة!`);
    },
    updateQuantity(id, quantity) {
      const items = this.getAll();
      const item = items.find(x => String(x.id) === String(id));
      if (item && quantity > 0) {
        item.quantity = parseInt(quantity);
        localStorage.setItem(this.key, JSON.stringify(items));
      }
    },
    remove(id) {
      let items = this.getAll();
      items = items.filter(x => String(x.id) !== String(id));
      localStorage.setItem(this.key, JSON.stringify(items));
      ui.notify('تم حذف المنتج من السلة!');
    },
    mapToProducts(allProducts) {
      const items = this.getAll();
      return items.map(item => {
        const p = allProducts.find(pr => String(pr.id) === String(item.id));
        return p ? { ...p, quantity: item.quantity } : null;
      }).filter(p => p);
    },
    generateOrderMessage(products) {
      return products.map(p => `عدد (${p.quantity}) ${p.name} - السعر: ${ui.formatPrice(p.price * p.quantity)}`).join('\n');
    }
  };

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  async function initHome() {
    try {
      const [categories, products] = await Promise.all([api.getCategories(), api.getProducts()]);
      ui.renderCategories(categories);
      const featuredProducts = products.slice(0, 0); // عرض أول 3 منتجات كمميزة
      ui.renderProducts(featuredProducts, 'featuredProductsContainer');
    } catch (err) {
      console.error(err);
      ui.notify('خطأ في تحميل البيانات، حاول مرة أخرى');
    }
  }

  async function initProducts() {
    try {
      const [products, categoryId] = [await api.getProducts(), getQueryParam('categoryId')];
      let filtered = products;
      if (categoryId) filtered = filtered.filter(p => String(p.categoryId) === String(categoryId));

      const searchInput = ui.q('#searchInput');
      function applySearch() {
        const q = (searchInput?.value || '').toLowerCase().trim();
        const list = q ? filtered.filter(p => p.name.toLowerCase().includes(q)) : filtered;
        ui.renderProducts(list);
      }
      if (searchInput) searchInput.addEventListener('input', applySearch);
      applySearch();
    } catch (err) {
      console.error(err);
      ui.notify('خطأ في تحميل المنتجات، حاول مرة أخرى');
    }
  }

  async function initProductDetails() {
    try {
      const id = getQueryParam('id');
      if (!id) {
        ui.notify('لم يتم تحديد المنتج');
        return;
      }
      const product = await api.getProductById(id);
      if (!product) {
        ui.notify('المنتج غير موجود');
        return;
      }
      ui.renderProductDetails(product);
    } catch (err) {
      console.error(err);
      ui.notify('خطأ في تحميل تفاصيل المنتج، حاول مرة أخرى');
    }
  }

  async function initCart() {
    try {
      const all = await api.getProducts();
      const cartProducts = cart.mapToProducts(all);
      ui.renderCart(cartProducts);

      document.addEventListener('input', (e) => {
        if (e.target.classList.contains('quantity-input')) {
          const id = e.target.dataset.id;
          const quantity = e.target.value;
          if (quantity > 0) {
            cart.updateQuantity(id, quantity);
            initCart();
          }
        }
      });

      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-remove');
        if (btn) {
          const id = btn.dataset.id;
          cart.remove(id);
          initCart();
        }
      });

      const waLink = ui.q('#completeWhatsApp');
      const tgLink = ui.q('#completeTelegram');
      if (waLink && tgLink) {
        const msg = 'طلبي:\n' + cart.generateOrderMessage(cartProducts) + '\nإجمالي: ' + ui.q('#totalPrice').textContent;
        waLink.href = `https://wa.me/201050043254?text=${encodeURIComponent(msg)}`;
        tgLink.href = `https://t.me/roaa_bot?text=${encodeURIComponent(msg)}`;
      }
    } catch (err) {
      console.error(err);
      ui.notify('خطأ في تحميل السلة، حاول مرة أخرى');
    }
  }

  function wireGlobalEvents() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-cart');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'جاري الإضافة...';
        cart.add({ id: btn.dataset.id, name: btn.dataset.name });
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = 'إضافة للسلة';
        }, 800);
      }
    });
  }

  async function boot() {
    wireGlobalEvents();
    const path = location.pathname;
    try {
      if (path.endsWith('/') || path.endsWith('/index.html') || path === '/index.html') await initHome();
      else if (path.endsWith('/products.html') || path === '/products.html') await initProducts();
      else if (path.endsWith('/product.html') || path === '/product.html') await initProductDetails();
      else if (path.endsWith('/cart.html') || path === '/cart.html') await initCart();
    } catch (err) {
      console.error(err);
      ui.notify('حدث خطأ، برجاء إعادة المحاولة');
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
