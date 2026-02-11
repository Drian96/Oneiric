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
    const root = document.documentElement;
    if (!shop) {
      root.style.setProperty('--brand-primary', '#0A400C');
      root.style.setProperty('--brand-secondary', '#708A58');
      root.style.setProperty('--brand-accent', '#B1AB86');
      return;
    }

    root.style.setProperty('--brand-primary', shop.theme_primary || '#0A400C');
    root.style.setProperty('--brand-secondary', shop.theme_secondary || '#708A58');
    root.style.setProperty('--brand-accent', shop.theme_accent || '#B1AB86');
    if (shop.name) document.title = `${shop.name} | Oneiric`;
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
