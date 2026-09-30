import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../lib/api.ts';
import { Product } from '../server/types.ts';
import { useAuth } from './AuthContext.tsx';

interface WishlistContextType {
  wishlist: Product[];
  wishlistIds: Set<string>;
  loading: boolean;
  toggleWishlist: (product: Product) => Promise<boolean>;
  refreshWishlist: () => Promise<void>;
  isInWishlist: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refreshWishlist = useCallback(async () => {
    if (!isLoggedIn) {
      setWishlist([]);
      setWishlistIds(new Set());
      return;
    }

    try {
      setLoading(true);
      const data = await apiRequest<{ items: Product[] }>('/api/wishlist');
      setWishlist(data.items || []);
      setWishlistIds(new Set((data.items || []).map((p) => p.id)));
    } catch {
      setWishlist([]);
      setWishlistIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const toggleWishlist = async (product: Product): Promise<boolean> => {
    if (!isLoggedIn) {
      return false; // Prompts login
    }

    const wasIn = wishlistIds.has(product.id);
    const nextIds = new Set(wishlistIds);

    if (wasIn) {
      nextIds.delete(product.id);
      setWishlist((prev) => prev.filter((p) => p.id !== product.id));
    } else {
      nextIds.add(product.id);
      setWishlist((prev) => [product, ...prev]);
    }
    setWishlistIds(nextIds);

    try {
      const res = await apiRequest<{ added: boolean }>('/api/wishlist/toggle', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id }),
      });
      return res.added;
    } catch {
      // rollback
      refreshWishlist();
      return wasIn;
    }
  };

  const isInWishlist = (productId: string) => wishlistIds.has(productId);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistIds,
        loading,
        toggleWishlist,
        refreshWishlist,
        isInWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
