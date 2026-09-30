import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext.tsx';
import { useCart } from '../context/CartContext.tsx';
import { apiRequest } from '../lib/api.ts';
import { Address, Order } from '../server/types.ts';

interface CheckoutModalProps {
  show: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
  directBuyItem?: { variantId: string; quantity: number } | null;
}

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi NCR',
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  show,
  onClose,
  onOrderSuccess,
  directBuyItem,
}) => {
  const { user, addresses, isLoggedIn, addAddress } = useAuth();
  const { cart, refreshCart } = useCart();

  // Step 1: Account, 2: Address, 3: Review & Payment, 4: Confirmed
  const [step, setStep] = useState<number>(1);

  // Address selection
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  // New address state
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [houseFlat, setHouseFlat] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Karnataka');
  const [pincode, setPincode] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking' | 'cod'>('upi');
  const [upiId, setUpiId] = useState('user@okhdfcbank');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8912');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('842');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (show) {
      setErrorMsg(null);
      if (!isLoggedIn) {
        setStep(1);
      } else {
        setStep(2);
        if (addresses.length > 0) {
          const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
          setSelectedAddressId(defaultAddr.id);
        } else {
          setShowNewAddressForm(true);
        }
      }
    }
  }, [show, isLoggedIn, addresses]);

  if (!show) return null;

  // Handle Save New Address
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const saved = await addAddress({
        fullName,
        mobile,
        houseFlat,
        street,
        area,
        landmark,
        city,
        state,
        pincode,
        isDefault: addresses.length === 0,
      });
      setSelectedAddressId(saved.id);
      setShowNewAddressForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save address');
    }
  };

  // Submit Final Order
  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setErrorMsg('Please choose a delivery address.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // Direct buy vs cart checkout
      if (directBuyItem) {
        // Add to cart first if direct buy
        await apiRequest('/api/cart/add', {
          method: 'POST',
          body: JSON.stringify(directBuyItem),
        });
      }

      const res = await apiRequest<{ order: Order }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          addressId: selectedAddressId,
          paymentMethod,
        }),
      });

      setConfirmedOrder(res.order);
      setStep(4);
      await refreshCart();

      // Confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      onOrderSuccess(res.order);
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment or order authorization failed.');
    } finally {
      setLoading(false);
    }
  };

  const selectedAddr = addresses.find((a) => a.id === selectedAddressId);

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-2xl overflow-hidden">
          {/* Header & Steps */}
          <div className="modal-header border-bottom py-3 px-4 bg-light">
            <div>
              <span className="brand-logo text-gradient-rainbow d-block" style={{ fontSize: '1.1rem', letterSpacing: '0.18em' }}>
                RANGREZA INDIA EXPRESS CHECKOUT
              </span>
              <span className="editorial-sub text-muted">
                {step === 1
                  ? 'STEP 1: IDENTIFICATION'
                  : step === 2
                  ? 'STEP 2: INDIAN DELIVERY ADDRESS'
                  : step === 3
                  ? 'STEP 3: PAYMENT & SUMMARY'
                  : 'ORDER CONFIRMED'}
              </span>
            </div>
            {step !== 4 && (
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
            )}
          </div>

          <div className="modal-body p-4 bg-white">
            {errorMsg && (
              <div className="alert alert-danger py-2 small mb-3">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {errorMsg}
              </div>
            )}

            {/* STEP 1: AUTHENTICATION CHECK */}
            {step === 1 && (
              <div className="text-center py-4">
                <i className="bi bi-person-lock display-4 text-dark mb-3 d-block"></i>
                <h5 className="font-serif fw-bold">Sign In or Create Account to Continue</h5>
                <p className="text-muted small px-md-5 mb-4">
                  Sign in with your verified email/phone to access saved Indian addresses and live BlueDart tracking.
                </p>

                <div className="d-flex flex-column gap-2 max-w-sm mx-auto" style={{ maxWidth: '320px' }}>
                  <button
                    type="button"
                    className="btn btn-fancy-vibrant py-3 text-uppercase fw-bold rounded-pill shadow"
                    onClick={() => {
                      onClose();
                      window.dispatchEvent(new CustomEvent('open-auth-modal'));
                    }}
                  >
                    Login / Create Account
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: DELIVERY ADDRESS */}
            {step === 2 && (
              <div>
                <h5 className="font-serif fw-bold mb-3">Where should we deliver your order?</h5>

                {/* Existing Saved Addresses */}
                {addresses.length > 0 && !showNewAddressForm && (
                  <div className="mb-4">
                    <div className="row g-3">
                      {addresses.map((addr) => (
                        <div key={addr.id} className="col-12 col-md-6">
                          <div
                            className={`card p-3 cursor-pointer h-100 border ${
                              selectedAddressId === addr.id
                                ? 'border-dark bg-light shadow-sm'
                                : 'border-secondary-subtle'
                            }`}
                            onClick={() => setSelectedAddressId(addr.id)}
                          >
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className="fw-bold small">{addr.fullName}</span>
                              <input
                                type="radio"
                                className="form-check-input"
                                checked={selectedAddressId === addr.id}
                                onChange={() => setSelectedAddressId(addr.id)}
                              />
                            </div>
                            <p className="small text-muted mb-1">
                              {addr.houseFlat}, {addr.street}, {addr.area}
                            </p>
                            <p className="small text-muted mb-1">
                              {addr.city}, {addr.state} - <strong>{addr.pincode}</strong>
                            </p>
                            <span className="small text-dark fw-medium">
                              <i className="bi bi-telephone me-1"></i> {addr.mobile}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline-dark btn-sm mt-3 text-uppercase fw-semibold"
                      onClick={() => setShowNewAddressForm(true)}
                    >
                      + Add New Delivery Address
                    </button>
                  </div>
                )}

                {/* New Address Form */}
                {(showNewAddressForm || addresses.length === 0) && (
                  <form onSubmit={handleSaveAddress} className="p-3 bg-light border mb-3">
                    <h6 className="fw-bold small text-uppercase mb-3">Add New Indian Delivery Address</h6>
                    <div className="row g-2">
                      <div className="col-md-6">
                        <label className="form-label small mb-1">Full Name</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small mb-1">Mobile Number (10 digits)</label>
                        <input
                          type="tel"
                          className="form-control form-control-sm"
                          required
                          maxLength={10}
                          placeholder="9876543210"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small mb-1">Flat / House No. / Building</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          required
                          value={houseFlat}
                          onChange={(e) => setHouseFlat(e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small mb-1">Street / Colony</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          required
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small mb-1">Area / Locality</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          required
                          value={area}
                          onChange={(e) => setArea(e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small mb-1">Landmark (Optional)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small mb-1">City</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small mb-1">State</label>
                        <select
                          className="form-select form-select-sm"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                        >
                          {INDIAN_STATES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small mb-1">PIN Code (6 digits)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          required
                          maxLength={6}
                          placeholder="e.g. 560038"
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                      <div className="col-12 mt-3 d-flex gap-2">
                        <button type="submit" className="btn btn-dark btn-sm text-uppercase fw-semibold px-4">
                          Save Address
                        </button>
                        {addresses.length > 0 && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => setShowNewAddressForm(false)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </form>
                )}

                <div className="d-flex justify-content-end mt-4">
                  <button
                    type="button"
                    className="btn-aura-primary px-5 py-2 text-uppercase fw-bold"
                    disabled={!selectedAddressId}
                    onClick={() => setStep(3)}
                  >
                    Proceed to Payment <i className="bi bi-arrow-right ms-1"></i>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PAYMENT & SUMMARY */}
            {step === 3 && (
              <div className="row g-4">
                {/* Left: Payment Method Selection */}
                <div className="col-md-7">
                  <h6 className="font-serif fw-bold mb-3">SELECT PAYMENT METHOD</h6>

                  <div className="d-flex flex-column gap-3 mb-4">
                    {/* UPI Option */}
                    <div
                      className={`card p-3 border cursor-pointer ${
                        paymentMethod === 'upi' ? 'border-dark bg-light' : 'border-secondary-subtle'
                      }`}
                      onClick={() => setPaymentMethod('upi')}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-qr-code text-dark fs-5"></i>
                          <span className="fw-bold small">Instant UPI (GPay, PhonePe, Paytm, BHIM)</span>
                        </div>
                        <input
                          type="radio"
                          className="form-check-input"
                          checked={paymentMethod === 'upi'}
                          onChange={() => setPaymentMethod('upi')}
                        />
                      </div>
                      {paymentMethod === 'upi' && (
                        <div className="mt-3 pt-2 border-top">
                          <label className="form-label small mb-1 text-muted">Enter UPI Virtual Payment Address (VPA)</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="mobile@upi or id@okhdfcbank"
                          />
                          <span className="small text-success mt-1 d-block">
                            <i className="bi bi-shield-check me-1"></i>Instant 0% transaction fee via NPCI Unified Payments Interface
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Credit/Debit Card */}
                    <div
                      className={`card p-3 border cursor-pointer ${
                        paymentMethod === 'card' ? 'border-dark bg-light' : 'border-secondary-subtle'
                      }`}
                      onClick={() => setPaymentMethod('card')}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-credit-card text-dark fs-5"></i>
                          <span className="fw-bold small">Credit / Debit Card (Visa, Mastercard, RuPay)</span>
                        </div>
                        <input
                          type="radio"
                          className="form-check-input"
                          checked={paymentMethod === 'card'}
                          onChange={() => setPaymentMethod('card')}
                        />
                      </div>
                      {paymentMethod === 'card' && (
                        <div className="mt-3 pt-2 border-top row g-2">
                          <div className="col-12">
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Card Number"
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value)}
                            />
                          </div>
                          <div className="col-6">
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="MM/YY"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                            />
                          </div>
                          <div className="col-6">
                            <input
                              type="password"
                              className="form-control form-control-sm"
                              placeholder="CVV"
                              maxLength={3}
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Net Banking */}
                    <div
                      className={`card p-3 border cursor-pointer ${
                        paymentMethod === 'netbanking' ? 'border-dark bg-light' : 'border-secondary-subtle'
                      }`}
                      onClick={() => setPaymentMethod('netbanking')}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-bank text-dark fs-5"></i>
                          <span className="fw-bold small">Net Banking (HDFC, SBI, ICICI, Axis)</span>
                        </div>
                        <input
                          type="radio"
                          className="form-check-input"
                          checked={paymentMethod === 'netbanking'}
                          onChange={() => setPaymentMethod('netbanking')}
                        />
                      </div>
                    </div>

                    {/* Cash on Delivery */}
                    <div
                      className={`card p-3 border cursor-pointer ${
                        paymentMethod === 'cod' ? 'border-dark bg-light' : 'border-secondary-subtle'
                      }`}
                      onClick={() => setPaymentMethod('cod')}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-cash-stack text-dark fs-5"></i>
                          <span className="fw-bold small">Cash on Delivery (Pay at Doorstep)</span>
                        </div>
                        <input
                          type="radio"
                          className="form-check-input"
                          checked={paymentMethod === 'cod'}
                          onChange={() => setPaymentMethod('cod')}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Back button */}
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setStep(2)}
                  >
                    ← Change Delivery Address
                  </button>
                </div>

                {/* Right: Order Summary Breakdown */}
                <div className="col-md-5">
                  <div className="p-3 bg-light border">
                    <h6 className="font-serif fw-bold mb-3 border-bottom pb-2">ORDER SNAPSHOT</h6>

                    {/* Delivery summary */}
                    {selectedAddr && (
                      <div className="mb-3 small">
                        <span className="editorial-sub text-muted d-block">DELIVERING TO</span>
                        <strong>{selectedAddr.fullName}</strong>
                        <p className="text-muted mb-0">
                          {selectedAddr.houseFlat}, {selectedAddr.street}, {selectedAddr.city} - {selectedAddr.pincode}
                        </p>
                      </div>
                    )}

                    {/* Price list */}
                    <div className="d-flex flex-column gap-1 small mb-3 border-top pt-2">
                      <div className="d-flex justify-content-between text-muted">
                        <span>Items Subtotal</span>
                        <span>₹{cart.subtotal.toLocaleString('en-IN')}</span>
                      </div>
                      {cart.discount > 0 && (
                        <div className="d-flex justify-content-between text-success">
                          <span>Promo Discount</span>
                          <span>-₹{cart.discount.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="d-flex justify-content-between text-muted">
                        <span>Express Courier (BlueDart)</span>
                        <span>{cart.shippingFee === 0 ? <strong className="text-success">FREE</strong> : `₹${cart.shippingFee}`}</span>
                      </div>
                      <div className="d-flex justify-content-between text-muted">
                        <span>Apparel GST (5%)</span>
                        <span>₹{cart.tax.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="d-flex justify-content-between fw-bold text-dark border-top pt-2 mt-1 h5 mb-0">
                        <span>Grand Total</span>
                        <span>₹{cart.grandTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-aura-primary w-100 py-3 text-uppercase fw-bold shadow-sm"
                      onClick={handlePlaceOrder}
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="spinner-border spinner-border-sm me-2"></span>
                      ) : (
                        <i className="bi bi-lock-fill me-2"></i>
                      )}
                      AUTHORIZE & PAY ₹{cart.grandTotal.toLocaleString('en-IN')}
                    </button>
                    <p className="text-muted small text-center mt-2 mb-0" style={{ fontSize: '0.72rem' }}>
                      256-bit encrypted checkout with server-side inventory reservation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: ORDER CONFIRMED */}
            {step === 4 && confirmedOrder && (
              <div className="text-center py-4">
                <div
                  className="rounded-circle bg-success text-white d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width: '64px', height: '64px' }}
                >
                  <i className="bi bi-check2 fs-1"></i>
                </div>

                <span className="editorial-sub text-success d-block fw-bold">PAYMENT AUTHORIZED & INVENTORY RESERVED</span>
                <h2 className="font-serif display-6 fw-bold mb-2">ORDER CONFIRMED.</h2>
                <p className="text-muted mb-4">
                  Thank you, <strong>{user?.fullName}</strong>. Your artisanal order has been routed to our Mumbai studio for packaging.
                </p>

                {/* Details box */}
                <div className="p-4 bg-light border text-start mx-auto mb-4" style={{ maxWidth: '580px' }}>
                  <div className="row g-2 small">
                    <div className="col-6">
                      <span className="text-muted d-block">Order Reference:</span>
                      <strong className="text-dark fs-6">{confirmedOrder.orderNumber}</strong>
                    </div>
                    <div className="col-6 text-end">
                      <span className="text-muted d-block">Total Paid:</span>
                      <strong className="text-dark fs-6">₹{confirmedOrder.grandTotal.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="col-12 border-top pt-2 mt-2">
                      <span className="text-muted d-block">Estimated BlueDart Express Delivery:</span>
                      <strong>2-3 Business Days to PIN {confirmedOrder.shippingAddress.pincode}</strong>
                    </div>
                    <div className="col-12 mt-2">
                      <span className="text-muted d-block">Delivery Address:</span>
                      <span>
                        {confirmedOrder.shippingAddress.fullName}, {confirmedOrder.shippingAddress.houseFlat},{' '}
                        {confirmedOrder.shippingAddress.street}, {confirmedOrder.shippingAddress.city},{' '}
                        {confirmedOrder.shippingAddress.state} - {confirmedOrder.shippingAddress.pincode}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="d-flex flex-wrap justify-content-center gap-3">
                  <button
                    type="button"
                    className="btn btn-outline-dark px-4 py-2 text-uppercase fw-semibold"
                    onClick={() => {
                      onClose();
                      window.dispatchEvent(new CustomEvent('open-customer-dashboard', { detail: { tab: 'orders' } }));
                    }}
                  >
                    Track Order Timeline
                  </button>
                  <button
                    type="button"
                    className="btn-aura-primary px-4 py-2 text-uppercase"
                    onClick={onClose}
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
