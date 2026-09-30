import React from 'react';
import { useCart } from '../context/CartContext.tsx';

interface CartDrawerProps {
  onProceedToCheckout: () => void;
  onOpenProduct?: (productId: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onProceedToCheckout }) => {
  const {
    cart,
    itemCount,
    isCartDrawerOpen,
    closeCartDrawer,
    updateQuantity,
    removeFromCart,
    loading,
  } = useCart();

  if (!isCartDrawerOpen) return null;

  const freeShippingNeeded = Math.max(0, cart.freeShippingThreshold - cart.subtotal);
  const freeShippingProgress = Math.min(100, Math.round((cart.subtotal / cart.freeShippingThreshold) * 100));

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1040 }}
        onClick={closeCartDrawer}
      ></div>

      {/* Slide-out Offcanvas */}
      <div
        className="offcanvas offcanvas-end show border-start shadow-2xl"
        tabIndex={-1}
        style={{ zIndex: 1045, width: '100%', maxWidth: '440px', visibility: 'visible' }}
      >
        {/* Header */}
        <div className="offcanvas-header border-bottom py-3 px-4 bg-light">
          <div className="d-flex align-items-center gap-2">
            <span className="brand-logo text-gradient-rainbow" style={{ fontSize: '1.05rem', letterSpacing: '0.18em' }}>
              RANGREZA INDIA
            </span>
            <span className="text-muted">|</span>
            <h5 className="offcanvas-title font-serif h6 mb-0 text-uppercase fw-bold letter-spacing-1">
              Shopping Bag ({itemCount})
            </h5>
          </div>
          <button
            type="button"
            className="btn-close text-reset"
            aria-label="Close"
            onClick={closeCartDrawer}
          ></button>
        </div>

        {/* Free Shipping Progress Indicator */}
        <div className="p-3 bg-white border-bottom">
          <div className="d-flex justify-content-between align-items-center mb-1 small">
            {freeShippingNeeded === 0 ? (
              <span className="text-success fw-bold">
                <i className="bi bi-check-circle-fill me-1"></i>You unlocked FREE Express Shipping!
              </span>
            ) : (
              <span className="text-dark fw-medium">
                Add <strong className="text-dark">₹{freeShippingNeeded.toLocaleString('en-IN')}</strong> more for FREE Shipping!
              </span>
            )}
            <span className="text-muted small">{freeShippingProgress}%</span>
          </div>
          <div className="progress" style={{ height: '6px' }}>
            <div
              className={`progress-bar ${freeShippingNeeded === 0 ? 'bg-success' : 'bg-dark'}`}
              role="progressbar"
              style={{ width: `${freeShippingProgress}%` }}
              aria-valuenow={freeShippingProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            ></div>
          </div>
        </div>

        {/* Items List */}
        <div className="offcanvas-body p-3 d-flex flex-column justify-content-between overflow-auto">
          {cart.items.length === 0 ? (
            <div className="text-center my-auto py-5">
              <i className="bi bi-bag text-muted display-1 mb-3 d-block opacity-25"></i>
              <h5 className="font-serif fw-bold text-dark">Your Bag is Empty</h5>
              <p className="text-muted small px-4 mb-4">
                Explore our new season runway arrivals, Indian handlooms, and contemporary edits.
              </p>
              <button
                type="button"
                className="btn-aura-primary px-4 py-2 text-uppercase"
                onClick={closeCartDrawer}
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {cart.items.map((item) => (
                <div key={item.variantId} className="card border p-2 shadow-none position-relative">
                  <div className="row g-2 align-items-center">
                    {/* Thumbnail */}
                    <div className="col-3">
                      <div className="ratio ratio-1x1 bg-light border">
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-100 h-100 object-fit-cover"
                        />
                      </div>
                    </div>

                    {/* Details */}
                    <div className="col-9 pe-3">
                      <div className="d-flex justify-content-between align-items-start">
                        <h6 className="small fw-bold text-dark text-truncate mb-1" style={{ maxWidth: '200px' }}>
                          {item.productName}
                        </h6>
                        <button
                          type="button"
                          className="btn btn-link p-0 text-muted"
                          title="Remove item"
                          onClick={() => removeFromCart(item.variantId)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>

                      <div className="d-flex gap-2 align-items-center mb-2 small text-muted">
                        <span>Color: <strong>{item.colorName}</strong></span>
                        <span>·</span>
                        <span>Size: <strong>{item.size}</strong></span>
                      </div>

                      {/* Price & Quantity Stepper */}
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="input-group input-group-sm" style={{ width: '95px' }}>
                          <button
                            className="btn btn-outline-secondary px-2"
                            type="button"
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            disabled={loading}
                          >
                            -
                          </button>
                          <span className="input-group-text bg-white px-2 fw-bold text-center">
                            {item.quantity}
                          </span>
                          <button
                            className="btn btn-outline-secondary px-2"
                            type="button"
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                            disabled={loading || item.quantity >= item.stockAvailable}
                          >
                            +
                          </button>
                        </div>

                        <div className="text-end">
                          <span className="fw-bold text-dark">
                            ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                          </span>
                          {item.mrpPrice > item.unitPrice && (
                            <span className="d-block small text-muted text-decoration-line-through">
                              ₹{(item.mrpPrice * item.quantity).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Order Summary & Checkout */}
        {cart.items.length > 0 && (
          <div className="offcanvas-footer p-3 bg-light border-top">
            <div className="d-flex flex-column gap-1 small mb-3">
              <div className="d-flex justify-content-between text-muted">
                <span>Subtotal (MRP)</span>
                <span>₹{cart.mrpTotal.toLocaleString('en-IN')}</span>
              </div>
              {cart.discount > 0 && (
                <div className="d-flex justify-content-between text-success fw-medium">
                  <span>Product Discount</span>
                  <span>-₹{cart.discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="d-flex justify-content-between text-muted">
                <span>Estimated Shipping</span>
                <span>
                  {cart.shippingFee === 0 ? (
                    <span className="text-success fw-bold">FREE</span>
                  ) : (
                    `₹${cart.shippingFee}`
                  )}
                </span>
              </div>
              <div className="d-flex justify-content-between text-muted">
                <span>Estimated GST (5%)</span>
                <span>₹{cart.tax.toLocaleString('en-IN')}</span>
              </div>
              <div className="d-flex justify-content-between fw-bold text-dark border-top pt-2 mt-1 h6 mb-0">
                <span>Total Amount</span>
                <span>₹{cart.grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-fancy-vibrant rounded-pill w-100 py-3 d-flex align-items-center justify-content-center text-uppercase fw-bold shadow"
              onClick={() => {
                closeCartDrawer();
                onProceedToCheckout();
              }}
            >
              <span>PROCEED TO CHECKOUT</span>
              <i className="bi bi-arrow-right-circle-fill ms-2 fs-5"></i>
            </button>
            <button
              type="button"
              className="btn btn-link w-100 text-center text-muted small mt-2 text-decoration-none"
              onClick={closeCartDrawer}
            >
              Continue Browsing
            </button>
          </div>
        )}
      </div>
    </>
  );
};
