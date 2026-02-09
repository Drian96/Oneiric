import React, { useEffect, useMemo, useState } from 'react';
import { ensureStorageAuth, SHOP_LOGOS_BUCKET, supabase } from '../../services/supabase/client';
import { updateShopBranding } from '../../services/api';
import { useShop } from '../../contexts/ShopContext';

// PayMongo-supported payment methods (adjust as needed)
const PAYMONGO_METHODS = [
  'GCash',
  'Credit Card',
  'GrabPay',
  'Maya',
  'Online Banking',
  'BillEase',
  'ShopeePay',
  'PayMaya',
  'PayPal', // Add/remove as your PayMongo account supports
];

const AdminSystemSettings: React.FC = () => {
  const { shop } = useShop();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [themePrimary, setThemePrimary] = useState(shop?.theme_primary || '#2f5f4f');
  const [themeSecondary, setThemeSecondary] = useState(shop?.theme_secondary || '#8fbfaa');
  const [themeAccent, setThemeAccent] = useState(shop?.theme_accent || '#e6f1ea');
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [brandingMessage, setBrandingMessage] = useState<string | null>(null);

  const logoPreview = useMemo(() => {
    if (logoFile) return URL.createObjectURL(logoFile);
    return shop?.logo_url || null;
  }, [logoFile, shop?.logo_url]);

  useEffect(() => {
    if (!shop) return;
    setThemePrimary(shop.theme_primary || '#2f5f4f');
    setThemeSecondary(shop.theme_secondary || '#8fbfaa');
    setThemeAccent(shop.theme_accent || '#e6f1ea');
  }, [shop?.id, shop?.theme_primary, shop?.theme_secondary, shop?.theme_accent]);

  useEffect(() => {
    if (!logoFile || !logoPreview) return;
    return () => {
      URL.revokeObjectURL(logoPreview);
    };
  }, [logoFile, logoPreview]);

  // State for selected payment methods
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['GCash', 'Credit Card']);
  const [methodToAdd, setMethodToAdd] = useState('');

  // State for shipping rates
  const [baseRate, setBaseRate] = useState('');
  const [ratePerKg, setRatePerKg] = useState('');

  // Add a payment method if not already selected
  const handleAddMethod = () => {
    if (methodToAdd && !selectedMethods.includes(methodToAdd)) {
      setSelectedMethods([...selectedMethods, methodToAdd]);
      setMethodToAdd('');
    }
  };

  // Remove a payment method
  const handleDeleteMethod = (method: string) => {
    setSelectedMethods(selectedMethods.filter((m) => m !== method));
  };

  // Get available methods not already selected
  const availableMethods = PAYMONGO_METHODS.filter((m) => !selectedMethods.includes(m));

  const handleBrandingSave = async () => {
    if (!shop?.id) {
      setBrandingMessage('Shop context is missing. Check your shop slug.');
      return;
    }
    setBrandingLoading(true);
    setBrandingMessage(null);

    try {
      let logoUrl = shop.logo_url || null;

      if (logoFile) {
        await ensureStorageAuth();
        const fileExt = logoFile.name.split('.').pop() || 'png';
        const fileName = `${shop.id}-${Date.now()}.${fileExt}`;
        const filePath = `shop-logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(SHOP_LOGOS_BUCKET)
          .upload(filePath, logoFile, { upsert: true, contentType: logoFile.type });

        if (uploadError) {
          throw new Error(`Logo upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from(SHOP_LOGOS_BUCKET)
          .getPublicUrl(filePath);

        logoUrl = publicUrl;
      }

      await updateShopBranding({
        logo_url: logoUrl,
        theme_primary: themePrimary,
        theme_secondary: themeSecondary,
        theme_accent: themeAccent,
      });

      setBrandingMessage('Branding updated successfully.');
      setLogoFile(null);
    } catch (error) {
      setBrandingMessage((error as Error).message || 'Failed to update branding.');
    } finally {
      setBrandingLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      {/* Branding Section */}
      <div className="bg-white rounded-lg shadow p-6 border border-sage-light">
        <h3 className="text-xl font-semibold text-dgreen mb-4">Branding</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-dgreen mb-2 font-medium">Shop Logo</label>
            {logoPreview ? (
              <div className="mb-3">
                <img
                  src={logoPreview}
                  alt="Shop logo preview"
                  className="h-20 w-auto rounded border border-sage-light"
                />
              </div>
            ) : null}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-dgreen mb-1 font-medium">Primary</label>
              <input
                type="color"
                value={themePrimary}
                onChange={(e) => setThemePrimary(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-dgreen mb-1 font-medium">Secondary</label>
              <input
                type="color"
                value={themeSecondary}
                onChange={(e) => setThemeSecondary(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-dgreen mb-1 font-medium">Accent</label>
              <input
                type="color"
                value={themeAccent}
                onChange={(e) => setThemeAccent(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={handleBrandingSave}
            disabled={brandingLoading}
            className="bg-dgreen text-white px-4 py-2 rounded hover:bg-lgreen transition-colors disabled:bg-gray-300"
          >
            {brandingLoading ? 'Saving...' : 'Save Branding'}
          </button>

          {brandingMessage ? (
            <div className="text-sm text-dgreen">{brandingMessage}</div>
          ) : null}
        </div>
      </div>

      {/* Payment Methods Section */}
      <div className="bg-white rounded-lg shadow p-6 border border-sage-light">
        <h3 className="text-xl font-semibold text-dgreen mb-4">Payment Methods</h3>
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          <select
            className="flex-1 p-2 rounded border border-sage-light bg-lgray text-dgreen focus:ring-2 focus:ring-dgreen"
            value={methodToAdd}
            onChange={(e) => setMethodToAdd(e.target.value)}
          >
            <option value="">Select payment method</option>
            {availableMethods.map((method) => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
          <button
            className="bg-dgreen text-white px-4 py-2 rounded hover:bg-lgreen transition-colors disabled:bg-gray-300"
            onClick={handleAddMethod}
            disabled={!methodToAdd}
          >
            Add
          </button>
        </div>
        <ul className="divide-y divide-sage-light">
          {selectedMethods.map((method) => (
            <li key={method} className="flex items-center justify-between py-2">
              <span className="text-dgreen font-medium">{method}</span>
              <button
                className="bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 text-xs"
                onClick={() => handleDeleteMethod(method)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Shipping Rate Settings Section */}
      <div className="bg-white rounded-lg shadow p-6 border border-sage-light">
        <h3 className="text-xl font-semibold text-dgreen mb-4">Shipping Rate Settings</h3>
        <div className="mb-4">
          <label className="block text-dgreen mb-1 font-medium">Base rate</label>
          <input
            type="number"
            className="w-40 p-2 rounded border border-sage-light bg-lgray text-dgreen focus:ring-2 focus:ring-dgreen"
            value={baseRate}
            onChange={(e) => setBaseRate(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-dgreen mb-1 font-medium">Rate per kg</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="w-40 p-2 rounded border border-sage-light bg-lgray text-dgreen focus:ring-2 focus:ring-dgreen"
              value={ratePerKg}
              onChange={(e) => setRatePerKg(e.target.value)}
              placeholder="0.00"
            />
            <span className="text-dgreen">/kg</span>
          </div>
        </div>
      </div>
      {/*
        TODO: Connect these settings to backend API to save changes.
        For now, this is just a UI component.
      */}
    </div>
  );
};

export default AdminSystemSettings;
