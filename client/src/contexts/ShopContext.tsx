import React, { createContext, useContext } from 'react';

export interface Shop {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'pending';
  logo_url?: string | null;
  theme_primary?: string | null;
  theme_secondary?: string | null;
  theme_accent?: string | null;
}

interface ShopContextType {
  shop: Shop | null;
  shopSlug: string;
  isLoading: boolean;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const useShop = (): ShopContextType => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within ShopContext.Provider');
  }
  return context;
};

export default ShopContext;
