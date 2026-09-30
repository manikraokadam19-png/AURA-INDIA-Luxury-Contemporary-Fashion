import React from 'react';
import { Category } from '../server/types.ts';

export interface FilterState {
  gender: string;
  ageGroup: string;
  category: string;
  collection: string;
  minPrice: number;
  maxPrice: number;
  size: string;
  color: string;
  sort: string;
  inStockOnly: boolean;
}

interface FilterSidebarProps {
  filters: FilterState;
  categories: Category[];
  onChange: (newFilters: FilterState) => void;
  onReset: () => void;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  categories,
  onChange,
  onReset,
  isMobileDrawer,
  onCloseMobileDrawer,
}) => {
  const SIZES = ['0-3M', '6-12M', '3-4Y', '7-8Y', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
  const COLORS = [
    { name: 'Black', hex: '#111111' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Beige', hex: '#D2B48C' },
    { name: 'Green', hex: '#0B5345' },
    { name: 'Navy', hex: '#0A192F' },
    { name: 'Pink', hex: '#C2185B' },
    { name: 'Brown', hex: '#3E2723' },
  ];

  const update = (partial: Partial<FilterState>) => {
    onChange({ ...filters, ...partial });
  };

  const content = (
    <div className="filter-controls d-flex flex-column gap-4">
      {/* Header & Reset */}
      <div className="d-flex justify-content-between align-items-center border-bottom pb-2">
        <h6 className="font-serif fw-bold text-dark text-uppercase mb-0 letter-spacing-1">
          <i className="bi bi-sliders me-1"></i> Refine Styles
        </h6>
        <button
          type="button"
          className="btn btn-link p-0 text-muted small text-decoration-none"
          onClick={onReset}
        >
          Reset All
        </button>
      </div>

      {/* Gender & Audience */}
      <div>
        <label className="editorial-sub text-muted d-block mb-2">GENDER / AUDIENCE</label>
        <div className="d-flex flex-wrap gap-1">
          {['all', 'women', 'men', 'kids', 'baby', 'unisex'].map((g) => (
            <button
              key={g}
              type="button"
              className={`btn btn-sm text-uppercase fw-semibold ${
                filters.gender === g ? 'btn-dark' : 'btn-outline-secondary'
              }`}
              style={{ fontSize: '0.75rem' }}
              onClick={() => update({ gender: g })}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Age Group */}
      <div>
        <label className="editorial-sub text-muted d-block mb-2">AGE GROUP</label>
        <div className="d-flex flex-wrap gap-1">
          {[
            { id: 'all', label: 'All Ages' },
            { id: 'adult', label: 'Adults' },
            { id: 'young_adult', label: 'Young Adults' },
            { id: 'teen', label: 'Teenagers' },
            { id: 'kids', label: 'Kids (3-14Y)' },
            { id: 'baby', label: 'Babies (0-3Y)' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`btn btn-sm fw-semibold ${
                filters.ageGroup === item.id ? 'btn-dark' : 'btn-outline-secondary'
              }`}
              style={{ fontSize: '0.75rem' }}
              onClick={() => update({ ageGroup: item.id })}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="editorial-sub text-muted d-block mb-2">COLLECTION CATEGORY</label>
        <select
          className="form-select form-select-sm"
          value={filters.category}
          onChange={(e) => update({ category: e.target.value })}
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.gender.toUpperCase()})
            </option>
          ))}
        </select>
      </div>

      {/* Price Filter (Presets & Custom Slider) */}
      <div>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <label className="editorial-sub text-muted mb-0">PRICE RANGE (₹ INR)</label>
          <span className="small fw-bold text-dark">
            ₹{filters.minPrice} - ₹{filters.maxPrice >= 10000 ? '10,000+' : filters.maxPrice.toLocaleString('en-IN')}
          </span>
        </div>

        <input
          type="range"
          className="form-range"
          min="0"
          max="10000"
          step="500"
          value={filters.maxPrice}
          onChange={(e) => update({ maxPrice: Number(e.target.value) })}
        />

        {/* Quick price presets */}
        <div className="d-flex flex-wrap gap-1 mt-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm p-1 px-2"
            style={{ fontSize: '0.7rem' }}
            onClick={() => update({ minPrice: 0, maxPrice: 1000 })}
          >
            Under ₹1,000
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm p-1 px-2"
            style={{ fontSize: '0.7rem' }}
            onClick={() => update({ minPrice: 1000, maxPrice: 2500 })}
          >
            ₹1,000 - ₹2,500
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm p-1 px-2"
            style={{ fontSize: '0.7rem' }}
            onClick={() => update({ minPrice: 2500, maxPrice: 10000 })}
          >
            ₹2,500+
          </button>
        </div>
      </div>

      {/* Size Filter */}
      <div>
        <label className="editorial-sub text-muted d-block mb-2">SIZE AVAILABILITY</label>
        <div className="d-flex flex-wrap gap-1">
          {SIZES.map((sz) => (
            <button
              key={sz}
              type="button"
              className={`btn btn-sm ${
                filters.size === sz ? 'btn-dark' : 'btn-outline-secondary'
              }`}
              style={{ fontSize: '0.75rem', minWidth: '38px' }}
              onClick={() => update({ size: filters.size === sz ? '' : sz })}
            >
              {sz}
            </button>
          ))}
        </div>
      </div>

      {/* Color Filter */}
      <div>
        <label className="editorial-sub text-muted d-block mb-2">COLOR PALETTE</label>
        <div className="d-flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              className={`p-1 rounded-circle border d-flex align-items-center justify-content-center ${
                filters.color === c.name.toLowerCase() ? 'border-dark border-2' : 'border-light'
              }`}
              style={{ width: '28px', height: '28px' }}
              onClick={() =>
                update({ color: filters.color === c.name.toLowerCase() ? '' : c.name.toLowerCase() })
              }
              title={c.name}
            >
              <span
                className="rounded-circle d-block"
                style={{ width: '18px', height: '18px', backgroundColor: c.hex }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Seasonal Curations */}
      <div>
        <label className="editorial-sub text-muted d-block mb-2">CURATED EDIT</label>
        <select
          className="form-select form-select-sm"
          value={filters.collection}
          onChange={(e) => update({ collection: e.target.value })}
        >
          <option value="all">All Edits</option>
          <option value="new_season">New Season Drop</option>
          <option value="the_edit">The Runway Edit</option>
          <option value="festive_edit">Festive Couture</option>
          <option value="summer_edit">Summer Linen Edit</option>
          <option value="streetwear">Heavyweight Streetwear</option>
        </select>
      </div>
    </div>
  );

  if (isMobileDrawer) {
    return (
      <>
        <div
          className="modal-backdrop fade show d-lg-none"
          style={{ zIndex: 1040 }}
          onClick={onCloseMobileDrawer}
        ></div>
        <div
          className="offcanvas offcanvas-start show d-lg-none shadow-2xl"
          tabIndex={-1}
          style={{ zIndex: 1045, width: '310px', visibility: 'visible' }}
        >
          <div className="offcanvas-header border-bottom py-3 bg-light">
            <h5 className="offcanvas-title font-serif h6 mb-0 text-uppercase fw-bold">Filter Catalog</h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onCloseMobileDrawer}
            ></button>
          </div>
          <div className="offcanvas-body p-4">{content}</div>
          <div className="p-3 border-top bg-light">
            <button
              type="button"
              className="btn-aura-primary w-100 py-2 small"
              onClick={onCloseMobileDrawer}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </>
    );
  }

  return <div className="d-none d-lg-block sticky-top" style={{ top: '100px' }}>{content}</div>;
};
