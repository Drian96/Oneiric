import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const PlatformLogin = () => {
  const [shopSlug, setShopSlug] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = shopSlug.trim().toLowerCase();
    if (!slug) {
      setError('Shop slug is required.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError('Slug can only use letters, numbers, and hyphens.');
      return;
    }
    navigate(`/${slug}/login`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-8 border border-sage-light">
        <h1 className="text-2xl font-serif font-bold text-dgreen mb-2">Shop Login</h1>
        <p className="text-sm text-dgray mb-6">
          Enter your shop slug to continue to the shop login page.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-dgreen mb-1 font-medium">Shop Slug</label>
            <input
              value={shopSlug}
              onChange={(e) => {
                setShopSlug(e.target.value);
                setError('');
              }}
              className="w-full p-2 rounded border border-sage-light bg-lgray text-dgreen focus:ring-2 focus:ring-dgreen"
              placeholder="my-furniture-shop"
            />
          </div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <button
            type="submit"
            className="w-full bg-dgreen text-cream px-4 py-2 rounded hover:bg-lgreen transition-colors"
          >
            Continue
          </button>
        </form>

        <div className="mt-6 text-sm text-dgray">
          Need a shop?{' '}
          <Link to="/platform/create-shop" className="text-dgreen hover:underline">
            Create one here
          </Link>
          .
        </div>
      </div>
    </div>
  );
};

export default PlatformLogin;
