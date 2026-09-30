/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { CartProvider, useCart } from './context/CartContext.tsx';
import { WishlistProvider } from './context/WishlistContext.tsx';
import { PromoBar } from './components/PromoBar.tsx';
import { Navbar } from './components/Navbar.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductDetailModal } from './components/ProductDetailModal.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { CustomerDashboard } from './components/CustomerDashboard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { SearchModal } from './components/SearchModal.tsx';
import { EditorialLookbook } from './components/EditorialLookbook.tsx';
import { FilterSidebar, FilterState } from './components/FilterSidebar.tsx';
import { apiRequest } from './lib/api.ts';
import { Product, Category, ProductVariant, Order } from './server/types.ts';

function MainApp() {
  const { isLoggedIn, isAdmin } = useAuth();
  const { toastMessage, clearToast } = useCart();

  // Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    gender: 'all',
    ageGroup: 'all',
    category: 'all',
    collection: 'all',
    minPrice: 0,
    maxPrice: 10000,
    size: '',
    color: '',
    sort: 'popular',
    inStockOnly: false,
  });

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Modals & Panels State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeVariant, setActiveVariant] = useState<ProductVariant | undefined>(undefined);
  const [showProductModal, setShowProductModal] = useState(false);

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [directBuyItem, setDirectBuyItem] = useState<{ variantId: string; quantity: number } | null>(null);

  const [showCustomerDashboard, setShowCustomerDashboard] = useState(false);
  const [customerDashboardTab, setCustomerDashboardTab] = useState<'orders' | 'profile' | 'addresses' | 'wishlist' | 'notifications'>('orders');

  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  // Load Categories & Products
  const fetchCatalog = async () => {
    setLoadingProducts(true);
    try {
      const cats = await apiRequest<Category[]>('/api/categories');
      setCategories(cats || []);

      const queryParams = new URLSearchParams();
      if (filters.gender !== 'all') queryParams.append('gender', filters.gender);
      if (filters.ageGroup !== 'all') queryParams.append('ageGroup', filters.ageGroup);
      if (filters.category !== 'all') queryParams.append('category', filters.category);
      if (filters.collection !== 'all') queryParams.append('collection', filters.collection);
      if (filters.minPrice > 0) queryParams.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice < 10000) queryParams.append('maxPrice', filters.maxPrice.toString());
      if (filters.size) queryParams.append('size', filters.size);
      if (filters.color) queryParams.append('color', filters.color);
      if (filters.sort) queryParams.append('sort', filters.sort);

      const res = await apiRequest<{ products: Product[] }>(`/api/products?${queryParams.toString()}`);
      setProducts(res.products || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [filters]);

  // Global custom event listeners for modular cross-component triggering
  useEffect(() => {
    const handleOpenAuth = () => {
      setAuthMode('login');
      setShowAuthModal(true);
    };

    const handleOpenDashboard = (e: any) => {
      setCustomerDashboardTab(e.detail?.tab || 'orders');
      setShowCustomerDashboard(true);
    };

    window.addEventListener('open-auth-modal', handleOpenAuth);
    window.addEventListener('open-customer-dashboard', handleOpenDashboard);

    return () => {
      window.removeEventListener('open-auth-modal', handleOpenAuth);
      window.removeEventListener('open-customer-dashboard', handleOpenDashboard);
    };
  }, []);

  const handleQuickView = (product: Product, defaultVariant?: ProductVariant) => {
    setSelectedProduct(product);
    setActiveVariant(defaultVariant);
    setShowProductModal(true);
  };

  const handleBuyNow = (variantId: string, quantity: number) => {
    setShowProductModal(false);
    setDirectBuyItem({ variantId, quantity });
    setShowCheckoutModal(true);
  };

  const handleFilterReset = () => {
    setFilters({
      gender: 'all',
      ageGroup: 'all',
      category: 'all',
      collection: 'all',
      minPrice: 0,
      maxPrice: 10000,
      size: '',
      color: '',
      sort: 'popular',
      inStockOnly: false,
    });
  };

  const handleCategoryPillClick = (catOrGender: string, ageGroup?: string) => {
    if (catOrGender === 'women' || catOrGender === 'men') {
      setFilters((prev) => ({ ...prev, gender: catOrGender, ageGroup: 'all', category: 'all' }));
    } else if (catOrGender === 'kids') {
      setFilters((prev) => ({ ...prev, gender: 'kids', ageGroup: 'kids', category: 'all' }));
    } else if (catOrGender === 'baby') {
      setFilters((prev) => ({ ...prev, gender: 'baby', ageGroup: 'baby', category: 'all' }));
    } else if (catOrGender === 'all') {
      handleFilterReset();
    } else {
      setFilters((prev) => ({ ...prev, category: catOrGender, ageGroup: ageGroup || 'all' }));
    }

    const shopAnchor = document.getElementById('shop-catalog');
    if (shopAnchor) {
      shopAnchor.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      {/* 1. TOP PROMOTIONAL ANNOUNCEMENT BAR */}
      <PromoBar />

      {/* 2. BOOTSTRAP NAVBAR WITH MEGA MENU */}
      <Navbar
        onOpenSearch={() => setShowSearchModal(true)}
        onOpenAuth={(mode = 'login') => {
          setAuthMode(mode);
          setShowAuthModal(true);
        }}
        onOpenCustomerDashboard={(tab = 'orders') => {
          setCustomerDashboardTab(tab);
          setShowCustomerDashboard(true);
        }}
        onOpenAdminDashboard={() => setShowAdminDashboard(true)}
        onSelectCategoryFilter={handleCategoryPillClick}
        currentFilter={filters.gender !== 'all' ? filters.gender : filters.category}
      />

      {/* 3. HERO SECTION */}
      <section className="position-relative overflow-hidden bg-black text-white" style={{ minHeight: '86vh' }}>
        <img
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2000&q=85"
          alt="AURA INDIA Luxury Indian Fashion Runway"
          className="position-absolute top-0 start-0 w-100 h-100 object-fit-cover opacity-60 transition duration-1000 ease-out hover:scale-105"
        />

        {/* Colorful gradient atmospheric mesh */}
        <div className="position-absolute top-0 start-0 w-100 h-100 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
        <div
          className="position-absolute rounded-circle animate-glow-orb pointer-events-none"
          style={{
            width: '450px',
            height: '450px',
            top: '5%',
            right: '-10%',
            background: 'radial-gradient(circle, rgba(236,72,153,0.3) 0%, rgba(139,92,246,0) 70%)',
          }}
        />
        <div
          className="position-absolute rounded-circle animate-glow-orb pointer-events-none"
          style={{
            width: '500px',
            height: '500px',
            bottom: '-10%',
            left: '-10%',
            background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, rgba(6,182,212,0) 70%)',
          }}
        />

        <div className="container-fluid px-lg-5 px-4 position-relative h-100 d-flex flex-column justify-content-center" style={{ minHeight: '86vh' }}>
          <div className="max-w-3xl py-5 position-relative z-1">
            <span className="badge rounded-pill bg-gradient-rainbow text-white text-uppercase px-3 py-2 mb-3 letter-spacing-2 fw-bold shadow-lg animate-float" style={{ fontSize: '0.75rem' }}>
              ✨ AUTUMN / WINTER 2026 RUNWAY DROP ✨
            </span>

            <h1 className="display-2 font-serif fw-bold text-white mb-3 text-uppercase letter-spacing-1">
              THE ART OF
              <br />
              <span className="text-gradient-rainbow">INDIAN COUTURE.</span>
            </h1>

            <p className="lead text-light mb-4 font-sans opacity-95 fs-5" style={{ maxWidth: '640px' }}>
              Welcome to <strong className="text-white">AURA INDIA</strong> — where vibrant heritage dyes meet sharp contemporary silhouettes. Curated for Women, Men, Kids, Teens, and Newborns.
            </p>

            {/* Quick Action Navigation CTAs with Vibrant Animations */}
            <div className="d-flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                className="btn btn-fancy-vibrant rounded-pill px-4 py-3 text-uppercase fw-bold letter-spacing-1 shadow-lg"
                onClick={() => handleCategoryPillClick('women')}
              >
                SHOP WOMEN'S RUNWAY
              </button>
              <button
                type="button"
                className="btn btn-outline-light rounded-pill px-4 py-3 text-uppercase fw-bold letter-spacing-1"
                onClick={() => handleCategoryPillClick('men')}
              >
                SHOP MEN'S STREETWEAR
              </button>
              <button
                type="button"
                className="btn btn-outline-light rounded-pill px-4 py-3 text-uppercase fw-bold letter-spacing-1"
                onClick={() => handleCategoryPillClick('kids')}
              >
                KIDS (3-14Y)
              </button>
              <button
                type="button"
                className="btn btn-outline-light rounded-pill px-4 py-3 text-uppercase fw-bold letter-spacing-1"
                onClick={() => handleCategoryPillClick('baby')}
              >
                BABY BAMBOO STUDIO
              </button>
            </div>
          </div>

          {/* Subtle Scroll Indicator */}
          <div className="position-absolute bottom-0 start-50 translate-middle-x mb-4 text-center text-white-50 small">
            <span className="d-block text-uppercase letter-spacing-2" style={{ fontSize: '0.65rem' }}>
              EXPLORE CURATIONS
            </span>
            <i className="bi bi-chevron-down animate-bounce fs-6"></i>
          </div>
        </div>
      </section>

      {/* 4. WHAT'S TRENDING SECTION */}
      <section className="py-5 bg-white border-bottom">
        <div className="container-fluid px-lg-5 px-3">
          <div className="d-flex flex-wrap justify-content-between align-items-end mb-4">
            <div>
              <span className="editorial-sub text-muted">AURA INDIA ARTISANAL PALETTES</span>
              <h2 className="font-serif h2 fw-bold text-dark mb-0">WHAT'S TRENDING IN COLOR</h2>
            </div>
            <button
              type="button"
              className="btn btn-link text-dark text-uppercase small fw-bold text-decoration-none p-0"
              onClick={handleFilterReset}
            >
              View Full Index <i className="bi bi-arrow-right ms-1"></i>
            </button>
          </div>

          <div className="row g-3">
            {[
              {
                title: 'Oversized Streetwear',
                sub: '280 GSM Heavyweight Cotton',
                img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
                action: () => setFilters((p) => ({ ...p, collection: 'streetwear', category: 'all' })),
              },
              {
                title: 'Chanderi Silk Couture',
                sub: 'Zari Weaves & Organza Duppatas',
                img: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
                action: () => setFilters((p) => ({ ...p, category: 'cat_women_ethnic', collection: 'all' })),
              },
              {
                title: 'Summer Linen Capsule',
                sub: '60 Lea Pure European Flax',
                img: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=600&q=80',
                action: () => setFilters((p) => ({ ...p, collection: 'summer_edit', category: 'all' })),
              },
              {
                title: 'Bamboo Baby Studio',
                sub: 'Dual-Zip Thermo-Regulating Rompers',
                img: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=600&q=80',
                action: () => setFilters((p) => ({ ...p, category: 'cat_baby', gender: 'baby', ageGroup: 'baby' })),
              },
            ].map((trend, i) => (
              <div key={i} className="col-6 col-lg-3">
                <div
                  className="card border-0 rounded-0 overflow-hidden cursor-pointer group shadow-none"
                  onClick={trend.action}
                >
                  <div className="ratio ratio-1x1 overflow-hidden bg-light position-relative">
                    <img
                      src={trend.img}
                      alt={trend.title}
                      className="w-100 h-100 object-fit-cover transition duration-700 ease-in-out group-hover:scale-105"
                    />
                    <div className="position-absolute bottom-0 start-0 w-100 p-3 bg-gradient-to-t from-black/80 to-transparent text-white">
                      <span className="small text-uppercase opacity-75 d-block" style={{ fontSize: '0.65rem' }}>
                        {trend.sub}
                      </span>
                      <h6 className="font-serif fw-bold mb-1">{trend.title}</h6>
                      <span className="text-white small fw-semibold text-uppercase" style={{ fontSize: '0.7rem' }}>
                        Explore Trend →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. MAIN PRODUCT CATALOG (JUST DROPPED) */}
      <section id="shop-catalog" className="py-5">
        <div className="container-fluid px-lg-5 px-3">
          {/* Section Header */}
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom">
            <div>
              <span className="editorial-sub text-muted">THE RUNWAY COLLECTION</span>
              <h2 className="font-serif display-6 fw-bold text-dark mb-0">JUST DROPPED</h2>
            </div>

            <div className="d-flex align-items-center gap-3 mt-3 mt-md-0">
              {/* Mobile Filter Button */}
              <button
                type="button"
                className="btn btn-outline-dark btn-sm d-lg-none text-uppercase fw-semibold"
                onClick={() => setMobileFilterOpen(true)}
              >
                <i className="bi bi-funnel me-1"></i> Filter & Refine
              </button>

              {/* Sort Dropdown */}
              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted text-uppercase d-none d-sm-inline">Sort by:</span>
                <select
                  className="form-select form-select-sm border-dark rounded-0 fw-semibold"
                  style={{ minWidth: '170px' }}
                  value={filters.sort}
                  onChange={(e) => setFilters((p) => ({ ...p, sort: e.target.value }))}
                >
                  <option value="popular">Most Popular</option>
                  <option value="newest">Newest Drops</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="discount">Biggest Discount</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Badges */}
          {(filters.gender !== 'all' ||
            filters.category !== 'all' ||
            filters.size ||
            filters.color ||
            filters.collection !== 'all') && (
            <div className="d-flex flex-wrap align-items-center gap-2 mb-4 p-2 bg-white border">
              <span className="small text-muted text-uppercase fw-semibold me-1" style={{ fontSize: '0.72rem' }}>
                Active Filters:
              </span>
              {filters.gender !== 'all' && (
                <span className="badge bg-dark small">
                  Gender: {filters.gender.toUpperCase()}
                  <i className="bi bi-x ms-1 cursor-pointer" onClick={() => setFilters((p) => ({ ...p, gender: 'all' }))}></i>
                </span>
              )}
              {filters.category !== 'all' && (
                <span className="badge bg-dark small">
                  Category: {filters.category}
                  <i className="bi bi-x ms-1 cursor-pointer" onClick={() => setFilters((p) => ({ ...p, category: 'all' }))}></i>
                </span>
              )}
              {filters.size && (
                <span className="badge bg-dark small">
                  Size: {filters.size}
                  <i className="bi bi-x ms-1 cursor-pointer" onClick={() => setFilters((p) => ({ ...p, size: '' }))}></i>
                </span>
              )}
              {filters.color && (
                <span className="badge bg-dark small">
                  Color: {filters.color}
                  <i className="bi bi-x ms-1 cursor-pointer" onClick={() => setFilters((p) => ({ ...p, color: '' }))}></i>
                </span>
              )}
              {filters.collection !== 'all' && (
                <span className="badge bg-dark small">
                  Edit: {filters.collection}
                  <i className="bi bi-x ms-1 cursor-pointer" onClick={() => setFilters((p) => ({ ...p, collection: 'all' }))}></i>
                </span>
              )}
              <button
                type="button"
                className="btn btn-link p-0 text-danger small ms-auto text-decoration-none"
                onClick={handleFilterReset}
              >
                Clear All
              </button>
            </div>
          )}

          {/* Catalog Layout: Left Sidebar + Right Products Grid */}
          <div className="row g-4">
            {/* Desktop Filter Sidebar */}
            <div className="col-lg-3 d-none d-lg-block">
              <div className="card p-3 border bg-white shadow-none">
                <FilterSidebar
                  filters={filters}
                  categories={categories}
                  onChange={(f) => setFilters(f)}
                  onReset={handleFilterReset}
                />
              </div>
            </div>

            {/* Mobile Filter Offcanvas Drawer */}
            <FilterSidebar
              filters={filters}
              categories={categories}
              onChange={(f) => setFilters(f)}
              onReset={handleFilterReset}
              isMobileDrawer={true}
              onCloseMobileDrawer={() => setMobileFilterOpen(false)}
            />

            {/* Products Grid */}
            <div className="col-lg-9">
              {loadingProducts ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-dark mb-2" role="status"></div>
                  <p className="small text-muted text-uppercase letter-spacing-1">Curating Runway Catalog...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-5 bg-white border p-5">
                  <i className="bi bi-bag-x display-4 text-muted mb-3 d-block"></i>
                  <h4 className="font-serif fw-bold">No Products Matched Your Filter</h4>
                  <p className="text-muted small mb-4">
                    Try adjusting the price slider or resetting selected color, gender, and size filters.
                  </p>
                  <button
                    type="button"
                    className="btn btn-dark text-uppercase fw-semibold px-4 py-2"
                    onClick={handleFilterReset}
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="row g-3 g-md-4">
                    {products.map((product) => (
                      <div key={product.id} className="col-6 col-md-4">
                        <ProductCard
                          product={product}
                          onQuickView={handleQuickView}
                          onSelectProduct={handleQuickView}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Product Count Footer */}
                  <div className="text-center mt-5 pt-3 border-top">
                    <p className="small text-muted">
                      Showing <strong>{products.length}</strong> distinctive Indian contemporary garments
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 6. EDITORIAL LOOKBOOK SECTION ("SHOP THE LOOK") */}
      <EditorialLookbook onSelectProduct={handleQuickView} />

      {/* 7. BRAND PILLARS & INDIAN E-COMMERCE VALUE PROPOSITION */}
      <section className="py-5 bg-light border-top">
        <div className="container-fluid px-lg-5 px-3">
          <div className="row g-4 text-center">
            <div className="col-6 col-md-3">
              <div className="p-3">
                <i className="bi bi-box-seam fs-2 text-dark mb-2 d-block"></i>
                <h6 className="font-serif fw-bold mb-1">FREE PAN-INDIA DELIVERY</h6>
                <p className="small text-muted mb-0">
                  Complimentary BlueDart air express courier on all orders over ₹999 across all Indian PIN codes.
                </p>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="p-3">
                <i className="bi bi-arrow-repeat fs-2 text-dark mb-2 d-block"></i>
                <h6 className="font-serif fw-bold mb-1">DOORSTEP 7-DAY EXCHANGES</h6>
                <p className="small text-muted mb-0">
                  Not quite the right fit? Enjoy effortless doorstep reverse pickups with zero return processing fees.
                </p>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="p-3">
                <i className="bi bi-patch-check fs-2 text-dark mb-2 d-block"></i>
                <h6 className="font-serif fw-bold mb-1">HERITAGE TEXTILE ETHOS</h6>
                <p className="small text-muted mb-0">
                  Woven from pure Indian handlooms, certified European flax, 280 GSM cotton and GOTS organic bamboo.
                </p>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="p-3">
                <i className="bi bi-shield-lock fs-2 text-dark mb-2 d-block"></i>
                <h6 className="font-serif fw-bold mb-1">SECURE INDIAN PAYMENTS</h6>
                <p className="small text-muted mb-0">
                  Seamless UPI (GPay, PhonePe, Paytm), RuPay, Visa, Net Banking, and Cash on Delivery supported.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="bg-black text-white pt-5 pb-4 mt-auto">
        <div className="container-fluid px-lg-5 px-3">
          <div className="row g-4 pb-5 border-bottom border-dark">
            {/* Brand column */}
            <div className="col-lg-4">
              <span className="brand-logo text-gradient-rainbow d-block mb-2" style={{ fontSize: '1.4rem' }}>
                AURA INDIA
              </span>
              <p className="small text-muted mb-4" style={{ maxWidth: '340px' }}>
                A luxury contemporary fashion atelier celebrating rich Indian craftsmanship, fine textiles, and modern silhouettes for Women, Men, Kids, Teens, and Babies.
              </p>
              <div className="d-flex gap-3 text-light fs-5">
                <i className="bi bi-instagram cursor-pointer"></i>
                <i className="bi bi-facebook cursor-pointer"></i>
                <i className="bi bi-pinterest cursor-pointer"></i>
                <i className="bi bi-twitter-x cursor-pointer"></i>
              </div>
            </div>

            {/* Quick Links */}
            <div className="col-6 col-lg-2">
              <h6 className="editorial-sub text-white mb-3">COLLECTIONS</h6>
              <ul className="list-unstyled small d-flex flex-column gap-2 text-muted">
                <li><a href="#shop" className="text-muted text-decoration-none" onClick={() => handleCategoryPillClick('women')}>Women's Runway</a></li>
                <li><a href="#shop" className="text-muted text-decoration-none" onClick={() => handleCategoryPillClick('men')}>Men's Heavyweight</a></li>
                <li><a href="#shop" className="text-muted text-decoration-none" onClick={() => handleCategoryPillClick('kids', 'kids')}>Kids Wear</a></li>
                <li><a href="#shop" className="text-muted text-decoration-none" onClick={() => handleCategoryPillClick('baby', 'baby')}>Baby Bamboo Studio</a></li>
                <li><a href="#shop" className="text-muted text-decoration-none" onClick={() => handleCategoryPillClick('teen-trends')}>Gen-Z / Teen Vibe</a></li>
              </ul>
            </div>

            {/* Client Assistance */}
            <div className="col-6 col-lg-2">
              <h6 className="editorial-sub text-white mb-3">CLIENT CARE</h6>
              <ul className="list-unstyled small d-flex flex-column gap-2 text-muted">
                <li><button className="btn btn-link p-0 text-muted small text-decoration-none" onClick={() => { if (isLoggedIn) { setCustomerDashboardTab('orders'); setShowCustomerDashboard(true); } else { setAuthMode('login'); setShowAuthModal(true); } }}>Track Order</button></li>
                <li><button className="btn btn-link p-0 text-muted small text-decoration-none" onClick={() => { if (isLoggedIn) { setCustomerDashboardTab('orders'); setShowCustomerDashboard(true); } else { setAuthMode('login'); setShowAuthModal(true); } }}>Returns & Exchanges</button></li>
                <li><button className="btn btn-link p-0 text-muted small text-decoration-none" onClick={() => { if (products[0]) handleQuickView(products[0]); }}>Size Guide Advisory</button></li>
                <li><span className="text-muted">GST & Invoicing</span></li>
                <li>
                  <button
                    className="btn btn-link p-0 text-warning small text-decoration-none fw-semibold"
                    onClick={() => {
                      if (!isLoggedIn) {
                        setAuthMode('login');
                        setShowAuthModal(true);
                      } else if (isAdmin) {
                        setShowAdminDashboard(true);
                      } else {
                        alert('Admin privileges required. Please sign in as Chief Curator.');
                      }
                    }}
                  >
                    Admin Command Center
                  </button>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div className="col-lg-4">
              <h6 className="editorial-sub text-white mb-2">JOIN THE PRIVATE SALON</h6>
              <p className="small text-muted mb-3">
                Receive priority invites to our seasonal runway previews, handloom releases, and 10% off your initial order.
              </p>
              <form onSubmit={(e) => { e.preventDefault(); alert('Welcome to the AURA INDIA Fashion House private list. Use code AURA10 at checkout.'); }}>
                <div className="input-group">
                  <input
                    type="email"
                    className="form-control form-control-sm rounded-0 bg-dark text-white border-secondary"
                    placeholder="Enter your email address"
                    required
                  />
                  <button className="btn btn-fancy-vibrant btn-sm rounded-0 text-uppercase fw-bold px-3" type="submit">
                    Subscribe
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="d-flex flex-wrap justify-content-between align-items-center pt-4 small text-muted">
            <span>© 2026 AURA INDIA FASHION HOUSE PRIVATE LIMITED. ALL RIGHTS RESERVED.</span>
            <div className="d-flex gap-3">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>Security Compliance</span>
            </div>
          </div>
        </div>
      </footer>

      {/* 9. MODALS & DRAWERS */}
      <ProductDetailModal
        product={selectedProduct}
        initialVariant={activeVariant}
        show={showProductModal}
        onClose={() => setShowProductModal(false)}
        onBuyNow={handleBuyNow}
      />

      <CartDrawer
        onProceedToCheckout={() => setShowCheckoutModal(true)}
      />

      <AuthModal
        show={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />

      <SearchModal
        show={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectProduct={(p) => handleQuickView(p)}
      />

      <CheckoutModal
        show={showCheckoutModal}
        onClose={() => {
          setShowCheckoutModal(false);
          setDirectBuyItem(null);
        }}
        onOrderSuccess={(order: Order) => {
          // Open customer dashboard to orders
          setCustomerDashboardTab('orders');
        }}
        directBuyItem={directBuyItem}
      />

      <CustomerDashboard
        show={showCustomerDashboard}
        onClose={() => setShowCustomerDashboard(false)}
        initialTab={customerDashboardTab}
      />

      {isAdmin && (
        <AdminDashboard
          show={showAdminDashboard}
          onClose={() => {
            setShowAdminDashboard(false);
            fetchCatalog();
          }}
        />
      )}

      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1080 }}>
          <div className="toast show align-items-center text-white bg-dark border-0 shadow-lg" role="alert">
            <div className="d-flex">
              <div className="toast-body small fw-semibold">
                <i className="bi bi-bag-check-fill text-success me-2"></i>
                {toastMessage}
              </div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                aria-label="Close"
                onClick={clearToast}
              ></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <MainApp />
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}
