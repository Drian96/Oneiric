import { useEffect, useState } from 'react';
import { getCustomerSummary, CustomerSummaryResponse } from '../services/api';
import { Link } from 'react-router-dom';
import Header from '../shared/Header';

const BuyerDashboard = () => {
  const [summary, setSummary] = useState<CustomerSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getCustomerSummary();
        setSummary(data);
      } catch (error) {
        console.error('Failed to load summary:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <Header />
        <div className="p-6">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <div className="max-w-5xl mx-auto space-y-8 p-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-dgreen">Your Dashboard</h1>
          <p className="text-dgray">Orders across all shops and recent interactions.</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-sage-light">
          <h2 className="text-xl font-semibold text-dgreen mb-4">Recent Orders</h2>
          {summary?.orders?.length ? (
            <div className="space-y-3">
              {summary.orders.slice(0, 10).map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b border-sage-light pb-2">
                  <div>
                    <div className="text-dgreen font-medium">#{order.order_number}</div>
                    <div className="text-xs text-dgray">
                      {order.shop_name} • {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-dgreen font-semibold">₱{Number(order.total_amount).toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-dgray">No orders yet.</div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-sage-light">
          <h2 className="text-xl font-semibold text-dgreen mb-4">Shops You Visited</h2>
          {summary?.shops?.length ? (
            <div className="grid md:grid-cols-2 gap-4">
              {summary.shops.map((shop) => (
                <Link
                  key={shop.id}
                  to={`/${shop.slug}`}
                  className="flex items-center gap-3 border border-sage-light rounded-lg p-3 hover:bg-sage-light/30 transition-colors"
                >
                  {shop.logo_url ? (
                    <img src={shop.logo_url} alt={shop.name} className="h-10 w-10 rounded" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-lgray" />
                  )}
                  <div>
                    <div className="text-dgreen font-medium">{shop.name}</div>
                    <div className="text-xs text-dgray">/{shop.slug}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-dgray">No shop interactions yet.</div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-sage-light">
          <h2 className="text-xl font-semibold text-dgreen mb-2">Profile</h2>
          <p className="text-dgray text-sm">Profile and settings will appear here.</p>
        </div>
      </div>
    </div>
  );
};

export default BuyerDashboard;
