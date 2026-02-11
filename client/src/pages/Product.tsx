import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import Header from '../shared/Header';
import Footer from '../shared/Footer';
import ProductDashboard from '../components/Products/ProductDashboard';
import { useShop } from '../contexts/ShopContext';

const Products = () => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const initialPage = Number.parseInt(searchParams.get('page') || '1', 10) || 1;
  const { shop } = useShop();

  useEffect(() => {
    if (!shop) return;

    const title = `${shop.name} Storefront | Oneiric`;
    document.title = title;

    const description = `Shop ${shop.name} on Oneiric. Browse products, discover collections, and order directly from this storefront.`;
    const upsertMeta = (name: 'description' | 'og:title' | 'og:description', value: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        if (isProperty) meta.setAttribute('property', name);
        else meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', value);
    };

    upsertMeta('description', description);
    upsertMeta('og:title', title, true);
    upsertMeta('og:description', description, true);
  }, [shop]);

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div
          className="rounded-2xl p-6 border"
          style={{
            borderColor: 'var(--brand-accent)',
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 8%, #ffffff) 0%, color-mix(in srgb, var(--brand-secondary) 10%, #ffffff) 100%)',
          }}
        >
          <h1 className="text-3xl font-serif font-bold" style={{ color: 'var(--brand-primary)' }}>
            {shop?.name ? `${shop.name} Storefront` : 'Shop Storefront'}
          </h1>
          <p className="mt-2 text-dgray">
            Explore products curated for this shop. Inventory, pricing, and branding are tenant-specific.
          </p>
        </div>
      </section>
      <ProductDashboard searchQuery={searchQuery} initialPage={initialPage} />
      <Footer />
    </div>
  );
};

export default Products;