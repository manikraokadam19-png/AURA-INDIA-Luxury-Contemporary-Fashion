export type Gender = 'women' | 'men' | 'kids' | 'baby' | 'unisex';
export type AgeGroup = 'baby' | 'kids' | 'teen' | 'young_adult' | 'adult';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string; // e.g. +91 9876543210
  passwordHash: string;
  isVerified: boolean;
  role: 'customer' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  fullName: string;
  mobile: string;
  houseFlat: string;
  street: string;
  area: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  colorName: string;
  colorHex: string;
  size: string;
  stockQuantity: number;
  priceOverride?: number;
  imageUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  gender: Gender;
  ageGroup: AgeGroup;
  description: string;
  material: string;
  basePrice: number; // in INR ₹
  mrpPrice: number; // in INR ₹
  discountPercent: number;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  isTrending: boolean;
  collection: string; // 'new_season' | 'summer_edit' | 'winter_collection' | 'festive_edit' | 'the_edit' | 'streetwear' | 'none'
  images: string[];
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  gender: Gender;
  imageUrl: string;
  description: string;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  productImage: string;
  colorName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  mrpPrice: number;
  stockAvailable: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  productImage: string;
  size: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type OrderStatus =
  | 'Order Placed'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Refund Pending'
  | 'Refunded';

export interface TimelineEvent {
  status: OrderStatus;
  timestamp: string;
  description: string;
  location?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  userEmail: string;
  userPhone: string;
  items: OrderItem[];
  shippingAddress: Address;
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  grandTotal: number;
  paymentMethod: 'upi' | 'card' | 'netbanking' | 'cod';
  paymentStatus: 'pending' | 'captured' | 'failed' | 'refunded' | 'refund_pending';
  paymentId: string;
  orderStatus: OrderStatus;
  timeline: TimelineEvent[];
  cancellationReason?: string;
  cancellationDate?: string;
  returnReason?: string;
  returnType?: 'return' | 'exchange';
  returnStatus?: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export interface OtpRecord {
  id: string;
  identifier: string; // email or phone
  otp: string;
  expiresAt: number; // timestamp ms
  attemptCount: number;
  resendAvailableAt: number; // timestamp ms
  purpose: 'signup' | 'forgot_password';
  verified: boolean;
}

export interface SiteSettings {
  promoBarText: string;
  freeShippingThreshold: number;
  standardShippingFee: number;
  activeCollections: string[];
}

export interface LookbookLook {
  id: string;
  title: string;
  subtitle: string;
  story: string;
  modelImage: string;
  productIds: string[];
}
