import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useCart } from '../context/CartContext.tsx';
import { useWishlist } from '../context/WishlistContext.tsx';

interface NavbarProps {
  onOpenSearch: () => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onOpenCustomerDashboard: (tab?: 'orders' | 'profile' | 'addresses' | 'wishlist' | 'notifications') => void;
  onOpenAdminDashboard: () => void;
  onSelectCategoryFilter: (categoryOrGender: string, ageGroup?: string) => void;
  currentFilter: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearch,
  onOpenAuth,
  onOpenCustomerDashboard,
  onOpenAdminDashboard,
  onSelectCategoryFilter,
  currentFilter,
}) => {
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const { itemCount, openCartDrawer } = useCart();
  const { wishlist } = useWishlist();

  const [activeMegaMenu, setActiveMegaMenu] = useState<'women' | 'men' | 'kids' | 'baby' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky-top aura-navbar">
        <div className="container-fluid px-lg-5 px-3 py-2">
          <div className="d-flex align-items-center justify-content-between">
            {/* Left: Mobile Hamburger & Desktop Navigation */}
            <div className="d-flex align-items-center gap-3">
              <button
                type="button"
                className="btn btn-link text-dark p-0 d-lg-none"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
              >
                <i className="bi bi-list fs-2"></i>
              </button>

              {/* Desktop Links with Mega Menu hover */}
              <nav className="d-none d-lg-flex align-items-center gap-1">
                <div
                  className="position-relative py-2"
                  onMouseEnter={() => setActiveMegaMenu('women')}
                  onMouseLeave={() => setActiveMegaMenu(null)}
                >
                  <button
                    className={`nav-link border-0 bg-transparent ${currentFilter === 'women' ? 'active' : ''}`}
                    onClick={() => onSelectCategoryFilter('women')}
                  >
                    Women
                  </button>

                  {/* Mega Menu Women */}
                  {activeMegaMenu === 'women' && (
                    <div
                      className="mega-menu-content position-absolute top-100 start-0 shadow-2xl"
                      style={{ width: '640px', zIndex: 1040 }}
                    >
                      <div className="row g-4">
                        <div className="col-4">
                          <h6 className="mega-menu-title">Ethnic & Couture</h6>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('women-ethnic')}>Kurtis & Tunics</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('women-ethnic')}>Pure Silk Sarees</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('women-ethnic')}>Chanderi Sets</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('women-ethnic')}>Lehengas</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('women-ethnic')}>Chikankari Edits</a>
                        </div>
                        <div className="col-4">
                          <h6 className="mega-menu-title">Contemporary Western</h6>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('women-western')}>Trench & Midi Dresses</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('women-western')}>Wide-Leg Trousers</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('women-western')}>Tailored Blazers</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('women-western')}>Linen Shirts</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('women-western')}>Silk Camisoles</a>
                        </div>
                        <div className="col-4 bg-light p-3">
                          <span className="editorial-sub text-muted d-block mb-1">THE EDITORIAL</span>
                          <h6 className="font-serif fw-bold mb-2">Festive Radiance</h6>
                          <img
                            src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80"
                            alt="Festive edit"
                            className="w-100 object-fit-cover mb-2"
                            style={{ height: '110px' }}
                          />
                          <button
                            type="button"
                            className="btn btn-dark btn-sm w-100 text-uppercase fw-semibold"
                            onClick={() => onSelectCategoryFilter('women-ethnic')}
                          >
                            Explore Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className="position-relative py-2"
                  onMouseEnter={() => setActiveMegaMenu('men')}
                  onMouseLeave={() => setActiveMegaMenu(null)}
                >
                  <button
                    className={`nav-link border-0 bg-transparent ${currentFilter === 'men' ? 'active' : ''}`}
                    onClick={() => onSelectCategoryFilter('men')}
                  >
                    Men
                  </button>

                  {/* Mega Menu Men */}
                  {activeMegaMenu === 'men' && (
                    <div
                      className="mega-menu-content position-absolute top-100 start-0 shadow-2xl"
                      style={{ width: '640px', zIndex: 1040 }}
                    >
                      <div className="row g-4">
                        <div className="col-4">
                          <h6 className="mega-menu-title">Streetwear & Modern</h6>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('men-streetwear')}>280 GSM Oversized Tees</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('men-streetwear')}>Parachute Cargos</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('men-streetwear')}>Drop Shoulder Hoodies</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('men-streetwear')}>Raw Selvedge Denim</a>
                        </div>
                        <div className="col-4">
                          <h6 className="mega-menu-title">Tailored & Handloom</h6>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('men-tailored')}>60 Lea Linen Shirts</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('men-tailored')}>Bandhgala Jackets</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('men-tailored')}>Mandarin Kurtas</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('men-tailored')}>Formal Trousers</a>
                        </div>
                        <div className="col-4 bg-light p-3">
                          <span className="editorial-sub text-muted d-block mb-1">STREET EDIT</span>
                          <h6 className="font-serif fw-bold mb-2">The Heavyweight Series</h6>
                          <img
                            src="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80"
                            alt="Men Street"
                            className="w-100 object-fit-cover mb-2"
                            style={{ height: '110px' }}
                          />
                          <button
                            type="button"
                            className="btn btn-dark btn-sm w-100 text-uppercase fw-semibold"
                            onClick={() => onSelectCategoryFilter('men-streetwear')}
                          >
                            Shop Streetwear
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className="position-relative py-2"
                  onMouseEnter={() => setActiveMegaMenu('kids')}
                  onMouseLeave={() => setActiveMegaMenu(null)}
                >
                  <button
                    className={`nav-link border-0 bg-transparent ${currentFilter === 'kids' ? 'active' : ''}`}
                    onClick={() => onSelectCategoryFilter('kids', 'kids')}
                  >
                    Kids
                  </button>

                  {/* Mega Menu Kids */}
                  {activeMegaMenu === 'kids' && (
                    <div
                      className="mega-menu-content position-absolute top-100 start-0 shadow-2xl"
                      style={{ width: '560px', zIndex: 1040 }}
                    >
                      <div className="row g-4">
                        <div className="col-6">
                          <h6 className="mega-menu-title">Boys & Girls (3-14Y)</h6>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('kids-wear', 'kids')}>Organic Cotton Kurtas</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('kids-wear', 'kids')}>Smocked Frocks & Dresses</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('kids-wear', 'kids')}>Everyday Play Sets</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('kids-wear', 'kids')}>Denim Shorts & Tees</a>
                        </div>
                        <div className="col-6 bg-light p-3">
                          <span className="editorial-sub text-muted d-block mb-1">CONSCIOUS PLAY</span>
                          <h6 className="font-serif fw-bold mb-2">100% Herbal Dyes</h6>
                          <p className="small text-muted mb-2">Gentle on delicate skin with zero scratchy seams.</p>
                          <button
                            type="button"
                            className="btn btn-dark btn-sm w-100 text-uppercase fw-semibold"
                            onClick={() => onSelectCategoryFilter('kids-wear', 'kids')}
                          >
                            Explore Kids
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className="position-relative py-2"
                  onMouseEnter={() => setActiveMegaMenu('baby')}
                  onMouseLeave={() => setActiveMegaMenu(null)}
                >
                  <button
                    className={`nav-link border-0 bg-transparent ${currentFilter === 'baby' ? 'active' : ''}`}
                    onClick={() => onSelectCategoryFilter('baby', 'baby')}
                  >
                    Baby
                  </button>

                  {/* Mega Menu Baby */}
                  {activeMegaMenu === 'baby' && (
                    <div
                      className="mega-menu-content position-absolute top-100 start-0 shadow-2xl"
                      style={{ width: '560px', zIndex: 1040 }}
                    >
                      <div className="row g-4">
                        <div className="col-6">
                          <h6 className="mega-menu-title">Newborn & Infant Studio (0-3Y)</h6>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('baby-studio', 'baby')}>Two-Way Zip Bamboo Rompers</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('baby-studio', 'baby')}>Kimono Wrap Bodysuits</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('baby-studio', 'baby')}>Organic Muslin Sleepwear</a>
                          <a href="#shop" className="mega-menu-link" onClick={() => onSelectCategoryFilter('baby-studio', 'baby')}>Newborn Gift Sets</a>
                        </div>
                        <div className="col-6 bg-light p-3">
                          <span className="editorial-sub text-muted d-block mb-1">CERTIFIED BAMBOO</span>
                          <h6 className="font-serif fw-bold mb-2">Thermo-Regulating</h6>
                          <p className="small text-muted mb-2">Prevents heat rashes in tropical Indian climates.</p>
                          <button
                            type="button"
                            className="btn btn-dark btn-sm w-100 text-uppercase fw-semibold"
                            onClick={() => onSelectCategoryFilter('baby-studio', 'baby')}
                          >
                            Shop Baby Essentials
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className={`nav-link border-0 bg-transparent ${currentFilter === 'teen-trends' ? 'active' : ''}`}
                  onClick={() => onSelectCategoryFilter('teen-trends')}
                >
                  Teen / Gen-Z
                </button>
                <button
                  className={`nav-link border-0 bg-transparent text-danger`}
                  onClick={() => onSelectCategoryFilter('all')}
                >
                  Sale
                </button>
              </nav>
            </div>

            {/* Center: Luxury Fashion Brand Logo */}
            <div className="text-center">
              <a
                href="#"
                className="brand-logo text-decoration-none d-flex flex-column align-items-center"
                onClick={(e) => {
                  e.preventDefault();
                  onSelectCategoryFilter('all');
                }}
              >
                <span className="text-gradient-rainbow fw-bold" style={{ letterSpacing: '0.22em' }}>
                  RANGREZA INDIA
                </span>
                <span className="text-muted fw-bold" style={{ fontSize: '0.58rem', letterSpacing: '0.45em', marginTop: '-3px' }}>
                  LUXURY ATELIER
                </span>
              </a>
            </div>

            {/* Right: Actions (Search, Wishlist, Account, Cart) */}
            <div className="d-flex align-items-center gap-3">
              {/* Search */}
              <button
                type="button"
                className="btn btn-link text-dark p-0"
                onClick={onOpenSearch}
                aria-label="Search"
                title="Search collection"
              >
                <i className="bi bi-search fs-5"></i>
              </button>

              {/* Wishlist */}
              <button
                type="button"
                className="btn btn-link text-dark p-0 position-relative"
                onClick={() => {
                  if (!isLoggedIn) onOpenAuth('login');
                  else onOpenCustomerDashboard('wishlist');
                }}
                aria-label="Wishlist"
                title="Wishlist"
              >
                <i className="bi bi-heart fs-5"></i>
                {wishlist.length > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark" style={{ fontSize: '0.62rem' }}>
                    {wishlist.length}
                  </span>
                )}
              </button>

              {/* Account Dropdown */}
              <div className="dropdown">
                <button
                  className="btn btn-link text-dark p-0 dropdown-toggle no-caret"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  aria-label="User Account"
                >
                  <i className="bi bi-person fs-5"></i>
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-0 p-2 mt-2" style={{ minWidth: '220px' }}>
                  {isLoggedIn ? (
                    <>
                      <li className="px-3 py-2 border-bottom mb-1">
                        <span className="small text-muted d-block text-uppercase" style={{ fontSize: '0.65rem' }}>SIGNED IN AS</span>
                        <strong className="d-block text-truncate text-dark">{user?.fullName}</strong>
                        <span className="small text-muted text-truncate d-block">{user?.phone}</span>
                      </li>
                      <li>
                        <button
                          className="dropdown-item py-2 small fw-semibold"
                          onClick={() => onOpenCustomerDashboard('orders')}
                        >
                          <i className="bi bi-box-seam me-2"></i> My Orders
                        </button>
                      </li>
                      <li>
                        <button
                          className="dropdown-item py-2 small fw-semibold"
                          onClick={() => onOpenCustomerDashboard('profile')}
                        >
                          <i className="bi bi-person me-2"></i> Account Profile
                        </button>
                      </li>
                      <li>
                        <button
                          className="dropdown-item py-2 small fw-semibold"
                          onClick={() => onOpenCustomerDashboard('addresses')}
                        >
                          <i className="bi bi-geo-alt me-2"></i> Saved Addresses
                        </button>
                      </li>
                      <li>
                        <button
                          className="dropdown-item py-2 small fw-semibold"
                          onClick={() => onOpenCustomerDashboard('notifications')}
                        >
                          <i className="bi bi-bell me-2"></i> Notifications
                        </button>
                      </li>
                      {isAdmin && (
                        <>
                          <li><hr className="dropdown-divider" /></li>
                          <li>
                            <button
                              className="dropdown-item py-2 small fw-bold text-primary"
                              onClick={onOpenAdminDashboard}
                            >
                              <i className="bi bi-shield-lock me-2"></i> Admin Command Center
                            </button>
                          </li>
                        </>
                      )}
                      <li><hr className="dropdown-divider" /></li>
                      <li>
                        <button
                          className="dropdown-item py-2 small fw-semibold text-danger"
                          onClick={logout}
                        >
                          <i className="bi bi-box-arrow-right me-2"></i> Logout
                        </button>
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="p-2">
                        <button
                          type="button"
                          className="btn btn-fancy-vibrant w-100 py-2 small text-uppercase"
                          onClick={() => onOpenAuth('login')}
                        >
                          Sign In
                        </button>
                      </li>
                      <li className="p-2 pt-0">
                        <button
                          type="button"
                          className="btn btn-outline-dark btn-sm w-100 py-2 small text-uppercase"
                          onClick={() => onOpenAuth('signup')}
                        >
                          Create Account
                        </button>
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* Shopping Bag Icon with Live Badge Counter */}
              <button
                type="button"
                className="btn btn-link text-dark p-0 position-relative"
                onClick={openCartDrawer}
                aria-label="Shopping Bag"
                title="View bag"
              >
                <i className="bi bi-bag fs-5"></i>
                {itemCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark" style={{ fontSize: '0.62rem' }}>
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Offcanvas Menu */}
      {mobileMenuOpen && (
        <>
          <div
            className="modal-backdrop fade show d-lg-none"
            style={{ zIndex: 1040 }}
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div
            className="offcanvas offcanvas-start show d-lg-none shadow-2xl"
            tabIndex={-1}
            style={{ zIndex: 1045, width: '320px', visibility: 'visible' }}
          >
            <div className="offcanvas-header border-bottom py-3 bg-light">
              <span className="brand-logo text-gradient-rainbow" style={{ fontSize: '1.2rem', letterSpacing: '0.18em' }}>
                RANGREZA INDIA
              </span>
              <button
                type="button"
                className="btn-close"
                onClick={() => setMobileMenuOpen(false)}
              ></button>
            </div>
            <div className="offcanvas-body p-4 d-flex flex-column justify-content-between">
              <div className="d-flex flex-column gap-3">
                <span className="editorial-sub text-muted">COLLECTIONS</span>
                <button
                  type="button"
                  className="btn btn-link text-start text-dark p-0 text-uppercase fw-bold text-decoration-none"
                  onClick={() => {
                    onSelectCategoryFilter('all');
                    setMobileMenuOpen(false);
                  }}
                >
                  All Collections
                </button>
                <button
                  type="button"
                  className="btn btn-link text-start text-dark p-0 text-uppercase fw-bold text-decoration-none"
                  onClick={() => {
                    onSelectCategoryFilter('women');
                    setMobileMenuOpen(false);
                  }}
                >
                  Women (Ethnic & Modern)
                </button>
                <button
                  type="button"
                  className="btn btn-link text-start text-dark p-0 text-uppercase fw-bold text-decoration-none"
                  onClick={() => {
                    onSelectCategoryFilter('men');
                    setMobileMenuOpen(false);
                  }}
                >
                  Men (Streetwear & Handloom)
                </button>
                <button
                  type="button"
                  className="btn btn-link text-start text-dark p-0 text-uppercase fw-bold text-decoration-none"
                  onClick={() => {
                    onSelectCategoryFilter('kids', 'kids');
                    setMobileMenuOpen(false);
                  }}
                >
                  Kids Wear (3-14Y)
                </button>
                <button
                  type="button"
                  className="btn btn-link text-start text-dark p-0 text-uppercase fw-bold text-decoration-none"
                  onClick={() => {
                    onSelectCategoryFilter('baby', 'baby');
                    setMobileMenuOpen(false);
                  }}
                >
                  Baby Organic Studio (0-3Y)
                </button>
                <button
                  type="button"
                  className="btn btn-link text-start text-dark p-0 text-uppercase fw-bold text-decoration-none"
                  onClick={() => {
                    onSelectCategoryFilter('teen-trends');
                    setMobileMenuOpen(false);
                  }}
                >
                  Gen-Z / Teen Vibe
                </button>
              </div>

              {/* Mobile Account Section */}
              <div className="border-top pt-4">
                {isLoggedIn ? (
                  <div>
                    <span className="small text-muted d-block mb-1">Welcome back,</span>
                    <strong className="d-block mb-3">{user?.fullName}</strong>
                    <div className="d-flex flex-column gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-dark btn-sm text-uppercase fw-semibold"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onOpenCustomerDashboard('orders');
                        }}
                      >
                        My Orders
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          className="btn btn-dark btn-sm text-uppercase fw-semibold"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            onOpenAdminDashboard();
                          }}
                        >
                          Admin Command Center
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-link text-danger btn-sm text-start p-0 mt-2 text-decoration-none"
                        onClick={logout}
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    <button
                      type="button"
                      className="btn-aura-primary w-100 py-2"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenAuth('login');
                      }}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-dark w-100 py-2 small text-uppercase"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenAuth('signup');
                      }}
                    >
                      Create Account
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
