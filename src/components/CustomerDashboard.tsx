import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useWishlist } from '../context/WishlistContext.tsx';
import { useCart } from '../context/CartContext.tsx';
import { apiRequest } from '../lib/api.ts';
import { Order } from '../server/types.ts';

interface CustomerDashboardProps {
  show: boolean;
  onClose: () => void;
  initialTab?: 'profile' | 'orders' | 'addresses' | 'wishlist' | 'notifications';
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  show,
  onClose,
  initialTab = 'orders',
}) => {
  const { user, addresses, logout, addAddress, deleteAddress } = useAuth();
  const { wishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();

  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'addresses' | 'wishlist' | 'notifications'>(
    initialTab
  );

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Cancellation Modal state
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('Changed my mind');
  const [cancelling, setCancelling] = useState(false);

  // Return / Exchange state
  const [returnModalOrder, setReturnModalOrder] = useState<Order | null>(null);
  const [returnType, setReturnType] = useState<'return' | 'exchange'>('return');
  const [returnReason, setReturnReason] = useState('Wrong size');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // New Address form in dashboard
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [houseFlat, setHouseFlat] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const data = await apiRequest<Order[]>('/api/orders');
      setOrders(data || []);
      if (data && data.length > 0 && !selectedOrder) {
        setSelectedOrder(data[0]);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await apiRequest<any[]>('/api/notifications');
      setNotifications(data || []);
    } catch {}
  };

  useEffect(() => {
    if (show) {
      setActiveTab(initialTab);
      fetchOrders();
      fetchNotifications();
    }
  }, [show, initialTab]);

  if (!show) return null;

  // Handle Cancel Order
  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    setCancelling(true);
    try {
      const res = await apiRequest<{ order: Order }>(`/api/orders/${cancelModalOrder.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason }),
      });
      // Update local state
      setOrders((prev) => prev.map((o) => (o.id === res.order.id ? res.order : o)));
      if (selectedOrder?.id === res.order.id) {
        setSelectedOrder(res.order);
      }
      setCancelModalOrder(null);
      alert('Your order has been cancelled.');
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  // Handle Return Request
  const handleConfirmReturn = async () => {
    if (!returnModalOrder) return;
    setSubmittingReturn(true);
    try {
      const res = await apiRequest<{ order: Order }>(`/api/orders/${returnModalOrder.id}/return`, {
        method: 'POST',
        body: JSON.stringify({ type: returnType, reason: returnReason }),
      });
      setOrders((prev) => prev.map((o) => (o.id === res.order.id ? res.order : o)));
      if (selectedOrder?.id === res.order.id) {
        setSelectedOrder(res.order);
      }
      setReturnModalOrder(null);
      alert(`${returnType === 'exchange' ? 'Exchange' : 'Return'} request submitted.`);
    } catch (err: any) {
      alert(err.message || 'Failed to submit return.');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleAddNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addAddress({
        fullName,
        mobile,
        houseFlat,
        street,
        area,
        landmark,
        city,
        state,
        pincode,
        isDefault: false,
      });
      setShowAddAddress(false);
      setFullName('');
      setMobile('');
      setHouseFlat('');
      setStreet('');
      setArea('');
      setCity('');
      setPincode('');
    } catch (err: any) {
      alert(err.message || 'Could not save address');
    }
  };

  const markAllNotifsRead = async () => {
    try {
      await apiRequest('/api/notifications/mark-read', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        style={{ backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1055 }}
      >
        <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-2xl overflow-hidden" style={{ minHeight: '620px' }}>
            {/* Header */}
            <div className="modal-header border-bottom py-3 px-4 bg-light">
              <div className="d-flex align-items-center gap-3">
                <span className="brand-logo text-gradient-fancy">VIVANTA</span>
                <span className="text-muted">|</span>
                <h5 className="modal-title font-serif h6 mb-0 text-uppercase fw-bold letter-spacing-1">
                  Client Portal ({user?.fullName})
                </h5>
              </div>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
            </div>

            <div className="modal-body p-0">
              <div className="row g-0 h-100">
                {/* Left Sidebar Navigation */}
                <div className="col-md-3 bg-light border-end p-3 p-md-4">
                  <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
                    <div
                      className="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center fw-bold fs-5"
                      style={{ width: '48px', height: '48px' }}
                    >
                      {user?.fullName.charAt(0) || 'A'}
                    </div>
                    <div className="overflow-hidden">
                      <h6 className="fw-bold mb-0 text-truncate">{user?.fullName}</h6>
                      <span className="small text-muted text-truncate d-block">{user?.phone}</span>
                    </div>
                  </div>

                  <div className="nav flex-column nav-pills gap-1">
                    <button
                      className={`nav-link text-start text-uppercase fw-semibold small ${
                        activeTab === 'orders' ? 'active bg-dark text-white' : 'text-dark'
                      }`}
                      onClick={() => setActiveTab('orders')}
                    >
                      <i className="bi bi-box-seam me-2"></i> My Orders ({orders.length})
                    </button>
                    <button
                      className={`nav-link text-start text-uppercase fw-semibold small ${
                        activeTab === 'profile' ? 'active bg-dark text-white' : 'text-dark'
                      }`}
                      onClick={() => setActiveTab('profile')}
                    >
                      <i className="bi bi-person me-2"></i> Account Profile
                    </button>
                    <button
                      className={`nav-link text-start text-uppercase fw-semibold small ${
                        activeTab === 'addresses' ? 'active bg-dark text-white' : 'text-dark'
                      }`}
                      onClick={() => setActiveTab('addresses')}
                    >
                      <i className="bi bi-geo-alt me-2"></i> Saved Addresses ({addresses.length})
                    </button>
                    <button
                      className={`nav-link text-start text-uppercase fw-semibold small ${
                        activeTab === 'wishlist' ? 'active bg-dark text-white' : 'text-dark'
                      }`}
                      onClick={() => setActiveTab('wishlist')}
                    >
                      <i className="bi bi-heart me-2"></i> Wishlist ({wishlist.length})
                    </button>
                    <button
                      className={`nav-link text-start text-uppercase fw-semibold small ${
                        activeTab === 'notifications' ? 'active bg-dark text-white' : 'text-dark'
                      }`}
                      onClick={() => setActiveTab('notifications')}
                    >
                      <i className="bi bi-bell me-2"></i> Notifications ({notifications.filter((n) => !n.read).length})
                    </button>
                    <div className="border-top my-3"></div>
                    <button
                      className="nav-link text-start text-uppercase fw-semibold small text-danger"
                      onClick={async () => {
                        await logout();
                        onClose();
                      }}
                    >
                      <i className="bi bi-box-arrow-right me-2"></i> Sign Out
                    </button>
                  </div>
                </div>

                {/* Right Content Area */}
                <div className="col-md-9 p-4 p-md-5 overflow-auto" style={{ maxHeight: '700px' }}>
                  {/* TAB 1: MY ORDERS */}
                  {activeTab === 'orders' && (
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                        <h4 className="font-serif fw-bold mb-0">MY ORDERS & DISPATCH TIMELINES</h4>
                        <button
                          type="button"
                          className="btn btn-outline-dark btn-sm text-uppercase fw-semibold"
                          onClick={fetchOrders}
                        >
                          <i className="bi bi-arrow-clockwise me-1"></i> Refresh
                        </button>
                      </div>

                      {loadingOrders ? (
                        <div className="text-center py-5">
                          <span className="spinner-border text-dark"></span>
                        </div>
                      ) : orders.length === 0 ? (
                        <div className="text-center py-5">
                          <i className="bi bi-bag-x display-3 text-muted mb-2 d-block"></i>
                          <h5 className="font-serif fw-bold">No Orders Placed Yet</h5>
                          <p className="text-muted small">Once you purchase a curated piece, your tracking timeline will appear here.</p>
                        </div>
                      ) : (
                        <div className="row g-4">
                          {/* Orders List */}
                          <div className="col-lg-5 d-flex flex-column gap-3">
                            {orders.map((ord) => (
                              <div
                                key={ord.id}
                                className={`card p-3 border cursor-pointer ${
                                  selectedOrder?.id === ord.id
                                    ? 'border-dark shadow-sm bg-light'
                                    : 'border-secondary-subtle'
                                }`}
                                onClick={() => setSelectedOrder(ord)}
                              >
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <span className="fw-bold small text-dark">{ord.orderNumber}</span>
                                  <span
                                    className={`badge ${
                                      ord.orderStatus === 'Delivered'
                                        ? 'bg-success'
                                        : ord.orderStatus === 'Cancelled'
                                        ? 'bg-danger'
                                        : ord.orderStatus === 'Shipped' || ord.orderStatus === 'Out for Delivery'
                                        ? 'bg-info text-dark'
                                        : 'bg-dark'
                                    }`}
                                  >
                                    {ord.orderStatus}
                                  </span>
                                </div>
                                <span className="small text-muted mb-2">
                                  {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                                <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                                  <span className="small text-muted">{ord.items.length} item(s)</span>
                                  <strong className="text-dark">₹{ord.grandTotal.toLocaleString('en-IN')}</strong>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Selected Order Details & Tracking Timeline */}
                          {selectedOrder && (
                            <div className="col-lg-7">
                              <div className="card border p-4 bg-white shadow-sm">
                                <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                                  <div>
                                    <span className="editorial-sub text-muted">ORDER TIMELINE</span>
                                    <h5 className="font-serif fw-bold mb-0">{selectedOrder.orderNumber}</h5>
                                    <span className="small text-muted">
                                      Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  <div className="text-end">
                                    <span className="small text-muted d-block">Grand Total</span>
                                    <h5 className="fw-bold text-dark mb-0">
                                      ₹{selectedOrder.grandTotal.toLocaleString('en-IN')}
                                    </h5>
                                  </div>
                                </div>

                                {/* Items Snapshot */}
                                <h6 className="fw-bold small text-uppercase mb-3">Items in this shipment</h6>
                                <div className="d-flex flex-column gap-2 mb-4">
                                  {selectedOrder.items.map((item) => (
                                    <div key={item.id} className="d-flex align-items-center gap-3 border p-2 bg-light">
                                      <img
                                        src={item.productImage}
                                        alt={item.productName}
                                        style={{ width: '48px', height: '58px', objectFit: 'cover' }}
                                      />
                                      <div className="flex-grow-1 overflow-hidden">
                                        <h6 className="small fw-bold text-truncate mb-0">{item.productName}</h6>
                                        <span className="small text-muted" style={{ fontSize: '0.75rem' }}>
                                          Color: {item.colorName} · Size: {item.size} · Qty: {item.quantity}
                                        </span>
                                      </div>
                                      <span className="fw-bold small text-dark">
                                        ₹{item.totalPrice.toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                {/* Tracking Timeline */}
                                <h6 className="fw-bold small text-uppercase mb-3">
                                  <i className="bi bi-truck me-1"></i> Live Express Tracking (BlueDart)
                                </h6>
                                <div className="tracking-timeline mb-4">
                                  {selectedOrder.timeline.map((event, idx) => (
                                    <div key={idx} className="timeline-item">
                                      <div className={`timeline-dot ${idx === selectedOrder.timeline.length - 1 ? 'active' : ''}`} />
                                      <div className="d-flex justify-content-between align-items-baseline">
                                        <h6 className="fw-bold small mb-0 text-dark">{event.status}</h6>
                                        <span className="small text-muted" style={{ fontSize: '0.75rem' }}>
                                          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                      <p className="small text-muted mb-0">{event.description}</p>
                                      {event.location && (
                                        <span className="badge bg-light text-dark border small mt-1">
                                          Hub: {event.location}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {/* Order Action Buttons: Cancel or Return */}
                                <div className="border-top pt-3 d-flex flex-wrap gap-2 justify-content-between">
                                  {/* Cancel eligible if not Shipped/Delivered/Cancelled */}
                                  {!['Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'].includes(
                                    selectedOrder.orderStatus
                                  ) && (
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger btn-sm text-uppercase fw-semibold"
                                      onClick={() => setCancelModalOrder(selectedOrder)}
                                    >
                                      <i className="bi bi-x-circle me-1"></i> Cancel Order
                                    </button>
                                  )}

                                  {/* Return/Exchange eligible if Delivered */}
                                  {selectedOrder.orderStatus === 'Delivered' && (
                                    <button
                                      type="button"
                                      className="btn btn-outline-dark btn-sm text-uppercase fw-semibold"
                                      onClick={() => setReturnModalOrder(selectedOrder)}
                                    >
                                      <i className="bi bi-arrow-left-right me-1"></i> Return or Exchange
                                    </button>
                                  )}

                                  <div className="small text-muted ms-auto">
                                    Payment: <strong>{selectedOrder.paymentMethod.toUpperCase()}</strong> ({selectedOrder.paymentStatus})
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: PROFILE */}
                  {activeTab === 'profile' && user && (
                    <div>
                      <h4 className="font-serif fw-bold mb-4 pb-2 border-bottom">MY PROFILE</h4>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label small text-muted text-uppercase fw-semibold">Full Name</label>
                          <input type="text" className="form-control" value={user.fullName} readOnly />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small text-muted text-uppercase fw-semibold">Email</label>
                          <input type="text" className="form-control" value={user.email} readOnly />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small text-muted text-uppercase fw-semibold">
                            Registered Mobile (+91)
                          </label>
                          <input type="text" className="form-control" value={user.phone} readOnly />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small text-muted text-uppercase fw-semibold">Account Status</label>
                          <div>
                            <span className="badge bg-success-subtle text-success border border-success p-2 small">
                              <i className="bi bi-patch-check-fill me-1"></i> Verified Indian Customer
                            </span>
                          </div>
                        </div>
                        <div className="col-12 mt-4">
                          <div className="alert alert-secondary small">
                            For security purposes, phone numbers and email modifications require OTP verification through our VIP concierge.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: SAVED ADDRESSES */}
                  {activeTab === 'addresses' && (
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                        <h4 className="font-serif fw-bold mb-0">SAVED DELIVERY ADDRESSES</h4>
                        <button
                          type="button"
                          className="btn btn-dark btn-sm text-uppercase fw-semibold"
                          onClick={() => setShowAddAddress(!showAddAddress)}
                        >
                          {showAddAddress ? 'Close Form' : '+ Add Address'}
                        </button>
                      </div>

                      {showAddAddress && (
                        <form onSubmit={handleAddNewAddress} className="p-3 bg-light border mb-4">
                          <h6 className="fw-bold small text-uppercase mb-3">Add New Address</h6>
                          <div className="row g-2">
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Full Name"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                              />
                            </div>
                            <div className="col-md-6">
                              <input
                                type="tel"
                                className="form-control form-control-sm"
                                placeholder="10-digit Mobile"
                                required
                                maxLength={10}
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                              />
                            </div>
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="House / Flat No."
                                required
                                value={houseFlat}
                                onChange={(e) => setHouseFlat(e.target.value)}
                              />
                            </div>
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Street / Road"
                                required
                                value={street}
                                onChange={(e) => setStreet(e.target.value)}
                              />
                            </div>
                            <div className="col-md-4">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Area"
                                required
                                value={area}
                                onChange={(e) => setArea(e.target.value)}
                              />
                            </div>
                            <div className="col-md-4">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="City"
                                required
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                              />
                            </div>
                            <div className="col-md-4">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="6-digit PIN"
                                required
                                maxLength={6}
                                value={pincode}
                                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                              />
                            </div>
                            <div className="col-12 mt-2">
                              <button type="submit" className="btn btn-dark btn-sm text-uppercase fw-semibold">
                                Save Address
                              </button>
                            </div>
                          </div>
                        </form>
                      )}

                      <div className="row g-3">
                        {addresses.map((a) => (
                          <div key={a.id} className="col-md-6">
                            <div className="card p-3 border h-100 bg-white shadow-none position-relative">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="fw-bold">{a.fullName}</span>
                                {a.isDefault && <span className="badge bg-dark small">DEFAULT</span>}
                              </div>
                              <p className="small text-muted mb-1">
                                {a.houseFlat}, {a.street}, {a.area}
                              </p>
                              <p className="small text-muted mb-2">
                                {a.city}, {a.state} - <strong>{a.pincode}</strong>
                              </p>
                              <span className="small text-dark fw-medium d-block mb-3">
                                <i className="bi bi-telephone me-1"></i> {a.mobile}
                              </span>
                              <button
                                type="button"
                                className="btn btn-link p-0 text-danger small text-decoration-none mt-auto text-start"
                                onClick={() => deleteAddress(a.id)}
                              >
                                <i className="bi bi-trash me-1"></i> Remove Address
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: WISHLIST */}
                  {activeTab === 'wishlist' && (
                    <div>
                      <h4 className="font-serif fw-bold mb-4 pb-2 border-bottom">MY WISHLIST ({wishlist.length})</h4>
                      {wishlist.length === 0 ? (
                        <div className="text-center py-5">
                          <i className="bi bi-heart display-4 text-muted mb-2 d-block"></i>
                          <h6 className="font-serif fw-bold">Your Wishlist is Empty</h6>
                          <p className="text-muted small">Save your favorite styles while browsing to review them later.</p>
                        </div>
                      ) : (
                        <div className="row g-3">
                          {wishlist.map((prod) => (
                            <div key={prod.id} className="col-sm-6 col-lg-4">
                              <div className="card border h-100 p-2 shadow-none">
                                <img
                                  src={prod.images[0]}
                                  alt={prod.name}
                                  style={{ height: '220px', objectFit: 'cover' }}
                                />
                                <div className="p-2 d-flex flex-column flex-grow-1">
                                  <h6 className="small fw-bold text-truncate mb-1">{prod.name}</h6>
                                  <span className="fw-bold small text-dark mb-2">
                                    ₹{prod.basePrice.toLocaleString('en-IN')}
                                  </span>
                                  <div className="mt-auto d-flex gap-2">
                                    <button
                                      type="button"
                                      className="btn btn-dark btn-sm flex-grow-1 text-uppercase fw-semibold"
                                      onClick={async () => {
                                        if (prod.variants[0]) {
                                          await addToCart(prod.variants[0].id, 1);
                                          await toggleWishlist(prod);
                                        }
                                      }}
                                    >
                                      Move to Bag
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger btn-sm"
                                      onClick={() => toggleWishlist(prod)}
                                      title="Remove from wishlist"
                                    >
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 5: NOTIFICATIONS */}
                  {activeTab === 'notifications' && (
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                        <h4 className="font-serif fw-bold mb-0">ACTIVITY & ORDER UPDATES</h4>
                        <button
                          type="button"
                          className="btn btn-outline-dark btn-sm text-uppercase fw-semibold"
                          onClick={markAllNotifsRead}
                        >
                          Mark All as Read
                        </button>
                      </div>

                      <div className="d-flex flex-column gap-2">
                        {notifications.length === 0 ? (
                          <div className="text-center py-5 text-muted small">No notifications yet.</div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              className={`p-3 border d-flex gap-3 align-items-start ${
                                n.read ? 'bg-white' : 'bg-light border-dark'
                              }`}
                            >
                              <i
                                className={`bi fs-5 ${
                                  n.type === 'order'
                                    ? 'bi-box-seam text-dark'
                                    : 'bi-bell-fill text-warning'
                                }`}
                              ></i>
                              <div className="flex-grow-1">
                                <div className="d-flex justify-content-between">
                                  <h6 className="small fw-bold mb-1">{n.title}</h6>
                                  <span className="small text-muted" style={{ fontSize: '0.72rem' }}>
                                    {new Date(n.createdAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                <p className="small text-muted mb-0">{n.message}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CANCEL CONFIRMATION MODAL */}
      {cancelModalOrder && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1070 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
            <div className="modal-content border-0 shadow-2xl p-4 bg-white">
              <h5 className="font-serif fw-bold mb-2">Cancel Order #{cancelModalOrder.orderNumber}?</h5>
              <p className="small text-muted mb-3">
                Are you sure you want to cancel this order? Stock will be immediately restored and any captured payment will enter the automated refund cycle.
              </p>

              <label className="form-label small fw-semibold text-uppercase text-muted">
                Please select cancellation reason:
              </label>
              <select
                className="form-select form-select-sm mb-4"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              >
                <option value="Changed my mind">Changed my mind</option>
                <option value="Ordered wrong size">Ordered wrong size</option>
                <option value="Ordered wrong product">Ordered wrong product</option>
                <option value="Found a better price">Found a better price</option>
                <option value="Delivery taking too long">Delivery taking too long</option>
                <option value="Other">Other reason</option>
              </select>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary flex-grow-1 py-2 text-uppercase fw-semibold small"
                  onClick={() => setCancelModalOrder(null)}
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  className="btn btn-danger flex-grow-1 py-2 text-uppercase fw-semibold small"
                  onClick={handleConfirmCancel}
                  disabled={cancelling}
                >
                  {cancelling ? 'Processing...' : 'YES, CANCEL ORDER'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RETURN / EXCHANGE MODAL */}
      {returnModalOrder && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1070 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
            <div className="modal-content border-0 shadow-2xl p-4 bg-white">
              <h5 className="font-serif fw-bold mb-2">Return or Exchange #{returnModalOrder.orderNumber}</h5>
              <p className="small text-muted mb-3">
                Our doorstep reverse-pickup service is provided via BlueDart Express across India.
              </p>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-uppercase text-muted">Request Type</label>
                <div className="d-flex gap-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="typeReturn"
                      checked={returnType === 'return'}
                      onChange={() => setReturnType('return')}
                    />
                    <label className="form-check-label small" htmlFor="typeReturn">Return for Refund</label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="typeExchange"
                      checked={returnType === 'exchange'}
                      onChange={() => setReturnType('exchange')}
                    />
                    <label className="form-check-label small" htmlFor="typeExchange">Exchange Size/Color</label>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold text-uppercase text-muted">Reason</label>
                <select
                  className="form-select form-select-sm"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                >
                  <option value="Wrong size">Wrong size / fit not ideal</option>
                  <option value="Damaged product">Damaged product / defect</option>
                  <option value="Wrong item received">Wrong item received</option>
                  <option value="Quality issue">Quality issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary flex-grow-1 py-2 text-uppercase fw-semibold small"
                  onClick={() => setReturnModalOrder(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-dark flex-grow-1 py-2 text-uppercase fw-semibold small"
                  onClick={handleConfirmReturn}
                  disabled={submittingReturn}
                >
                  {submittingReturn ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
