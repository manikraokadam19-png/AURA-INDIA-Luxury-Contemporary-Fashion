import { Router, Response } from 'express';
import { getDb, commitDb } from './db.ts';
import {
  AuthenticatedRequest,
  requireAuth,
  requireAdmin,
  optionalAuth,
  hashPassword,
  comparePassword,
  signToken,
  validateIndianMobile,
  normalizePhone,
  validatePasswordRules,
  createOrUpdateOtp,
  verifyOtpRecord,
} from './auth.ts';
import { Order, OrderItem, TimelineEvent, Address, Product, ProductVariant } from './types.ts';

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION & OTP
// ==========================================

// Signup
apiRouter.post('/auth/signup', (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ error: 'Please provide full name, email, Indian mobile number, and password.' });
    }

    const emailClean = email.trim().toLowerCase();
    const phoneClean = normalizePhone(phone);

    if (!validateIndianMobile(phone)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number (+91).' });
    }

    const pwdCheck = validatePasswordRules(password);
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.message });
    }

    const db = getDb();

    // Check duplicate account
    const existing = db.users.find(
      (u) => u.email.toLowerCase() === emailClean || normalizePhone(u.phone) === phoneClean
    );

    if (existing) {
      return res.status(409).json({
        error: 'User already exists. Please log in.',
        duplicate: true,
        identifier: existing.email || existing.phone,
      });
    }

    // Create user
    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fullName: fullName.trim(),
      email: emailClean,
      phone: phoneClean,
      passwordHash: hashPassword(password),
      isVerified: false,
      role: 'customer' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    commitDb();

    // Dispatch real OTP with 60s cooldown
    const otpResult = createOrUpdateOtp(phoneClean, 'signup');

    return res.status(201).json({
      message: 'Account created. Please enter the 6-digit OTP sent to your registered mobile number.',
      userId: newUser.id,
      phone: phoneClean,
      resendInSeconds: otpResult.resendInSeconds,
      // In dev mode/test env, expose otp hint for seamless testing if needed
      devOtpHint: otpResult.otp,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Signup failed' });
  }
});

// Verify OTP
apiRouter.post('/auth/verify-otp', (req, res) => {
  try {
    const { identifier, otp, purpose = 'signup' } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({ error: 'Mobile/email and 6-digit OTP code are required.' });
    }

    const result = verifyOtpRecord(identifier, otp, purpose);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    const db = getDb();
    const cleanId = identifier.trim().toLowerCase();
    const normPhone = normalizePhone(identifier);

    const user = db.users.find((u) => u.email.toLowerCase() === cleanId || normalizePhone(u.phone) === normPhone);

    if (user) {
      user.isVerified = true;
      user.updatedAt = new Date().toISOString();
      commitDb();

      const token = signToken(user);

      // Set HttpOnly cookie
      res.cookie('aura_auth_token', token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      });

      return res.json({
        message: 'Account verified successfully!',
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      });
    }

    return res.json({ message: 'OTP verified successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'OTP verification failed' });
  }
});

// Resend OTP (with strict 60s cooldown)
apiRouter.post('/auth/resend-otp', (req, res) => {
  try {
    const { identifier, purpose = 'signup' } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Identifier (phone/email) is required.' });
    }

    const normId = normalizePhone(identifier);
    const result = createOrUpdateOtp(normId, purpose);

    if (result.error) {
      return res.status(429).json({ error: result.error, resendInSeconds: result.resendInSeconds });
    }

    return res.json({
      message: 'New OTP sent to your registered mobile number.',
      resendInSeconds: result.resendInSeconds,
      devOtpHint: result.otp,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Could not resend OTP' });
  }
});

// Login
apiRouter.post('/auth/login', (req, res) => {
  try {
    const { loginId, password } = req.body; // loginId can be email or phone

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Please enter your email/phone and password.' });
    }

    const clean = loginId.trim().toLowerCase();
    const cleanPhone = normalizePhone(loginId);
    const db = getDb();

    const user = db.users.find(
      (u) => u.email.toLowerCase() === clean || normalizePhone(u.phone) === cleanPhone
    );

    if (!user) {
      return res.status(404).json({ error: 'Account not found. Please create an account.' });
    }

    if (!comparePassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Enter the valid password or enter correct password to continue your shopping.' });
    }

    // Generate JWT
    const token = signToken(user);

    res.cookie('aura_auth_token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    return res.json({
      message: 'Welcome back!',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Forgot Password - Step 1: Request OTP
apiRouter.post('/auth/forgot-password/request', (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Please enter your registered email or Indian mobile number.' });
    }

    const clean = identifier.trim().toLowerCase();
    const cleanPhone = normalizePhone(identifier);
    const db = getDb();

    const user = db.users.find(
      (u) => u.email.toLowerCase() === clean || normalizePhone(u.phone) === cleanPhone
    );

    if (!user) {
      return res.status(404).json({ error: 'No account registered with this email or mobile number.' });
    }

    const targetPhone = user.phone;
    const otpResult = createOrUpdateOtp(targetPhone, 'forgot_password');

    if (otpResult.error) {
      return res.status(429).json({ error: otpResult.error, resendInSeconds: otpResult.resendInSeconds });
    }

    return res.json({
      message: `A 6-digit password reset OTP has been sent to ${targetPhone.replace(/.(?=.{4})/g, '*')}`,
      phone: targetPhone,
      resendInSeconds: otpResult.resendInSeconds,
      devOtpHint: otpResult.otp,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Password reset request failed' });
  }
});

// Forgot Password - Step 2: Verify & Update
apiRouter.post('/auth/forgot-password/reset', (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body;

    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ error: 'Identifier, OTP code, and new password are required.' });
    }

    const pwdCheck = validatePasswordRules(newPassword);
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.message });
    }

    const result = verifyOtpRecord(identifier, otp, 'forgot_password');
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    const db = getDb();
    const clean = identifier.trim().toLowerCase();
    const cleanPhone = normalizePhone(identifier);

    const user = db.users.find(
      (u) => u.email.toLowerCase() === clean || normalizePhone(u.phone) === cleanPhone
    );

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    user.passwordHash = hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();
    commitDb();

    return res.json({ message: 'Password changed successfully! You can now log in.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Password reset failed' });
  }
});

// Current User Details
apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const db = getDb();
  const addresses = db.addresses.filter((a) => a.userId === user.id);
  const userOrders = db.orders.filter((o) => o.userId === user.id);

  return res.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    },
    addresses,
    ordersCount: userOrders.length,
    wishlistCount: (db.wishlists[user.id] || []).length,
  });
});

// Logout
apiRouter.post('/auth/logout', (_req, res) => {
  res.clearCookie('aura_auth_token');
  return res.json({ message: 'Logged out successfully.' });
});

// ==========================================
// 2. PRODUCTS & CATALOG
// ==========================================

apiRouter.get('/products', (req, res) => {
  try {
    const db = getDb();
    let list = [...db.products];

    const {
      gender,
      ageGroup,
      category,
      collection,
      featured,
      trending,
      search,
      minPrice,
      maxPrice,
      size,
      color,
      sort,
    } = req.query;

    if (gender && gender !== 'all') {
      list = list.filter((p) => p.gender === gender || p.gender === 'unisex');
    }

    if (ageGroup && ageGroup !== 'all') {
      list = list.filter((p) => p.ageGroup === ageGroup);
    }

    if (category && category !== 'all') {
      list = list.filter(
        (p) => p.categoryId === category || p.categoryName.toLowerCase().includes((category as string).toLowerCase())
      );
    }

    if (collection && collection !== 'all') {
      list = list.filter((p) => p.collection === collection);
    }

    if (featured === 'true') {
      list = list.filter((p) => p.isFeatured);
    }

    if (trending === 'true') {
      list = list.filter((p) => p.isTrending);
    }

    if (minPrice) {
      list = list.filter((p) => p.basePrice >= Number(minPrice));
    }

    if (maxPrice) {
      list = list.filter((p) => p.basePrice <= Number(maxPrice));
    }

    if (size) {
      const targetSize = (size as string).toUpperCase();
      list = list.filter((p) => p.variants.some((v) => v.size.toUpperCase() === targetSize && v.stockQuantity > 0));
    }

    if (color) {
      const targetColor = (color as string).toLowerCase();
      list = list.filter((p) =>
        p.variants.some((v) => v.colorName.toLowerCase().includes(targetColor))
      );
    }

    if (search) {
      const q = (search as string).toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.material.toLowerCase().includes(q) ||
          p.variants.some((v) => v.sku.toLowerCase().includes(q) || v.colorName.toLowerCase().includes(q))
      );
    }

    // Sorting
    switch (sort) {
      case 'price-low':
        list.sort((a, b) => a.basePrice - b.basePrice);
        break;
      case 'price-high':
        list.sort((a, b) => b.basePrice - a.basePrice);
        break;
      case 'newest':
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'discount':
        list.sort((a, b) => b.discountPercent - a.discountPercent);
        break;
      case 'popular':
      default:
        list.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
    }

    return res.json({
      total: list.length,
      products: list,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch products' });
  }
});

// Single Product Details
apiRouter.get('/products/:id', (req, res) => {
  try {
    const db = getDb();
    const product = db.products.find((p) => p.id === req.params.id || p.slug === req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const reviews = db.reviews.filter((r) => r.productId === product.id);

    return res.json({
      product,
      reviews,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch product' });
  }
});

// Categories
apiRouter.get('/categories', (_req, res) => {
  const db = getDb();
  return res.json(db.categories);
});

// Lookbooks ("Shop the Look")
apiRouter.get('/lookbooks', (_req, res) => {
  const db = getDb();
  // enrich with products
  const enriched = db.lookbooks.map((l) => {
    const products = db.products.filter((p) => l.productIds.includes(p.id));
    return { ...l, products };
  });
  return res.json(enriched);
});

// Site Settings & Promo Bar
apiRouter.get('/settings', (_req, res) => {
  const db = getDb();
  return res.json(db.siteSettings);
});

// ==========================================
// 3. CART & WISHLIST
// ==========================================

function getCartSessionKey(req: AuthenticatedRequest): string {
  if (req.user) return req.user.id;
  const guestHeader = req.headers['x-guest-session-id'] as string;
  return guestHeader || 'guest_default';
}

// Get Cart
apiRouter.get('/cart', optionalAuth, (req: AuthenticatedRequest, res) => {
  try {
    const db = getDb();
    const cartKey = getCartSessionKey(req);
    const items = db.carts[cartKey] || [];

    const enriched: any[] = [];
    let subtotal = 0;
    let mrpTotal = 0;

    for (const item of items) {
      // Find variant across all products
      for (const prod of db.products) {
        const variant = prod.variants.find((v) => v.id === item.variantId);
        if (variant) {
          const unitPrice = variant.priceOverride || prod.basePrice;
          const mrp = prod.mrpPrice;
          subtotal += unitPrice * item.quantity;
          mrpTotal += mrp * item.quantity;

          enriched.push({
            id: item.variantId,
            variantId: item.variantId,
            productId: prod.id,
            productName: prod.name,
            productImage: variant.imageUrl || prod.images[0],
            colorName: variant.colorName,
            colorHex: variant.colorHex,
            size: variant.size,
            quantity: item.quantity,
            unitPrice,
            mrpPrice: mrp,
            stockAvailable: variant.stockQuantity,
            isOutOfStock: variant.stockQuantity <= 0,
          });
          break;
        }
      }
    }

    const discount = mrpTotal > subtotal ? mrpTotal - subtotal : 0;
    const freeShipping = subtotal >= db.siteSettings.freeShippingThreshold;
    const shippingFee = subtotal > 0 && !freeShipping ? db.siteSettings.standardShippingFee : 0;
    const tax = Math.round(subtotal * 0.05); // 5% GST on apparel
    const grandTotal = subtotal + shippingFee + tax;

    return res.json({
      items: enriched,
      subtotal,
      mrpTotal,
      discount,
      shippingFee,
      freeShippingThreshold: db.siteSettings.freeShippingThreshold,
      tax,
      grandTotal,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Cart error' });
  }
});

// Add to Cart
apiRouter.post('/cart/add', optionalAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { variantId, quantity = 1 } = req.body;
    if (!variantId) {
      return res.status(400).json({ error: 'Variant ID is required.' });
    }

    const db = getDb();
    // Validate stock
    let foundVariant: ProductVariant | undefined;
    for (const p of db.products) {
      const v = p.variants.find((va) => va.id === variantId);
      if (v) {
        foundVariant = v;
        break;
      }
    }

    if (!foundVariant) {
      return res.status(404).json({ error: 'Product variant not found.' });
    }

    if (foundVariant.stockQuantity < quantity) {
      return res.status(400).json({
        error: `Only ${foundVariant.stockQuantity} item(s) left in stock for size ${foundVariant.size}.`,
      });
    }

    const cartKey = getCartSessionKey(req);
    if (!db.carts[cartKey]) {
      db.carts[cartKey] = [];
    }

    const existingIndex = db.carts[cartKey].findIndex((i) => i.variantId === variantId);
    if (existingIndex > -1) {
      const newQty = db.carts[cartKey][existingIndex].quantity + quantity;
      if (newQty > foundVariant.stockQuantity) {
        return res.status(400).json({
          error: `Cannot add more. Only ${foundVariant.stockQuantity} items in stock.`,
        });
      }
      db.carts[cartKey][existingIndex].quantity = newQty;
    } else {
      db.carts[cartKey].push({ variantId, quantity });
    }

    commitDb();
    return res.json({ message: 'Added to cart successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Could not add to cart' });
  }
});

// Update Cart Quantity
apiRouter.post('/cart/update', optionalAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { variantId, quantity } = req.body;
    const db = getDb();
    const cartKey = getCartSessionKey(req);

    if (!db.carts[cartKey]) {
      return res.status(404).json({ error: 'Cart is empty' });
    }

    if (quantity <= 0) {
      db.carts[cartKey] = db.carts[cartKey].filter((i) => i.variantId !== variantId);
      commitDb();
      return res.json({ message: 'Item removed from cart.' });
    }

    // Verify stock
    for (const p of db.products) {
      const v = p.variants.find((va) => va.id === variantId);
      if (v) {
        if (quantity > v.stockQuantity) {
          return res.status(400).json({
            error: `Only ${v.stockQuantity} items available in stock.`,
          });
        }
        break;
      }
    }

    const item = db.carts[cartKey].find((i) => i.variantId === variantId);
    if (item) {
      item.quantity = quantity;
      commitDb();
    }

    return res.json({ message: 'Cart updated.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update cart' });
  }
});

// Remove item from Cart
apiRouter.post('/cart/remove', optionalAuth, (req: AuthenticatedRequest, res) => {
  const { variantId } = req.body;
  const db = getDb();
  const cartKey = getCartSessionKey(req);

  if (db.carts[cartKey]) {
    db.carts[cartKey] = db.carts[cartKey].filter((i) => i.variantId !== variantId);
    commitDb();
  }

  return res.json({ message: 'Item removed from cart.' });
});

// Merge Guest Cart into User Cart on Login
apiRouter.post('/cart/merge', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { guestSessionId } = req.body;
    if (!guestSessionId) return res.json({ message: 'No guest cart to merge.' });

    const db = getDb();
    const guestItems = db.carts[guestSessionId] || [];
    if (guestItems.length === 0) return res.json({ message: 'No guest items.' });

    const userKey = req.user!.id;
    if (!db.carts[userKey]) db.carts[userKey] = [];

    for (const gItem of guestItems) {
      const userItem = db.carts[userKey].find((i) => i.variantId === gItem.variantId);
      if (userItem) {
        userItem.quantity += gItem.quantity;
      } else {
        db.carts[userKey].push(gItem);
      }
    }

    delete db.carts[guestSessionId];
    commitDb();
    return res.json({ message: 'Guest cart successfully merged.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Cart merge error' });
  }
});

// Wishlist Endpoints
apiRouter.get('/wishlist', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const ids = db.wishlists[req.user!.id] || [];
  const products = db.products.filter((p) => ids.includes(p.id));
  return res.json({ items: products });
});

apiRouter.post('/wishlist/toggle', requireAuth, (req: AuthenticatedRequest, res) => {
  const { productId } = req.body;
  const db = getDb();
  const userId = req.user!.id;

  if (!db.wishlists[userId]) db.wishlists[userId] = [];

  const index = db.wishlists[userId].indexOf(productId);
  let added = false;
  if (index > -1) {
    db.wishlists[userId].splice(index, 1);
  } else {
    db.wishlists[userId].push(productId);
    added = true;
  }
  commitDb();

  return res.json({
    added,
    message: added ? 'Added to wishlist' : 'Removed from wishlist',
    count: db.wishlists[userId].length,
  });
});

// ==========================================
// 4. ADDRESSES (INDIAN E-COMMERCE SPEC)
// ==========================================

apiRouter.get('/addresses', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const list = db.addresses.filter((a) => a.userId === req.user!.id);
  return res.json(list);
});

apiRouter.post('/addresses', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { fullName, mobile, houseFlat, street, area, landmark, city, state, pincode, isDefault } = req.body;

    if (!fullName || !mobile || !houseFlat || !street || !area || !city || !state || !pincode) {
      return res.status(400).json({ error: 'All primary address fields are required.' });
    }

    if (!validateIndianMobile(mobile)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit Indian PIN code.' });
    }

    const db = getDb();
    const userId = req.user!.id;

    if (isDefault) {
      db.addresses.filter((a) => a.userId === userId).forEach((a) => (a.isDefault = false));
    }

    const newAddress: Address = {
      id: `addr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      fullName: fullName.trim(),
      mobile: normalizePhone(mobile),
      houseFlat: houseFlat.trim(),
      street: street.trim(),
      area: area.trim(),
      landmark: landmark ? landmark.trim() : '',
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      isDefault: Boolean(isDefault),
      createdAt: new Date().toISOString(),
    };

    db.addresses.push(newAddress);
    commitDb();

    return res.status(201).json(newAddress);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Address save failed' });
  }
});

apiRouter.delete('/addresses/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  db.addresses = db.addresses.filter((a) => a.id !== req.params.id || a.userId !== req.user!.id);
  commitDb();
  return res.json({ message: 'Address deleted.' });
});

// ==========================================
// 5. ORDERS & CHECKOUT (ATOMIC INVENTORY & REAL TRACKING)
// ==========================================

apiRouter.post('/orders', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { addressId, paymentMethod, newAddressData } = req.body;
    const db = getDb();
    const user = req.user!;

    // Resolve address
    let shippingAddress: Address | undefined;
    if (addressId) {
      shippingAddress = db.addresses.find((a) => a.id === addressId && a.userId === user.id);
    } else if (newAddressData) {
      shippingAddress = {
        id: `addr_${Date.now()}`,
        userId: user.id,
        fullName: newAddressData.fullName,
        mobile: normalizePhone(newAddressData.mobile),
        houseFlat: newAddressData.houseFlat,
        street: newAddressData.street,
        area: newAddressData.area,
        landmark: newAddressData.landmark || '',
        city: newAddressData.city,
        state: newAddressData.state,
        pincode: newAddressData.pincode,
        isDefault: false,
        createdAt: new Date().toISOString(),
      };
      db.addresses.push(shippingAddress);
    }

    if (!shippingAddress) {
      return res.status(400).json({ error: 'Please select or provide a valid shipping address.' });
    }

    const cartItems = db.carts[user.id] || [];
    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty. Add items before placing an order.' });
    }

    // Server-side inventory check & lock
    const orderItems: OrderItem[] = [];
    let subtotal = 0;

    for (const item of cartItems) {
      let foundVariant: ProductVariant | undefined;
      let parentProduct: Product | undefined;

      for (const p of db.products) {
        const v = p.variants.find((va) => va.id === item.variantId);
        if (v) {
          foundVariant = v;
          parentProduct = p;
          break;
        }
      }

      if (!foundVariant || !parentProduct) {
        return res.status(400).json({ error: 'One or more items in your cart are no longer available.' });
      }

      if (foundVariant.stockQuantity < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for "${parentProduct.name}" (${foundVariant.colorName}, ${foundVariant.size}). Only ${foundVariant.stockQuantity} remaining.`,
        });
      }

      const unitPrice = foundVariant.priceOverride || parentProduct.basePrice;
      const totalItemPrice = unitPrice * item.quantity;
      subtotal += totalItemPrice;

      orderItems.push({
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        productId: parentProduct.id,
        variantId: foundVariant.id,
        productName: parentProduct.name,
        productImage: foundVariant.imageUrl || parentProduct.images[0],
        size: foundVariant.size,
        colorName: foundVariant.colorName,
        quantity: item.quantity,
        unitPrice,
        totalPrice: totalItemPrice,
      });
    }

    // Atomic stock reduction
    for (const item of cartItems) {
      for (const p of db.products) {
        const v = p.variants.find((va) => va.id === item.variantId);
        if (v) {
          v.stockQuantity -= item.quantity;
          break;
        }
      }
    }

    const freeShipping = subtotal >= db.siteSettings.freeShippingThreshold;
    const shippingFee = freeShipping ? 0 : db.siteSettings.standardShippingFee;
    const discount = subtotal >= 2500 ? Math.round(subtotal * 0.1) : 0; // 10% seasonal discount on cart >= 2500
    const tax = Math.round((subtotal - discount) * 0.05); // 5% GST
    const grandTotal = subtotal - discount + shippingFee + tax;

    const orderNumber = `AURA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      orderNumber,
      userId: user.id,
      userEmail: user.email,
      userPhone: user.phone,
      items: orderItems,
      shippingAddress,
      subtotal,
      discount,
      shippingFee,
      tax,
      grandTotal,
      paymentMethod: paymentMethod || 'upi',
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'captured',
      paymentId: `pay_aura_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orderStatus: 'Confirmed',
      timeline: [
        {
          status: 'Order Placed',
          timestamp: new Date().toISOString(),
          description: `Order successfully placed via ${paymentMethod ? paymentMethod.toUpperCase() : 'UPI'}`,
        },
        {
          status: 'Confirmed',
          timestamp: new Date(Date.now() + 1000).toISOString(),
          description: 'Payment authorized and order confirmed by AURA INDIA Central Studio Mumbai',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.orders.unshift(newOrder);

    // Clear user cart
    db.carts[user.id] = [];

    // Create confirmation notification
    db.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId: user.id,
      title: 'Order Confirmed!',
      message: `Your order #${orderNumber} for ₹${grandTotal.toLocaleString('en-IN')} has been confirmed.`,
      type: 'order',
      read: false,
      createdAt: new Date().toISOString(),
    });

    commitDb();

    return res.status(201).json({
      message: 'Order placed successfully!',
      order: newOrder,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Order creation failed' });
  }
});

// Get User Orders
apiRouter.get('/orders', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const list = db.orders.filter((o) => o.userId === req.user!.id);
  return res.json(list);
});

// Single Order Detail & Tracking
apiRouter.get('/orders/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const order = db.orders.find(
    (o) => (o.id === req.params.id || o.orderNumber === req.params.id) && (o.userId === req.user!.id || req.user!.role === 'admin')
  );

  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  return res.json(order);
});

// Cancel Order (with rule enforcement & inventory restoration)
apiRouter.post('/orders/:id/cancel', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { reason = 'Changed my mind' } = req.body;
    const db = getDb();
    const order = db.orders.find((o) => o.id === req.params.id && o.userId === req.user!.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Rules: cannot cancel if already Shipped, Out for Delivery, or Delivered
    if (['Shipped', 'Out for Delivery', 'Delivered'].includes(order.orderStatus)) {
      return res.status(400).json({
        error: `Order cannot be cancelled as it has already been ${order.orderStatus}. You may initiate a return after delivery.`,
      });
    }

    if (order.orderStatus === 'Cancelled') {
      return res.status(400).json({ error: 'This order has already been cancelled.' });
    }

    // Restore inventory
    for (const item of order.items) {
      for (const p of db.products) {
        const v = p.variants.find((va) => va.id === item.variantId);
        if (v) {
          v.stockQuantity += item.quantity;
          break;
        }
      }
    }

    order.orderStatus = 'Cancelled';
    order.cancellationReason = reason;
    order.cancellationDate = new Date().toISOString();
    order.updatedAt = new Date().toISOString();

    if (order.paymentStatus === 'captured') {
      order.paymentStatus = 'refund_pending';
    }

    const cancelEvent: TimelineEvent = {
      status: 'Cancelled',
      timestamp: new Date().toISOString(),
      description: `Order cancelled by customer. Reason: ${reason}. ${
        order.paymentStatus === 'refund_pending'
          ? 'Refund of ₹' + order.grandTotal.toLocaleString('en-IN') + ' initiated to original payment source (3-5 business days).'
          : ''
      }`,
    };
    order.timeline.push(cancelEvent);

    db.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId: req.user!.id,
      title: 'Order Cancelled',
      message: `Your cancellation request for order #${order.orderNumber} has been processed.`,
      type: 'order',
      read: false,
      createdAt: new Date().toISOString(),
    });

    commitDb();
    return res.json({ message: 'Your order has been cancelled.', order });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Order cancellation failed' });
  }
});

// Return / Exchange Request
apiRouter.post('/orders/:id/return', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { type = 'return', reason } = req.body;
    const db = getDb();
    const order = db.orders.find((o) => o.id === req.params.id && o.userId === req.user!.id);

    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (order.orderStatus !== 'Delivered') {
      return res.status(400).json({ error: 'Return or exchange can only be requested after the order has been delivered.' });
    }

    order.returnType = type;
    order.returnReason = reason || 'Quality / Fit issue';
    order.returnStatus = 'Pending';
    order.updatedAt = new Date().toISOString();

    commitDb();
    return res.json({ message: `${type === 'exchange' ? 'Exchange' : 'Return'} request submitted for approval.`, order });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Return request failed' });
  }
});

// ==========================================
// 6. REVIEWS
// ==========================================

apiRouter.post('/reviews', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { productId, rating, title, comment } = req.body;
    if (!productId || !rating || !title || !comment) {
      return res.status(400).json({ error: 'Rating, title, and review comments are required.' });
    }

    const db = getDb();
    const user = req.user!;

    // Check if verified purchaser
    const hasPurchased = db.orders.some(
      (o) => o.userId === user.id && o.items.some((i) => i.productId === productId)
    );

    const newRev = {
      id: `rev_${Date.now()}`,
      productId,
      userId: user.id,
      userName: user.fullName,
      rating: Number(rating),
      title: title.trim(),
      comment: comment.trim(),
      isVerifiedPurchase: hasPurchased,
      createdAt: new Date().toISOString(),
    };

    db.reviews.unshift(newRev);

    // Update product rating and review count
    const prod = db.products.find((p) => p.id === productId);
    if (prod) {
      const allRev = db.reviews.filter((r) => r.productId === productId);
      const avg = allRev.reduce((acc, curr) => acc + curr.rating, 0) / allRev.length;
      prod.rating = Number(avg.toFixed(1));
      prod.reviewCount = allRev.length;
    }

    commitDb();
    return res.status(201).json({ message: 'Review submitted successfully!', review: newRev });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Review submission failed' });
  }
});

// ==========================================
// 7. NOTIFICATIONS
// ==========================================

apiRouter.get('/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const list = db.notifications.filter((n) => n.userId === req.user!.id);
  return res.json(list);
});

apiRouter.post('/notifications/mark-read', requireAuth, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  db.notifications.filter((n) => n.userId === req.user!.id).forEach((n) => (n.read = true));
  commitDb();
  return res.json({ message: 'All marked as read' });
});

// ==========================================
// 8. ADMIN DASHBOARD & MANAGEMENT
// ==========================================

apiRouter.get('/admin/stats', requireAdmin, (_req, res) => {
  const db = getDb();
  const totalCustomers = db.users.filter((u) => u.role === 'customer').length;
  const totalOrders = db.orders.length;
  const pendingOrders = db.orders.filter((o) => ['Order Placed', 'Confirmed', 'Processing'].includes(o.orderStatus)).length;
  const deliveredOrders = db.orders.filter((o) => o.orderStatus === 'Delivered').length;
  const cancelledOrders = db.orders.filter((o) => o.orderStatus === 'Cancelled').length;

  const totalRevenue = db.orders
    .filter((o) => o.orderStatus !== 'Cancelled' && o.paymentStatus !== 'failed')
    .reduce((acc, curr) => acc + curr.grandTotal, 0);

  // Low stock products
  const lowStockProducts: any[] = [];
  db.products.forEach((p) => {
    p.variants.forEach((v) => {
      if (v.stockQuantity <= 5) {
        lowStockProducts.push({
          productId: p.id,
          productName: p.name,
          sku: v.sku,
          color: v.colorName,
          size: v.size,
          stock: v.stockQuantity,
        });
      }
    });
  });

  return res.json({
    totalCustomers,
    totalOrders,
    pendingOrders,
    deliveredOrders,
    cancelledOrders,
    totalRevenue,
    lowStockProducts,
  });
});

// Admin: Orders list & status update
apiRouter.get('/admin/orders', requireAdmin, (req, res) => {
  const db = getDb();
  const { status, search } = req.query;
  let list = [...db.orders];

  if (status && status !== 'all') {
    list = list.filter((o) => o.orderStatus === status);
  }

  if (search) {
    const q = (search as string).toLowerCase();
    list = list.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.userEmail.toLowerCase().includes(q) ||
        o.shippingAddress.fullName.toLowerCase().includes(q)
    );
  }

  return res.json(list);
});

apiRouter.patch('/admin/orders/:id/status', requireAdmin, (req, res) => {
  try {
    const { status, description, location } = req.body;
    const db = getDb();
    const order = db.orders.find((o) => o.id === req.params.id);

    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.orderStatus = status;
    order.updatedAt = new Date().toISOString();

    const newEvent: TimelineEvent = {
      status,
      timestamp: new Date().toISOString(),
      description: description || `Status updated to ${status}`,
      location,
    };
    order.timeline.push(newEvent);

    // Send real-time notification to customer
    db.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId: order.userId,
      title: `Order Update: #${order.orderNumber}`,
      message: `Your order is now: ${status}. ${description || ''}`,
      type: 'order',
      read: false,
      createdAt: new Date().toISOString(),
    });

    commitDb();
    return res.json({ message: 'Order status updated.', order });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin: Product Management (CRUD)
apiRouter.post('/admin/products', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const {
      name,
      categoryId,
      gender,
      ageGroup,
      description,
      material,
      basePrice,
      mrpPrice,
      images,
      variants,
      collection,
      isFeatured,
      isTrending,
    } = req.body;

    if (!name || !categoryId || !basePrice || !variants || variants.length === 0) {
      return res.status(400).json({ error: 'Product name, category, price, and at least one variant are required.' });
    }

    const cat = db.categories.find((c) => c.id === categoryId);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const disc = mrpPrice > basePrice ? Math.round(((mrpPrice - basePrice) / mrpPrice) * 100) : 0;

    const newProduct: Product = {
      id: `prod_${Date.now()}`,
      name,
      slug,
      categoryId,
      categoryName: cat ? cat.name : 'Fashion',
      gender: gender || 'women',
      ageGroup: ageGroup || 'adult',
      description: description || '',
      material: material || '100% Premium Cotton',
      basePrice: Number(basePrice),
      mrpPrice: Number(mrpPrice || basePrice),
      discountPercent: disc,
      rating: 5.0,
      reviewCount: 0,
      isFeatured: Boolean(isFeatured),
      isTrending: Boolean(isTrending),
      collection: collection || 'new_season',
      images: images && images.length ? images : ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80'],
      variants: variants.map((v: any, idx: number) => ({
        id: `var_${Date.now()}_${idx}`,
        productId: `prod_${Date.now()}`,
        sku: v.sku || `SKU-${Date.now()}-${idx}`,
        colorName: v.colorName || 'Default',
        colorHex: v.colorHex || '#000000',
        size: v.size || 'M',
        stockQuantity: Number(v.stockQuantity) || 10,
        imageUrl: v.imageUrl,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.products.unshift(newProduct);
    commitDb();
    return res.status(201).json(newProduct);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create product' });
  }
});

// Admin: Update Stock & Product
apiRouter.patch('/admin/products/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    Object.assign(product, req.body, { updatedAt: new Date().toISOString() });
    commitDb();
    return res.json(product);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin: Delete Product
apiRouter.delete('/admin/products/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.products = db.products.filter((p) => p.id !== req.params.id);
  commitDb();
  return res.json({ message: 'Product deleted' });
});

// Admin: Customers List
apiRouter.get('/admin/customers', requireAdmin, (_req, res) => {
  const db = getDb();
  const customers = db.users.map((u) => {
    const orders = db.orders.filter((o) => o.userId === u.id);
    const totalSpent = orders
      .filter((o) => o.orderStatus !== 'Cancelled')
      .reduce((sum, o) => sum + o.grandTotal, 0);
    return {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      isVerified: u.isVerified,
      ordersCount: orders.length,
      totalSpent,
      createdAt: u.createdAt,
    };
  });
  return res.json(customers);
});

// Admin: Update Settings
apiRouter.patch('/admin/settings', requireAdmin, (req, res) => {
  const db = getDb();
  Object.assign(db.siteSettings, req.body);
  commitDb();
  return res.json(db.siteSettings);
});
