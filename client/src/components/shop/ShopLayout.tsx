import { useEffect, useState } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import ShopContext, { Shop } from '../../contexts/ShopContext';
import { getShopBySlug } from '../../services/api';
import NotFound from '../../pages/NotFound';

const ShopLayout = () => {
  const { shopSlug } = useParams();
  const location = useLocation();
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const slug = (shopSlug || '').toLowerCase();
    if (!slug) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setHasError(false);

    getShopBySlug(slug)
      .then((shopData) => {
        if (!isActive) return;
        setShop(shopData);
      })
      .catch(() => {
        if (!isActive) return;
        setHasError(true);
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [shopSlug]);

  useEffect(() => {
    if (!shop) return;
    const root = document.documentElement;
    if (shop.theme_primary) root.style.setProperty('--brand-primary', shop.theme_primary);
    if (shop.theme_secondary) root.style.setProperty('--brand-secondary', shop.theme_secondary);
    if (shop.theme_accent) root.style.setProperty('--brand-accent', shop.theme_accent);
    if (shop.name) document.title = shop.name;
  }, [shop]);

  if (isLoading) {
    return <div style={{ padding: 24 }}>Loading shop...</div>;
  }

  if (hasError || !shop) {
    const segments = location.pathname.split('/').filter(Boolean);
    const shopRoute = segments[1] || '';
    const publicRoutes = new Set(['login', 'signup', 'forgot-password', 'auth', 'terms']);
    const isPublic = publicRoutes.has(shopRoute) || shopRoute.startsWith('auth');
    if (!isPublic) {
      return <NotFound />;
    }

    return (
      <ShopContext.Provider value={{ shop: null, shopSlug: shopSlug || '', isLoading: false }}>
        <Outlet />
      </ShopContext.Provider>
    );
  }

  return (
    <ShopContext.Provider value={{ shop, shopSlug: shop.slug, isLoading: false }}>
      <Outlet />
    </ShopContext.Provider>
  );
};

export default ShopLayout;
