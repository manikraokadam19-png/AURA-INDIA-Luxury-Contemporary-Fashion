import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api.ts';
import { Product } from '../server/types.ts';

interface SearchModalProps {
  show: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ show, onClose, onSelectProduct }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const quickPills = [
    'Oversized T-Shirt',
    'Silk Kurta',
    'Pure Linen',
    'Bamboo Romper',
    'Cargo Trousers',
    'Ethnic',
    'Trench Dress',
  ];

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiRequest<{ products: Product[] }>(
          `/api/products?search=${encodeURIComponent(query.trim())}`
        );
        setResults(data.products || []);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!show) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-2xl overflow-hidden">
          {/* Search Input Bar */}
          <div className="modal-header border-bottom p-3 bg-white">
            <div className="input-group input-group-lg border-0">
              <span className="input-group-text bg-transparent border-0 text-muted">
                <i className="bi bi-search fs-5"></i>
              </span>
              <input
                type="text"
                className="form-control border-0 shadow-none ps-2 fs-5"
                placeholder="Search styles, fabrics, categories (e.g. 'black oversized', 'kurta', 'linen')..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  className="btn btn-link text-muted"
                  onClick={() => setQuery('')}
                >
                  <i className="bi bi-x-circle-fill"></i>
                </button>
              )}
            </div>
            <button
              type="button"
              className="btn-close ms-2"
              aria-label="Close"
              onClick={onClose}
            ></button>
          </div>

          <div className="modal-body p-4 bg-light" style={{ maxHeight: '550px', overflowY: 'auto' }}>
            {/* Quick Pills */}
            <div className="mb-4">
              <span className="editorial-sub text-muted d-block mb-2">TRENDING SEARCHES</span>
              <div className="d-flex flex-wrap gap-2">
                {quickPills.map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    className="btn btn-sm btn-outline-dark rounded-pill bg-white px-3 py-1"
                    onClick={() => setQuery(pill)}
                  >
                    {pill}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            {loading ? (
              <div className="text-center py-4">
                <span className="spinner-border spinner-border-sm me-2"></span>
                <span className="small text-muted">Searching collections...</span>
              </div>
            ) : query.trim() && results.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-emoji-neutral display-4 text-muted mb-2 d-block"></i>
                <h6 className="font-serif fw-bold">No exact matches found for "{query}"</h6>
                <p className="text-muted small">Try searching by category (Kurta, T-Shirt, Dress), color, or age group.</p>
              </div>
            ) : results.length > 0 ? (
              <div>
                <span className="editorial-sub text-muted d-block mb-2">
                  RESULTS ({results.length})
                </span>
                <div className="row g-3">
                  {results.map((product) => (
                    <div key={product.id} className="col-12 col-md-6">
                      <div
                        className="card border p-2 shadow-none cursor-pointer bg-white h-100 flex-row align-items-center gap-3"
                        onClick={() => {
                          onClose();
                          onSelectProduct(product);
                        }}
                      >
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="object-fit-cover rounded-0"
                          style={{ width: '70px', height: '90px' }}
                        />
                        <div className="flex-grow-1 overflow-hidden">
                          <span className="editorial-sub text-muted" style={{ fontSize: '0.65rem' }}>
                            {product.categoryName} · {product.gender.toUpperCase()}
                          </span>
                          <h6 className="small fw-bold text-dark text-truncate mb-1">{product.name}</h6>
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-bold text-dark small">₹{product.basePrice.toLocaleString('en-IN')}</span>
                            {product.mrpPrice > product.basePrice && (
                              <span className="text-muted text-decoration-line-through small" style={{ fontSize: '0.75rem' }}>
                                ₹{product.mrpPrice.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        </div>
                        <i className="bi bi-arrow-right text-muted pe-2"></i>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
