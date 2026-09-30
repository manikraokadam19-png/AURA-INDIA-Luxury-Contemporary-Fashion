import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../lib/api.ts';

export interface CartItemDetailed {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  productImage: string;
  colorName: string;
  colorHex: string;
  size: string;
  quantity: number;
  unitPrice: number;
  mrpPrice: number;
  stockAvailable: number;
  isOutOfStock: boolean;
}

export interface CartSummary {
  items: CartItemDetailed[];
  subtotal: number;
  mrpTotal: number;
  discount: number;
  shippingFee: number;
  freeShippingThreshold: number;
  tax: number;
  grandTotal: number;
}

interface CartContextType {
  cart: CartSummary;
  itemCount: number;
  loading: boolean;
  isCartDrawerOpen: boolean;
  toastMessage: string | null;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  addToCart: (variantId: string, quantity?: number) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  removeFromCart: (variantId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  clearToast: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartSummary>({
    items: [],
    subtotal: 0,
    mrpTotal: 0,
    discount: 0,
    shippingFee: 0,
    freeShippingThreshold: 999,
    tax: 0,
    grandTotal: 0,
  });
  const [loading, setLoading] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refreshCart = useCallback(async () => {
    try {
      const data = await apiRequest<CartSummary>('/api/cart');
      setCart(data);
    } catch (err) {
      console.error('Error refreshing cart:', err);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (variantId: string, quantity = 1) => {
    setLoading(true);
    try {
      await apiRequest('/api/cart/add', {
        method: 'POST',
        body: JSON.stringify({ variantId, quantity }),
      });
      await refreshCart();
      setToastMessage('Item added to your shopping cart');
      setIsCartDrawerOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (variantId: string, quantity: number) => {
    setLoading(true);
    try {
      await apiRequest('/api/cart/update', {
        method: 'POST',
        body: JSON.stringify({ variantId, quantity }),
      });
      await refreshCart();
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (variantId: string) => {
    setLoading(true);
    try {
      await apiRequest('/api/cart/remove', {
        method: 'POST',
        body: JSON.stringify({ variantId }),
      });
      await refreshCart();
    } finally {
      setLoading(false);
    }
  };

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        loading,
        isCartDrawerOpen,
        toastMessage,
        openCartDrawer: () => setIsCartDrawerOpen(true),
        closeCartDrawer: () => setIsCartDrawerOpen(false),
        addToCart,
        updateQuantity,
        removeFromCart,
        refreshCart,
        clearToast: () => setToastMessage(null),
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
