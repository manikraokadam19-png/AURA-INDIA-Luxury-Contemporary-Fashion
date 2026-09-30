import React, { useState } from 'react';
import { Product, ProductVariant } from '../server/types.ts';
import { useCart } from '../context/CartContext.tsx';
import { useWishlist } from '../context/WishlistContext.tsx';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product, defaultVariant?: ProductVariant) => void;
  onSelectProduct?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onQuickView, onSelectProduct }) => {
  const { addToCart, loading: cartLoading } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  // Selected color index
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  // Group unique colors
  const colorMap = new Map<string, { hex: string; variant: ProductVariant }>();
  product.variants.forEach((v) => {
    if (!colorMap.has(v.colorName)) {
      colorMap.set(v.colorName, { hex: v.colorHex, variant: v });
    }
  });
  const uniqueColors = Array.from(colorMap.entries()).map(([name, data]) => ({
    name,
    hex: data.hex,
    variant: data.variant,
  }));

  const activeColor = uniqueColors[selectedColorIdx] || uniqueColors[0];
  const activeVariant = activeColor?.variant || product.variants[0];

  const primaryImg = activeVariant?.imageUrl || product.images[0];
  const hoverImg = product.images[1] || primaryImg;

  const isFavorited = isInWishlist(product.id);
  const totalStock = product.variants.reduce((acc, v) => acc + v.stockQuantity, 0);

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeVariant) return;
    setIsAdding(true);
    try {
      await addToCart(activeVariant.id, 1);
    } catch (err: any) {
      alert(err.message || 'Could not add to cart');
    } finally {
      setIsAdding(false);
    }
  };

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await toggleWishlist(product);
    if (!success) {
      alert('Please sign in to save items to your wishlist.');
    }
  };

  return (
    <div
      className="aura-product-card card-hover-lift cursor-pointer group shadow-sm rounded-3 overflow-hidden border-0"
      onClick={() => (onSelectProduct ? onSelectProduct(product) : onQuickView(product, activeVariant))}
    >
      {/* Product Image Frame */}
      <div className="product-img-wrapper position-relative">
        <img
          src={primaryImg}
          alt={product.name}
          className="product-img-primary"
          loading="lazy"
        />
        <img
          src={hoverImg}
          alt={`${product.name} back view`}
          className="product-img-hover"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="position-absolute top-0 start-0 p-2 d-flex flex-column gap-1 z-2">
          {product.discountPercent > 0 && (
            <span className="badge badge-festive rounded-pill px-2 py-1 small">{product.discountPercent}% OFF</span>
          )}
          {product.isFeatured && <span className="badge badge-vibrant-saffron rounded-pill px-2 py-1 small">✦ FEATURED</span>}
          {totalStock > 0 && totalStock <= 5 && (
            <span className="badge bg-danger rounded-pill px-2 py-1 small">ONLY {totalStock} LEFT</span>
          )}
          {totalStock === 0 && (
            <span className="badge bg-secondary text-uppercase fw-semibold px-2 py-1 small rounded-pill">OUT OF STOCK</span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          className="btn btn-white rounded-circle shadow position-absolute top-0 end-0 m-2 p-0 d-flex align-items-center justify-content-center z-3 bg-white"
          style={{ width: '38px', height: '38px' }}
          onClick={handleWishlistClick}
          aria-label="Save to wishlist"
        >
          <i
            className={`bi ${isFavorited ? 'bi-heart-fill text-danger' : 'bi-heart text-dark'}`}
            style={{ fontSize: '1.05rem' }}
          ></i>
        </button>

        {/* Hover Quick Actions on Desktop */}
        <div className="card-quick-actions d-none d-md-flex gap-2">
          <button
            type="button"
            className="btn btn-light rounded-pill flex-grow-1 py-2 text-uppercase fw-bold small shadow"
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product, activeVariant);
            }}
          >
            <i className="bi bi-eye me-1"></i> View
          </button>
          <button
            type="button"
            className="btn btn-fancy-vibrant rounded-pill flex-grow-1 py-2 text-uppercase fw-bold small shadow"
            onClick={handleQuickAdd}
            disabled={totalStock <= 0 || isAdding || cartLoading}
          >
            {isAdding ? (
              <span className="spinner-border spinner-border-sm" role="status"></span>
            ) : (
              <>
                <i className="bi bi-bag-plus-fill me-1"></i> + Bag
              </>
            )}
          </button>
        </div>
      </div>

      {/* Card Details */}
      <div className="p-3 d-flex flex-column flex-grow-1">
        {/* Category & Color Swatches */}
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span className="editorial-sub text-muted">{product.categoryName}</span>

          {/* Color Dots */}
          {uniqueColors.length > 1 && (
            <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
              {uniqueColors.map((c, i) => (
                <div
                  key={c.name}
                  className={`color-dot ${i === selectedColorIdx ? 'active' : ''}`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                  onClick={() => setSelectedColorIdx(i)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Title */}
        <h6 className="fw-semibold text-truncate mb-1 text-dark" title={product.name}>
          {product.name}
        </h6>

        {/* Rating */}
        <div className="d-flex align-items-center gap-1 mb-2 small text-warning">
          <span>★</span>
          <span className="text-dark fw-bold">{product.rating}</span>
          <span className="text-muted">({product.reviewCount})</span>
        </div>

        {/* Price Row */}
        <div className="mt-auto d-flex justify-content-between align-items-baseline pt-1 border-top">
          <div className="d-flex align-items-baseline gap-2">
            <span className="h5 fw-bold mb-0 text-dark">₹{product.basePrice.toLocaleString('en-IN')}</span>
            {product.mrpPrice > product.basePrice && (
              <span className="text-muted text-decoration-line-through small">
                ₹{product.mrpPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          <span className="badge text-success-emphasis bg-success-subtle fw-medium small">
            Save ₹{(product.mrpPrice - product.basePrice).toLocaleString('en-IN')}
          </span>
        </div>

        {/* Mobile Quick Add Button */}
        <div className="d-flex d-md-none mt-2 pt-2 gap-2">
          <button
            type="button"
            className="btn btn-outline-dark btn-sm flex-grow-1 text-uppercase fw-semibold"
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product, activeVariant);
            }}
          >
            View
          </button>
          <button
            type="button"
            className="btn btn-dark btn-sm flex-grow-1 text-uppercase fw-semibold"
            onClick={handleQuickAdd}
            disabled={totalStock <= 0 || isAdding}
          >
            {isAdding ? 'Adding...' : '+ Bag'}
          </button>
        </div>
      </div>
    </div>
  );
};
