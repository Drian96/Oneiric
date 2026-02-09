import { Link } from 'react-router-dom';

const PlatformLanding = () => {
  return (
    <div className="min-h-screen bg-cream text-dgreen">
      <header className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="text-2xl font-serif font-bold">Oneiric SaaS</div>
        <div className="flex items-center gap-3">
          <Link
            to="/platform/login"
            className="px-4 py-2 border border-dgreen rounded-lg hover:bg-dgreen hover:text-cream transition-colors"
          >
            Shop Login
          </Link>
          <Link
            to="/platform/create-shop"
            className="px-4 py-2 bg-dgreen text-cream rounded-lg hover:bg-lgreen transition-colors"
          >
            Create Shop
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">
              Launch Your Furniture Shop in Minutes
            </h1>
            <p className="text-lg text-dgray mb-8">
              Multi-tenant eCommerce, AR product previews, and a modern admin suite.
              Spin up your own branded shop and start selling today.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/platform/create-shop"
                className="px-6 py-3 bg-dgreen text-cream rounded-lg hover:bg-lgreen transition-colors"
              >
                Create Your Shop
              </Link>
              <Link
                to="/platform/login"
                className="px-6 py-3 border border-dgreen rounded-lg hover:bg-dgreen hover:text-cream transition-colors"
              >
                Login to Existing Shop
              </Link>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow p-8 border border-sage-light">
            <h2 className="text-xl font-semibold mb-4">What you get</h2>
            <ul className="space-y-3 text-dgray">
              <li>Shop-specific catalogs and staff roles</li>
              <li>Customer accounts across multiple shops</li>
              <li>Branding controls: logo and theme colors</li>
              <li>Secure multi-tenant data isolation</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PlatformLanding;
