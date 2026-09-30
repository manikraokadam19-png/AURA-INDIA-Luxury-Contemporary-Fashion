import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api.ts';
import { LookbookLook, Product } from '../server/types.ts';
import { useCart } from '../context/CartContext.tsx';

interface EditorialLookbookProps {
  onSelectProduct: (product: Product) => void;
}

export const EditorialLookbook: React.FC<EditorialLookbookProps> = ({ onSelectProduct }) => {
  const [looks, setLooks] = useState<Array<LookbookLook & { products: Product[] }>>([]);
  const [selectedLook, setSelectedLook] = useState<(LookbookLook & { products: Product[] }) | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    apiRequest<Array<LookbookLook & { products: Product[] }>>('/api/lookbooks')
      .then((data) => {
        setLooks(data || []);
      })
      .catch(() => {});
  }, []);

  if (looks.length === 0) return null;

  return (
    <>
      <section className="py-5 bg-white border-top">
        <div className="container-fluid px-lg-5 px-3">
          <div className="text-center mb-5">
            <span className="editorial-sub text-muted">VIVANTA CURATED LOOKBOOKS</span>
            <h2 className="font-serif display-5 fw-bold text-dark mt-1">THE EDIT: SHOP THE RUNWAY</h2>
            <p className="text-muted small mx-auto" style={{ maxWidth: '640px' }}>
              Coordinated ensembles styled by our Bombay fashion directors. Click "Shop The Look" to discover every garment in the composition.
            </p>
          </div>

          <div className="row g-4">
            {looks.map((look) => (
              <div key={look.id} className="col-12 col-md-4">
                <div className="card border-0 rounded-0 overflow-hidden shadow-none group position-relative">
                  {/* Model Image Frame */}
                  <div className="ratio ratio-3x4 overflow-hidden bg-light">
                    <img
                      src={look.modelImage}
                      alt={look.title}
                      className="w-100 h-100 object-fit-cover transition duration-700 ease-in-out group-hover:scale-105"
                    />
                  </div>

                  {/* Overlay Narrative */}
                  <div className="p-3 bg-white">
                    <span className="editorial-sub text-muted" style={{ fontSize: '0.68rem' }}>
                      {look.subtitle}
                    </span>
                    <h5 className="font-serif fw-bold mb-2 text-dark">{look.title}</h5>
                    <p className="small text-muted mb-3 line-clamp-2" style={{ minHeight: '40px' }}>
                      {look.story}
                    </p>
                    <button
                      type="button"
                      className="btn-aura-outline w-100 py-2 small d-flex align-items-center justify-content-center"
                      onClick={() => setSelectedLook(look)}
                    >
                      <i className="bi bi-bag-check me-2"></i> SHOP THIS LOOK ({look.products.length} PIECES)
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SHOP THE LOOK MODAL */}
      {selectedLook && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-2xl overflow-hidden bg-white">
              <div className="modal-header border-bottom py-3 px-4 bg-light">
                <div>
                  <span className="editorial-sub text-muted">SHOP THE EDIT</span>
                  <h5 className="font-serif fw-bold mb-0">{selectedLook.title}</h5>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedLook(null)}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="row g-4 align-items-center mb-4 pb-3 border-bottom">
                  <div className="col-sm-4">
                    <img
                      src={selectedLook.modelImage}
                      alt={selectedLook.title}
                      className="w-100 object-fit-cover shadow-sm"
                      style={{ maxHeight: '280px' }}
                    />
                  </div>
                  <div className="col-sm-8">
                    <span className="editorial-sub text-muted">{selectedLook.subtitle}</span>
                    <h4 className="font-serif fw-bold text-dark mb-2">{selectedLook.title}</h4>
                    <p className="small text-muted mb-3">{selectedLook.story}</p>
                    <div className="alert alert-secondary py-2 small mb-0">
                      <i className="bi bi-stars me-1"></i> Buy the whole ensemble to enjoy complimentary stylist packaging.
                    </div>
                  </div>
                </div>

                <h6 className="fw-bold small text-uppercase mb-3">Garments in this Look:</h6>
                <div className="d-flex flex-column gap-3">
                  {selectedLook.products.map((prod) => (
                    <div key={prod.id} className="card border p-3 bg-light shadow-none">
                      <div className="row g-3 align-items-center">
                        <div className="col-3 col-sm-2">
                          <img
                            src={prod.images[0]}
                            alt={prod.name}
                            className="w-100 object-fit-cover"
                            style={{ height: '80px' }}
                          />
                        </div>
                        <div className="col-9 col-sm-6">
                          <span className="editorial-sub text-muted" style={{ fontSize: '0.65rem' }}>
                            {prod.categoryName} · {prod.gender.toUpperCase()}
                          </span>
                          <h6 className="small fw-bold text-dark text-truncate mb-1">{prod.name}</h6>
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-bold text-dark">₹{prod.basePrice.toLocaleString('en-IN')}</span>
                            {prod.mrpPrice > prod.basePrice && (
                              <span className="text-muted text-decoration-line-through small">
                                ₹{prod.mrpPrice.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="col-12 col-sm-4 d-flex gap-2 justify-content-end">
                          <button
                            type="button"
                            className="btn btn-outline-dark btn-sm text-uppercase fw-semibold"
                            onClick={() => {
                              setSelectedLook(null);
                              onSelectProduct(prod);
                            }}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="btn btn-dark btn-sm text-uppercase fw-semibold"
                            onClick={async () => {
                              if (prod.variants[0]) {
                                await addToCart(prod.variants[0].id, 1);
                              }
                            }}
                          >
                            + Quick Bag
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer bg-light px-4 py-3">
                <button
                  type="button"
                  className="btn btn-outline-dark text-uppercase small fw-semibold"
                  onClick={() => setSelectedLook(null)}
                >
                  Done Browsing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
