import React, { useState, useEffect } from 'react';
import { Product, ProductVariant, Review } from '../server/types.ts';
import { useCart } from '../context/CartContext.tsx';
import { useWishlist } from '../context/WishlistContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { apiRequest } from '../lib/api.ts';
import { SizeGuideModal } from './SizeGuideModal.tsx';

interface ProductDetailModalProps {
  product: Product | null;
  initialVariant?: ProductVariant;
  show: boolean;
  onClose: () => void;
  onBuyNow: (variantId: string, quantity: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  initialVariant,
  show,
  onClose,
  onBuyNow,
}) => {
  const { addToCart, loading: cartLoading } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { isLoggedIn, user } = useAuth();

  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'fabric' | 'reviews'>('details');

  // PIN code check
  const [pinCode, setPinCode] = useState('');
  const [pinResult, setPinResult] = useState<string | null>(null);

  // Review Form
  const [newRating, setNewRating] = useState(5);
  const [newTitle, setNewTitle] = useState('');
  const [newComment, setNewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);

  // Group variants by color
  const colorMap = new Map<string, { hex: string; variants: ProductVariant[] }>();
  if (product) {
    product.variants.forEach((v) => {
      if (!colorMap.has(v.colorName)) {
        colorMap.set(v.colorName, { hex: v.colorHex, variants: [] });
      }
      colorMap.get(v.colorName)!.variants.push(v);
    });
  }
  const colorList = Array.from(colorMap.entries()).map(([name, data]) => ({
    name,
    hex: data.hex,
    variants: data.variants,
  }));

  useEffect(() => {
    if (product) {
      const defVariant = initialVariant || product.variants[0];
      setSelectedColor(defVariant ? defVariant.colorName : colorList[0]?.name || '');
      setSelectedSize(defVariant ? defVariant.size : '');
      setSelectedImage(defVariant?.imageUrl || product.images[0] || '');
      setQuantity(1);
      setPinResult(null);

      // Fetch reviews
      apiRequest(`/api/products/${product.id}`)
        .then((data) => {
          if (data.reviews) setReviews(data.reviews);
        })
        .catch(() => {});
    }
  }, [product, initialVariant]);

  if (!show || !product) return null;

  // Active color variants
  const activeColorVariants = colorList.find((c) => c.name === selectedColor)?.variants || product.variants;
  const currentVariant = activeColorVariants.find((v) => v.size === selectedSize) || activeColorVariants[0];

  const currentStock = currentVariant ? currentVariant.stockQuantity : 0;
  const isOutOfStock = currentStock <= 0;

  const handleColorChange = (colorName: string) => {
    setSelectedColor(colorName);
    const variantsForColor = colorList.find((c) => c.name === colorName)?.variants || [];
    // If current selected size is available in new color, keep it, else pick first available
    const hasSameSize = variantsForColor.find((v) => v.size === selectedSize);
    if (!hasSameSize && variantsForColor.length > 0) {
      setSelectedSize(variantsForColor[0].size);
    }
    const colorVar = variantsForColor[0];
    if (colorVar?.imageUrl) {
      setSelectedImage(colorVar.imageUrl);
    }
  };

  const handleAddToCart = async () => {
    if (!currentVariant) return;
    try {
      await addToCart(currentVariant.id, quantity);
    } catch (err: any) {
      alert(err.message || 'Error adding to cart');
    }
  };

  const handleBuyNowClick = () => {
    if (!currentVariant) return;
    onBuyNow(currentVariant.id, quantity);
  };

  const handleCheckDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pinCode.trim())) {
      setPinResult('Please enter a valid 6-digit Indian PIN code');
      return;
    }
    // Estimated 2-4 days across India
    setPinResult(`Delivery guaranteed by BlueDart Express in 2-3 business days to PIN ${pinCode.trim()}. Cash on Delivery available.`);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      alert('Please log in to submit a review.');
      return;
    }
    setReviewSubmitting(true);
    setReviewMsg(null);
    try {
      const res = await apiRequest('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          rating: newRating,
          title: newTitle,
          comment: newComment,
        }),
      });
      setReviews((prev) => [res.review, ...prev]);
      setNewTitle('');
      setNewComment('');
      setReviewMsg('Thank you! Your verified review has been posted.');
    } catch (err: any) {
      setReviewMsg(err.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1050 }}
      >
        <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
          <div className="modal-content shadow-2xl border-0 overflow-hidden">
            {/* Header */}
            <div className="modal-header border-bottom py-2 px-4 bg-white sticky-top">
              <span className="editorial-sub text-muted">
                {product.gender.toUpperCase()} / {product.categoryName}
              </span>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onClose}
              ></button>
            </div>

            <div className="modal-body p-0">
              <div className="row g-0">
                {/* Left: Image Gallery */}
                <div className="col-lg-7 bg-light p-3 p-md-4 border-end">
                  <div className="row g-3">
                    {/* Thumbnails list */}
                    <div className="col-2 d-flex flex-column gap-2 order-2 order-md-1">
                      {product.images.map((img, idx) => (
                        <div
                          key={idx}
                          className={`ratio ratio-1x1 border cursor-pointer ${
                            selectedImage === img ? 'border-dark border-2' : 'border-light'
                          }`}
                          onClick={() => setSelectedImage(img)}
                        >
                          <img
                            src={img}
                            alt=""
                            className="object-fit-cover w-100 h-100"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Main Active Image with Zoom Frame */}
                    <div className="col-10 order-1 order-md-2">
                      <div className="position-relative overflow-hidden bg-white shadow-sm" style={{ minHeight: '520px' }}>
                        <img
                          src={selectedImage || product.images[0]}
                          alt={product.name}
                          className="w-100 h-100 object-fit-cover"
                          style={{ maxHeight: '680px' }}
                        />
                        {product.discountPercent > 0 && (
                          <div className="position-absolute top-0 start-0 m-3">
                            <span className="badge-discount">{product.discountPercent}% OFF</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Product Details & Purchase Controls */}
                <div className="col-lg-5 p-4 p-md-5 d-flex flex-column justify-content-between bg-white">
                  <div>
                    {/* Title & Brand */}
                    <span className="editorial-sub text-gradient-rainbow fw-bold mb-1 d-block">✦ AURA INDIA COUTURE EDIT ✦</span>
                    <h1 className="h3 fw-bold font-serif mb-2 text-dark">{product.name}</h1>

                    {/* Rating & Reviews */}
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <div className="text-warning small">
                        {'★'.repeat(Math.round(product.rating))}
                        {'☆'.repeat(5 - Math.round(product.rating))}
                      </div>
                      <span className="fw-bold small">{product.rating}</span>
                      <span className="text-muted small">({reviews.length || product.reviewCount} customer reviews)</span>
                      <span className="text-muted">·</span>
                      <span className="text-success small fw-medium">
                        <i className="bi bi-shield-check me-1"></i>100% Authentic
                      </span>
                    </div>

                    {/* Price Row */}
                    <div className="d-flex align-items-baseline gap-3 mb-1">
                      <span className="display-6 fw-bold text-dark">
                        ₹{product.basePrice.toLocaleString('en-IN')}
                      </span>
                      {product.mrpPrice > product.basePrice && (
                        <span className="h5 text-muted text-decoration-line-through mb-0">
                          ₹{product.mrpPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                      <span className="badge bg-success-subtle text-success-emphasis fw-bold">
                        Save ₹{(product.mrpPrice - product.basePrice).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-muted small mb-4">MRP inclusive of all taxes (GST included).</p>

                    {/* Color Swatches */}
                    <div className="mb-4">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="small fw-semibold text-uppercase">
                          Color: <span className="text-muted fw-normal">{selectedColor}</span>
                        </span>
                        {currentVariant && (
                          <span className="small text-muted">SKU: {currentVariant.sku}</span>
                        )}
                      </div>
                      <div className="d-flex gap-2">
                        {colorList.map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            className={`p-1 border rounded-circle d-flex align-items-center justify-content-center ${
                              selectedColor === c.name ? 'border-dark border-2' : 'border-light'
                            }`}
                            style={{ width: '34px', height: '34px' }}
                            onClick={() => handleColorChange(c.name)}
                            title={c.name}
                          >
                            <span
                              className="rounded-circle d-block"
                              style={{ width: '22px', height: '22px', backgroundColor: c.hex }}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Size Selector */}
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small fw-semibold text-uppercase">
                          Select Size: <span className="text-muted fw-normal">{selectedSize}</span>
                        </span>
                        <button
                          type="button"
                          className="btn btn-link p-0 text-dark small text-decoration-underline text-uppercase fw-semibold"
                          onClick={() => setShowSizeGuide(true)}
                        >
                          <i className="bi bi-rulers me-1"></i>Size Guide
                        </button>
                      </div>

                      <div className="d-flex flex-wrap gap-2">
                        {activeColorVariants.map((v) => {
                          const isUnavailable = v.stockQuantity <= 0;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              className={`size-chip ${selectedSize === v.size ? 'selected' : ''} ${
                                isUnavailable ? 'disabled' : ''
                              }`}
                              disabled={isUnavailable}
                              onClick={() => setSelectedSize(v.size)}
                            >
                              {v.size}
                            </button>
                          );
                        })}
                      </div>

                      {/* Stock Indicator */}
                      <div className="mt-2">
                        {isOutOfStock ? (
                          <span className="text-danger small fw-semibold">
                            <i className="bi bi-x-circle me-1"></i>Out of Stock for size {selectedSize}
                          </span>
                        ) : currentStock <= 5 ? (
                          <span className="text-danger small fw-semibold animate-pulse">
                            <i className="bi bi-fire me-1"></i>Only {currentStock} left in stock - Order soon!
                          </span>
                        ) : (
                          <span className="text-success small fw-medium">
                            <i className="bi bi-check2-circle me-1"></i>In Stock ({currentStock} available)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity & CTA Buttons */}
                    <div className="mb-4">
                      <div className="d-flex gap-3 mb-3">
                        <div className="input-group" style={{ width: '130px' }}>
                          <button
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            disabled={isOutOfStock}
                          >
                            -
                          </button>
                          <input
                            type="text"
                            className="form-control text-center fw-bold bg-white"
                            value={quantity}
                            readOnly
                          />
                          <button
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                            disabled={isOutOfStock || quantity >= currentStock}
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          className="btn btn-outline-dark flex-grow-1"
                          onClick={() => toggleWishlist(product)}
                        >
                          <i
                            className={`bi me-2 ${
                              isInWishlist(product.id) ? 'bi-heart-fill text-danger' : 'bi-heart'
                            }`}
                          ></i>
                          {isInWishlist(product.id) ? 'Saved' : 'Wishlist'}
                        </button>
                      </div>

                      <div className="d-flex flex-column gap-2">
                        <button
                          type="button"
                          className="btn btn-fancy-vibrant rounded-pill w-100 py-3 d-flex align-items-center justify-content-center shadow"
                          onClick={handleAddToCart}
                          disabled={isOutOfStock || cartLoading}
                        >
                          {cartLoading ? (
                            <span className="spinner-border spinner-border-sm me-2"></span>
                          ) : (
                            <i className="bi bi-bag-plus-fill me-2 fs-5"></i>
                          )}
                          {isOutOfStock ? 'Sold Out' : 'ADD TO BAG'}
                        </button>

                        <button
                          type="button"
                          className="btn btn-dark rounded-pill w-100 py-3 text-uppercase fw-bold letter-spacing-1 bg-black"
                          onClick={handleBuyNowClick}
                          disabled={isOutOfStock}
                        >
                          ⚡ BUY NOW (EXPRESS CHECKOUT)
                        </button>
                      </div>
                    </div>

                    {/* Indian Delivery PIN Code Checker */}
                    <div className="p-3 bg-light border mb-4">
                      <span className="small fw-semibold text-uppercase d-block mb-2">
                        <i className="bi bi-geo-alt me-1"></i>Check Delivery to your PIN Code
                      </span>
                      <form onSubmit={handleCheckDelivery} className="input-group">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Enter 6-digit PIN code (e.g. 560038)"
                          maxLength={6}
                          value={pinCode}
                          onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                        />
                        <button className="btn btn-dark btn-sm text-uppercase fw-semibold" type="submit">
                          Check
                        </button>
                      </form>
                      {pinResult && (
                        <p className="small mt-2 mb-0 text-success fw-medium">{pinResult}</p>
                      )}
                    </div>

                    {/* Accordion / Tabs: Description & Fabric & Reviews */}
                    <div className="border-top pt-3">
                      <ul className="nav nav-tabs border-bottom-0 mb-3 small">
                        <li className="nav-item">
                          <button
                            className={`nav-link text-uppercase fw-semibold ${
                              activeTab === 'details' ? 'active' : ''
                            }`}
                            onClick={() => setActiveTab('details')}
                          >
                            Description
                          </button>
                        </li>
                        <li className="nav-item">
                          <button
                            className={`nav-link text-uppercase fw-semibold ${
                              activeTab === 'fabric' ? 'active' : ''
                            }`}
                            onClick={() => setActiveTab('fabric')}
                          >
                            Material & Care
                          </button>
                        </li>
                        <li className="nav-item">
                          <button
                            className={`nav-link text-uppercase fw-semibold ${
                              activeTab === 'reviews' ? 'active' : ''
                            }`}
                            onClick={() => setActiveTab('reviews')}
                          >
                            Reviews ({reviews.length})
                          </button>
                        </li>
                      </ul>

                      {activeTab === 'details' && (
                        <div className="small text-muted lh-base">
                          <p>{product.description}</p>
                          <ul className="list-unstyled mb-0">
                            <li><strong>Style:</strong> {product.categoryName}</li>
                            <li><strong>Gender:</strong> {product.gender.toUpperCase()}</li>
                            <li><strong>Occasion:</strong> Versatile Day-to-Night Wear</li>
                            <li><strong>Country of Origin:</strong> Proudly Designed & Crafted in India</li>
                          </ul>
                        </div>
                      )}

                      {activeTab === 'fabric' && (
                        <div className="small text-muted lh-base">
                          <p><strong>Composition:</strong> {product.material}</p>
                          <p><strong>Care Instructions:</strong></p>
                          <ul className="mb-0 ps-3">
                            <li>Gentle cold machine wash inside out or hand wash with mild liquid detergent</li>
                            <li>Do not bleach or tumble dry</li>
                            <li>Medium warm iron or steam</li>
                            <li>Dry in shade to preserve handloom luster</li>
                          </ul>
                        </div>
                      )}

                      {activeTab === 'reviews' && (
                        <div>
                          {/* Write Review Form */}
                          <div className="p-3 bg-light border mb-3">
                            <h6 className="fw-bold small text-uppercase mb-2">Write a Review</h6>
                            {reviewMsg && (
                              <div className="alert alert-info py-2 small mb-2">{reviewMsg}</div>
                            )}
                            <form onSubmit={handleSubmitReview}>
                              <div className="mb-2">
                                <label className="form-label small mb-1">Your Rating</label>
                                <select
                                  className="form-select form-select-sm"
                                  value={newRating}
                                  onChange={(e) => setNewRating(Number(e.target.value))}
                                >
                                  <option value={5}>★★★★★ (5 - Excellent)</option>
                                  <option value={4}>★★★★☆ (4 - Very Good)</option>
                                  <option value={3}>★★★☆☆ (3 - Average)</option>
                                  <option value={2}>★★☆☆☆ (2 - Below Average)</option>
                                  <option value={1}>★☆☆☆☆ (1 - Poor)</option>
                                </select>
                              </div>
                              <div className="mb-2">
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="Review headline (e.g. Luxurious fabric, perfect fit)"
                                  value={newTitle}
                                  onChange={(e) => setNewTitle(e.target.value)}
                                  required
                                />
                              </div>
                              <div className="mb-2">
                                <textarea
                                  className="form-control form-control-sm"
                                  rows={2}
                                  placeholder="Share your detailed feedback on texture, fit, and sizing..."
                                  value={newComment}
                                  onChange={(e) => setNewComment(e.target.value)}
                                  required
                                ></textarea>
                              </div>
                              <button
                                type="submit"
                                className="btn btn-dark btn-sm text-uppercase fw-semibold"
                                disabled={reviewSubmitting}
                              >
                                {reviewSubmitting ? 'Submitting...' : 'Post Review'}
                              </button>
                            </form>
                          </div>

                          {/* Existing Reviews List */}
                          <div className="d-flex flex-column gap-3 overflow-auto" style={{ maxHeight: '250px' }}>
                            {reviews.map((r) => (
                              <div key={r.id} className="border-bottom pb-2">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <span className="fw-semibold small">{r.userName}</span>
                                  {r.isVerifiedPurchase && (
                                    <span className="badge bg-success-subtle text-success small">
                                      <i className="bi bi-patch-check-fill me-1"></i>Verified Purchase
                                    </span>
                                  )}
                                </div>
                                <div className="text-warning small mb-1">
                                  {'★'.repeat(r.rating)}
                                </div>
                                <h6 className="small fw-bold mb-1">{r.title}</h6>
                                <p className="small text-muted mb-0">{r.comment}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Size Guide Modal */}
      <SizeGuideModal
        show={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
        categoryGender={product.gender}
      />
    </>
  );
};
