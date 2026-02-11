import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerShop } from '../services/api';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const CreateShop = () => {
  const [shopName, setShopName] = useState('');
  const [shopSlug, setShopSlug] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successSlug, setSuccessSlug] = useState('');
  const navigate = useNavigate();

  const computedSlug = useMemo(() => slugify(shopName), [shopName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const slug = shopSlug.trim().toLowerCase() || computedSlug;
      if (!shopName || !slug || !adminFirstName || !adminLastName || !adminEmail || !adminPassword) {
        throw new Error('Please fill in all required fields.');
      }

      await registerShop({
        shop_name: shopName,
        shop_slug: slug,
        admin_first_name: adminFirstName,
        admin_last_name: adminLastName,
        admin_email: adminEmail,
        admin_password: adminPassword,
        admin_phone: adminPhone || undefined,
      });

      setSuccessSlug(slug);
    } catch (err) {
      setError((err as Error).message || 'Failed to create shop.');
    } finally {
      setLoading(false);
    }
  };

  if (successSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream px-6">
        <div className="w-full max-w-md bg-white rounded-xl shadow p-8 border border-sage-light text-center">
          <h1 className="text-2xl font-serif font-bold text-dgreen mb-2">Shop Created</h1>
          <p className="text-dgray mb-6">
            Your shop is ready. Continue to login and start configuring your store.
          </p>
          <button
            className="w-full bg-dgreen text-cream px-4 py-2 rounded hover:bg-lgreen transition-colors"
            onClick={() => navigate(`/${successSlug}/login`)}
          >
            Go to Login
          </button>
          <div className="mt-4 text-sm">
            or{' '}
            <Link to="/" className="text-dgreen hover:underline">
              return to landing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream px-6 py-10">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-8 border border-sage-light">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-serif font-bold text-dgreen">Create Your Shop</h1>
          <Link to="/login" className="text-sm text-dgreen hover:underline">
            Already have a shop?
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-dgreen mb-1 font-medium">Shop Name</label>
            <input
              value={shopName}
              onChange={(e) => {
                setShopName(e.target.value);
                if (!shopSlug) setShopSlug('');
              }}
              className="w-full p-2 rounded border border-sage-light bg-lgray text-dgreen focus:ring-2 focus:ring-dgreen"
              placeholder="Oneiric Furniture"
            />
          </div>

          <div>
            <label className="block text-dgreen mb-1 font-medium">Shop Slug</label>
            <input
              value={shopSlug}
              onChange={(e) => setShopSlug(e.target.value)}
              className="w-full p-2 rounded border border-sage-light bg-lgray text-dgreen focus:ring-2 focus:ring-dgreen"
              placeholder={computedSlug || 'oneiric-furniture'}
            />
            <p className="text-xs text-dgray mt-1">
              This becomes your URL: oneiric.shop/<strong>{shopSlug || computedSlug || 'your-shop'}</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-dgreen mb-1 font-medium">Admin First Name</label>
              <input
                value={adminFirstName}
                onChange={(e) => setAdminFirstName(e.target.value)}
                className="w-full p-2 rounded border border-sage-light bg-lgray text-dgreen focus:ring-2 focus:ring-dgreen"
              />
            </div>
            <div>
              <label className="block text-dgreen mb-1 font-medium">Admin Last Name</label>
              <input
                value={adminLastName}
                onChange={(e) => setAdminLastName(e.target.value)}
                className="w-full p-2 rounded border border-sage-light bg-lgray text-dgreen focus:ring-2 focus:ring-dgreen"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-dgreen mb-1 font-medium">Admin Email</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full p-2 rounded border border-sage-light bg-lgray text-dgreen focus:ring-2 focus:ring-dgreen"
              />
            </div>
            <div>
              <label className="block text-dgreen mb-1 font-medium">Admin Phone</label>
              <input
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                className="w-full p-2 rounded border border-sage-light bg-lgray text-dgreen focus:ring-2 focus:ring-dgreen"
              />
            </div>
          </div>

          <div>
            <label className="block text-dgreen mb-1 font-medium">Admin Password</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full p-2 rounded border border-sage-light bg-lgray text-dgreen focus:ring-2 focus:ring-dgreen"
            />
            <p className="text-xs text-dgray mt-1">
              Must include upper, lower, number, and be 8+ characters.
            </p>
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <button
            type="submit"
            className="w-full bg-dgreen text-cream px-4 py-2 rounded hover:bg-lgreen transition-colors disabled:bg-gray-300"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Shop'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateShop;
