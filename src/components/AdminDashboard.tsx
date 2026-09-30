import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api.ts';
import { Order, Product, Category, OrderStatus } from '../server/types.ts';

interface AdminDashboardProps {
  show: boolean;
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ show, onClose }) => {
  const [adminTab, setAdminTab] = useState<'stats' | 'orders' | 'products' | 'customers' | 'settings'>('stats');

  // Stats
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAdminOrder, setSelectedAdminOrder] = useState<Order | null>(null);

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Customers
  const [customers, setCustomers] = useState<any[]>([]);

  // Settings
  const [promoBarText, setPromoBarText] = useState('');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(999);
  const [savingSettings, setSavingSettings] = useState(false);

  // New Product Form State
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('');
  const [newProdGender, setNewProdGender] = useState('women');
  const [newProdAgeGroup, setNewProdAgeGroup] = useState('adult');
  const [newProdPrice, setNewProdPrice] = useState(1999);
  const [newProdMrp, setNewProdMrp] = useState(2999);
  const [newProdDescription, setNewProdDescription] = useState('');
  const [newProdMaterial, setNewProdMaterial] = useState('100% Breathable Cotton');
  const [newProdCollection, setNewProdCollection] = useState('new_season');
  const [newProdImage, setNewProdImage] = useState('https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80');
  const [newProdVariants, setNewProdVariants] = useState<Array<{ size: string; colorName: string; colorHex: string; stockQuantity: number; sku: string }>>([
    { size: 'S', colorName: 'Noir Black', colorHex: '#111111', stockQuantity: 20, sku: 'PROD-BLK-S' },
    { size: 'M', colorName: 'Noir Black', colorHex: '#111111', stockQuantity: 25, sku: 'PROD-BLK-M' },
    { size: 'L', colorName: 'Noir Black', colorHex: '#111111', stockQuantity: 15, sku: 'PROD-BLK-L' },
  ]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const data = await apiRequest('/api/admin/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadOrders = async () => {
    try {
      const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const data = await apiRequest<Order[]>(`/api/admin/orders${query}`);
      setOrders(data || []);
      if (data && data.length > 0 && !selectedAdminOrder) {
        setSelectedAdminOrder(data[0]);
      }
    } catch (err) {
      console.error('Failed to load admin orders:', err);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await apiRequest<{ products: Product[] }>('/api/products');
      setProducts(data.products || []);
      const cats = await apiRequest<Category[]>('/api/categories');
      setCategories(cats || []);
      if (cats && cats.length > 0 && !newProdCategory) {
        setNewProdCategory(cats[0].id);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await apiRequest<any[]>('/api/admin/customers');
      setCustomers(data || []);
    } catch {}
  };

  const loadSettings = async () => {
    try {
      const data = await apiRequest('/api/settings');
      setPromoBarText(data.promoBarText || '');
      setFreeShippingThreshold(data.freeShippingThreshold || 999);
    } catch {}
  };

  useEffect(() => {
    if (show) {
      loadStats();
      loadOrders();
      loadProducts();
      loadCustomers();
      loadSettings();
    }
  }, [show, statusFilter]);

  if (!show) return null;

  // Advance Order Status
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      const res = await apiRequest<{ order: Order }>(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          description: `Dispatched to status: ${nextStatus} via Admin Operation Center`,
          location: nextStatus === 'Shipped' ? 'Mumbai Regional Dispatch Hub' : 'Doorstep Courier Hub',
        }),
      });
      setOrders((prev) => prev.map((o) => (o.id === res.order.id ? res.order : o)));
      if (selectedAdminOrder?.id === res.order.id) {
        setSelectedAdminOrder(res.order);
      }
      loadStats();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  // Toggle Featured or Trending
  const handleToggleProductFlag = async (productId: string, flag: 'isFeatured' | 'isTrending', currentVal: boolean) => {
    try {
      const res = await apiRequest<Product>(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ [flag]: !currentVal }),
      });
      setProducts((prev) => prev.map((p) => (p.id === res.id ? res : p)));
    } catch (err: any) {
      alert(err.message || 'Failed to update flag');
    }
  };

  // Add Product Submit
  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newProd = await apiRequest<Product>('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          name: newProdName,
          categoryId: newProdCategory,
          gender: newProdGender,
          ageGroup: newProdAgeGroup,
          basePrice: newProdPrice,
          mrpPrice: newProdMrp,
          description: newProdDescription,
          material: newProdMaterial,
          collection: newProdCollection,
          images: [newProdImage],
          variants: newProdVariants,
          isFeatured: true,
          isTrending: true,
        }),
      });
      setProducts((prev) => [newProd, ...prev]);
      setShowAddProductModal(false);
      alert('Product created successfully and live on storefront.');
    } catch (err: any) {
      alert(err.message || 'Product creation failed');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await apiRequest('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          promoBarText,
          freeShippingThreshold: Number(freeShippingThreshold),
        }),
      });
      alert('Storefront announcement settings updated in real time.');
    } catch (err: any) {
      alert(err.message || 'Settings update failed');
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!orderSearch) return true;
    const q = orderSearch.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.userEmail.toLowerCase().includes(q) ||
      o.shippingAddress.fullName.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1055 }}
      >
        <div className="modal-dialog modal-dialog-centered modal-fullscreen">
          <div className="modal-content border-0 bg-light">
            {/* Header */}
            <div className="modal-header border-bottom py-3 px-4 bg-dark text-white">
              <div className="d-flex align-items-center gap-3">
                <span className="brand-logo text-gradient-fancy" style={{ fontSize: '1.2rem' }}>
                  VIVANTA
                </span>
                <span className="text-secondary">|</span>
                <h5 className="modal-title font-serif h6 mb-0 text-uppercase fw-bold letter-spacing-1 text-white">
                  Headquarters Admin & Inventory Command Center
                </h5>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="Close"
                onClick={onClose}
              ></button>
            </div>

            <div className="modal-body p-0 d-flex flex-column h-100">
              {/* Admin Navigation Pills */}
              <div className="bg-white border-bottom px-4 py-2 d-flex gap-2 overflow-auto">
                <button
                  className={`btn btn-sm text-uppercase fw-bold px-3 ${
                    adminTab === 'stats' ? 'btn-dark' : 'btn-outline-secondary'
                  }`}
                  onClick={() => setAdminTab('stats')}
                >
                  <i className="bi bi-speedometer2 me-1"></i> Executive KPIs
                </button>
                <button
                  className={`btn btn-sm text-uppercase fw-bold px-3 ${
                    adminTab === 'orders' ? 'btn-dark' : 'btn-outline-secondary'
                  }`}
                  onClick={() => setAdminTab('orders')}
                >
                  <i className="bi bi-box-seam me-1"></i> Order Fulfillment ({orders.length})
                </button>
                <button
                  className={`btn btn-sm text-uppercase fw-bold px-3 ${
                    adminTab === 'products' ? 'btn-dark' : 'btn-outline-secondary'
                  }`}
                  onClick={() => setAdminTab('products')}
                >
                  <i className="bi bi-tags me-1"></i> Catalog & Inventory ({products.length})
                </button>
                <button
                  className={`btn btn-sm text-uppercase fw-bold px-3 ${
                    adminTab === 'customers' ? 'btn-dark' : 'btn-outline-secondary'
                  }`}
                  onClick={() => setAdminTab('customers')}
                >
                  <i className="bi bi-people me-1"></i> Client Database ({customers.length})
                </button>
                <button
                  className={`btn btn-sm text-uppercase fw-bold px-3 ${
                    adminTab === 'settings' ? 'btn-dark' : 'btn-outline-secondary'
                  }`}
                  onClick={() => setAdminTab('settings')}
                >
                  <i className="bi bi-sliders me-1"></i> Storefront Announcements
                </button>
              </div>

              {/* Main Admin Tab Views */}
              <div className="p-4 flex-grow-1 overflow-auto bg-light">
                {/* 1. STATS / EXECUTIVE KPIS */}
                {adminTab === 'stats' && stats && (
                  <div>
                    <h5 className="font-serif fw-bold mb-4">EXECUTIVE PERFORMANCE METRICS</h5>
                    <div className="row g-3 mb-4">
                      <div className="col-sm-6 col-lg-3">
                        <div className="card p-3 border-0 shadow-sm bg-white border-start border-dark border-4">
                          <span className="editorial-sub text-muted">TOTAL REVENUE (₹)</span>
                          <h3 className="fw-bold text-dark mb-0 mt-1">₹{stats.totalRevenue.toLocaleString('en-IN')}</h3>
                          <span className="small text-success mt-1">Captured Gross Sales</span>
                        </div>
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <div className="card p-3 border-0 shadow-sm bg-white border-start border-primary border-4">
                          <span className="editorial-sub text-muted">TOTAL ORDERS</span>
                          <h3 className="fw-bold text-dark mb-0 mt-1">{stats.totalOrders}</h3>
                          <span className="small text-muted mt-1">{stats.pendingOrders} pending dispatch</span>
                        </div>
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <div className="card p-3 border-0 shadow-sm bg-white border-start border-success border-4">
                          <span className="editorial-sub text-muted">DELIVERED ORDERS</span>
                          <h3 className="fw-bold text-dark mb-0 mt-1">{stats.deliveredOrders}</h3>
                          <span className="small text-success mt-1">Successful fulfillment</span>
                        </div>
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <div className="card p-3 border-0 shadow-sm bg-white border-start border-danger border-4">
                          <span className="editorial-sub text-muted">CANCELLED ORDERS</span>
                          <h3 className="fw-bold text-dark mb-0 mt-1">{stats.cancelledOrders}</h3>
                          <span className="small text-muted mt-1">Stock restored</span>
                        </div>
                      </div>
                    </div>

                    {/* Low Stock Warning Section */}
                    <div className="card p-4 border-0 shadow-sm bg-white mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="font-serif fw-bold mb-0 text-danger">
                          <i className="bi bi-exclamation-triangle-fill me-2"></i>REAL-TIME LOW STOCK INVENTORY ALERTS (≤ 5 UNITS)
                        </h6>
                        <span className="badge bg-danger">{stats.lowStockProducts.length} Variants</span>
                      </div>

                      {stats.lowStockProducts.length === 0 ? (
                        <p className="text-muted small mb-0">All inventory variants are healthily stocked.</p>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-hover table-bordered small align-middle">
                            <thead className="table-light">
                              <tr>
                                <th>Product Name</th>
                                <th>SKU</th>
                                <th>Color</th>
                                <th>Size</th>
                                <th>Remaining Stock</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stats.lowStockProducts.map((item: any, idx: number) => (
                                <tr key={idx}>
                                  <td className="fw-bold">{item.productName}</td>
                                  <td><code>{item.sku}</code></td>
                                  <td>{item.color}</td>
                                  <td><span className="badge bg-dark">{item.size}</span></td>
                                  <td>
                                    <span className="badge bg-danger fs-6">{item.stock} left</span>
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="btn btn-outline-dark btn-sm text-uppercase fw-semibold"
                                      onClick={() => setAdminTab('products')}
                                    >
                                      Manage Stock
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. ORDERS MANAGEMENT */}
                {adminTab === 'orders' && (
                  <div>
                    <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                      <h5 className="font-serif fw-bold mb-0">ORDER FULFILLMENT & DISPATCH PIPELINE</h5>
                      <div className="d-flex gap-2">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Search Order # or Client..."
                          style={{ width: '220px' }}
                          value={orderSearch}
                          onChange={(e) => setOrderSearch(e.target.value)}
                        />
                        <select
                          className="form-select form-select-sm"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          style={{ width: '160px' }}
                        >
                          <option value="all">All Statuses</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Packed">Packed</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    <div className="row g-4">
                      {/* Left list */}
                      <div className="col-lg-5 d-flex flex-column gap-2" style={{ maxHeight: '650px', overflowY: 'auto' }}>
                        {filteredOrders.map((ord) => (
                          <div
                            key={ord.id}
                            className={`card p-3 border cursor-pointer ${
                              selectedAdminOrder?.id === ord.id ? 'border-dark shadow-sm bg-white' : 'bg-white'
                            }`}
                            onClick={() => setSelectedAdminOrder(ord)}
                          >
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <strong className="text-dark">{ord.orderNumber}</strong>
                              <span
                                className={`badge ${
                                  ord.orderStatus === 'Delivered'
                                    ? 'bg-success'
                                    : ord.orderStatus === 'Cancelled'
                                    ? 'bg-danger'
                                    : 'bg-dark'
                                }`}
                              >
                                {ord.orderStatus}
                              </span>
                            </div>
                            <div className="small text-muted mb-1">
                              Client: <strong>{ord.shippingAddress.fullName}</strong> ({ord.userEmail})
                            </div>
                            <div className="d-flex justify-content-between align-items-center pt-2 border-top small">
                              <span>PIN: {ord.shippingAddress.pincode} ({ord.shippingAddress.city})</span>
                              <strong className="text-dark">₹{ord.grandTotal.toLocaleString('en-IN')}</strong>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Right Detail & Status advancement */}
                      {selectedAdminOrder && (
                        <div className="col-lg-7">
                          <div className="card p-4 border bg-white shadow-sm">
                            <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                              <div>
                                <span className="editorial-sub text-muted">ORDER MANAGEMENT</span>
                                <h4 className="font-serif fw-bold mb-0">{selectedAdminOrder.orderNumber}</h4>
                                <span className="small text-muted">
                                  Payment Method: <strong>{selectedAdminOrder.paymentMethod.toUpperCase()}</strong> ({selectedAdminOrder.paymentStatus})
                                </span>
                              </div>
                              <span className="h4 fw-bold text-dark">
                                ₹{selectedAdminOrder.grandTotal.toLocaleString('en-IN')}
                              </span>
                            </div>

                            {/* Status Stepper */}
                            <div className="p-3 bg-light border mb-4">
                              <span className="editorial-sub text-muted d-block mb-2">ADVANCE DISPATCH STAGE</span>
                              <div className="d-flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className={`btn btn-sm ${selectedAdminOrder.orderStatus === 'Confirmed' ? 'btn-dark' : 'btn-outline-dark'}`}
                                  onClick={() => handleUpdateOrderStatus(selectedAdminOrder.id, 'Confirmed')}
                                >
                                  1. Confirmed
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${selectedAdminOrder.orderStatus === 'Packed' ? 'btn-dark' : 'btn-outline-dark'}`}
                                  onClick={() => handleUpdateOrderStatus(selectedAdminOrder.id, 'Packed')}
                                >
                                  2. Packed
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${selectedAdminOrder.orderStatus === 'Shipped' ? 'btn-dark' : 'btn-outline-dark'}`}
                                  onClick={() => handleUpdateOrderStatus(selectedAdminOrder.id, 'Shipped')}
                                >
                                  3. Shipped (BlueDart AWB)
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${selectedAdminOrder.orderStatus === 'Out for Delivery' ? 'btn-dark' : 'btn-outline-dark'}`}
                                  onClick={() => handleUpdateOrderStatus(selectedAdminOrder.id, 'Out for Delivery')}
                                >
                                  4. Out for Delivery
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-sm ${selectedAdminOrder.orderStatus === 'Delivered' ? 'btn-success text-white' : 'btn-outline-success'}`}
                                  onClick={() => handleUpdateOrderStatus(selectedAdminOrder.id, 'Delivered')}
                                >
                                  ✓ Delivered
                                </button>
                              </div>
                            </div>

                            {/* Delivery Address */}
                            <div className="mb-3 small">
                              <h6 className="fw-bold small text-uppercase">Shipping Destination:</h6>
                              <p className="text-muted mb-0">
                                {selectedAdminOrder.shippingAddress.fullName} · {selectedAdminOrder.shippingAddress.mobile}
                                <br />
                                {selectedAdminOrder.shippingAddress.houseFlat}, {selectedAdminOrder.shippingAddress.street},{' '}
                                {selectedAdminOrder.shippingAddress.city}, {selectedAdminOrder.shippingAddress.state} -{' '}
                                <strong>{selectedAdminOrder.shippingAddress.pincode}</strong>
                              </p>
                            </div>

                            {/* Items */}
                            <h6 className="fw-bold small text-uppercase mb-2">Package Contents:</h6>
                            <div className="d-flex flex-column gap-2 mb-3">
                              {selectedAdminOrder.items.map((i) => (
                                <div key={i.id} className="d-flex align-items-center gap-3 border p-2 bg-light small">
                                  <img src={i.productImage} alt="" style={{ width: '40px', height: '50px', objectFit: 'cover' }} />
                                  <div className="flex-grow-1">
                                    <strong>{i.productName}</strong>
                                    <div className="text-muted">Color: {i.colorName} · Size: {i.size} · Qty: {i.quantity}</div>
                                  </div>
                                  <strong>₹{i.totalPrice.toLocaleString('en-IN')}</strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. PRODUCT CATALOG MANAGEMENT */}
                {adminTab === 'products' && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="font-serif fw-bold mb-0">CATALOG & INVENTORY MANAGEMENT</h5>
                      <button
                        type="button"
                        className="btn btn-dark btn-sm text-uppercase fw-semibold"
                        onClick={() => setShowAddProductModal(true)}
                      >
                        + Add New Product to Catalog
                      </button>
                    </div>

                    <div className="table-responsive bg-white border">
                      <table className="table table-hover align-middle mb-0 small">
                        <thead className="table-light">
                          <tr>
                            <th>Image</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Gender / Age</th>
                            <th>Price (₹)</th>
                            <th>Total Stock</th>
                            <th>Featured</th>
                            <th>Trending</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((p) => {
                            const totalStock = p.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
                            return (
                              <tr key={p.id}>
                                <td style={{ width: '60px' }}>
                                  <img
                                    src={p.images[0]}
                                    alt={p.name}
                                    style={{ width: '48px', height: '60px', objectFit: 'cover' }}
                                  />
                                </td>
                                <td>
                                  <strong>{p.name}</strong>
                                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                    {p.variants.length} color/size variants
                                  </div>
                                </td>
                                <td>{p.categoryName}</td>
                                <td>
                                  <span className="badge bg-light text-dark border me-1">{p.gender}</span>
                                  <span className="badge bg-light text-dark border">{p.ageGroup}</span>
                                </td>
                                <td>
                                  <strong>₹{p.basePrice.toLocaleString('en-IN')}</strong>
                                  {p.mrpPrice > p.basePrice && (
                                    <div className="text-muted text-decoration-line-through">
                                      ₹{p.mrpPrice.toLocaleString('en-IN')}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <span
                                    className={`badge ${
                                      totalStock <= 5 ? 'bg-danger' : 'bg-success'
                                    }`}
                                  >
                                    {totalStock} in stock
                                  </span>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${p.isFeatured ? 'btn-dark' : 'btn-outline-secondary'}`}
                                    onClick={() => handleToggleProductFlag(p.id, 'isFeatured', p.isFeatured)}
                                  >
                                    {p.isFeatured ? 'Yes' : 'No'}
                                  </button>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${p.isTrending ? 'btn-dark' : 'btn-outline-secondary'}`}
                                    onClick={() => handleToggleProductFlag(p.id, 'isTrending', p.isTrending)}
                                  >
                                    {p.isTrending ? 'Yes' : 'No'}
                                  </button>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={async () => {
                                      if (confirm(`Deactivate product "${p.name}"?`)) {
                                        await apiRequest(`/api/admin/products/${p.id}`, { method: 'DELETE' });
                                        setProducts((prev) => prev.filter((item) => item.id !== p.id));
                                      }
                                    }}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. CUSTOMERS DATABASE */}
                {adminTab === 'customers' && (
                  <div>
                    <h5 className="font-serif fw-bold mb-4">REGISTERED CUSTOMER ACCOUNTS</h5>
                    <div className="table-responsive bg-white border">
                      <table className="table table-hover align-middle mb-0 small">
                        <thead className="table-light">
                          <tr>
                            <th>Full Name</th>
                            <th>Email</th>
                            <th>Indian Phone (+91)</th>
                            <th>Role</th>
                            <th>Orders Count</th>
                            <th>Total Lifetime Spend</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customers.map((c) => (
                            <tr key={c.id}>
                              <td className="fw-bold">{c.fullName}</td>
                              <td>{c.email}</td>
                              <td>{c.phone}</td>
                              <td>
                                <span className={`badge ${c.role === 'admin' ? 'bg-dark' : 'bg-light text-dark border'}`}>
                                  {c.role}
                                </span>
                              </td>
                              <td>{c.ordersCount} orders</td>
                              <td>
                                <strong>₹{c.totalSpent.toLocaleString('en-IN')}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 5. STORE SETTINGS & PROMO BAR */}
                {adminTab === 'settings' && (
                  <div className="card p-4 bg-white border shadow-sm" style={{ maxWidth: '680px' }}>
                    <h5 className="font-serif fw-bold mb-3">TOP PROMOTIONAL ANNOUNCEMENT BAR</h5>
                    <p className="small text-muted mb-4">
                      Customize the banner text displayed at the very top of the storefront for live sales, coupons, and free shipping rules.
                    </p>

                    <form onSubmit={handleSaveSettings}>
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-uppercase text-muted">
                          Promotional Banner Message
                        </label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={promoBarText}
                          onChange={(e) => setPromoBarText(e.target.value)}
                          required
                        />
                      </div>

                      <div className="mb-4">
                        <label className="form-label small fw-semibold text-uppercase text-muted">
                          Free Express Shipping Threshold (₹ INR)
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          value={freeShippingThreshold}
                          onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn-aura-primary px-4 py-2 text-uppercase fw-bold"
                        disabled={savingSettings}
                      >
                        {savingSettings ? 'Saving...' : 'Publish to Storefront'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ADD PRODUCT MODAL */}
      {showAddProductModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1070 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 bg-white p-4 shadow-2xl">
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <h5 className="font-serif fw-bold mb-0">Add New Fashion Product</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddProductModal(false)}
                ></button>
              </div>

              <form onSubmit={handleCreateProductSubmit} className="small">
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label fw-bold">Product Title</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      required
                      placeholder="e.g. Raw Matka Silk Bandhgala"
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold">Category</label>
                    <select
                      className="form-select form-select-sm"
                      value={newProdCategory}
                      onChange={(e) => setNewProdCategory(e.target.value)}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label fw-bold">Gender</label>
                    <select
                      className="form-select form-select-sm"
                      value={newProdGender}
                      onChange={(e) => setNewProdGender(e.target.value)}
                    >
                      <option value="women">Women</option>
                      <option value="men">Men</option>
                      <option value="kids">Kids</option>
                      <option value="baby">Baby</option>
                      <option value="unisex">Unisex</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-bold">Age Group</label>
                    <select
                      className="form-select form-select-sm"
                      value={newProdAgeGroup}
                      onChange={(e) => setNewProdAgeGroup(e.target.value)}
                    >
                      <option value="adult">Adult</option>
                      <option value="young_adult">Young Adult</option>
                      <option value="teen">Teenager</option>
                      <option value="kids">Kids</option>
                      <option value="baby">Baby</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-bold">Base Price (₹)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      required
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(Number(e.target.value))}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-bold">MRP (₹)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      required
                      value={newProdMrp}
                      onChange={(e) => setNewProdMrp(Number(e.target.value))}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-bold">Description</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      value={newProdDescription}
                      onChange={(e) => setNewProdDescription(e.target.value)}
                      placeholder="Artisanal narrative, weave texture, silhouettes..."
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Material & Fabric Care</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={newProdMaterial}
                      onChange={(e) => setNewProdMaterial(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">High-Res Image URL</label>
                    <input
                      type="url"
                      className="form-control form-control-sm"
                      required
                      value={newProdImage}
                      onChange={(e) => setNewProdImage(e.target.value)}
                    />
                  </div>

                  <div className="col-12 border-top pt-3">
                    <span className="fw-bold d-block mb-2">Variant Stock (Sizes & Quantities)</span>
                    <div className="d-flex flex-wrap gap-2">
                      {newProdVariants.map((v, i) => (
                        <div key={i} className="p-2 border bg-light d-flex align-items-center gap-2">
                          <span className="badge bg-dark">{v.size}</span>
                          <span className="text-muted">{v.colorName}</span>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            style={{ width: '70px' }}
                            value={v.stockQuantity}
                            onChange={(e) => {
                              const updated = [...newProdVariants];
                              updated[i].stockQuantity = Number(e.target.value);
                              setNewProdVariants(updated);
                            }}
                          />
                          <span className="text-muted">qty</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setShowAddProductModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-dark btn-sm text-uppercase fw-semibold px-4">
                    Publish Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
