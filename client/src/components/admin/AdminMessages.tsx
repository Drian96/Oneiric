import { MessageSquare, ExternalLink } from 'lucide-react';

// Messages management component for admin
// Links to Facebook Messenger for customer communications
const FACEBOOK_MESSENGER_LINK = 'https://m.me/YourPage'; // Replace YourPage with your Facebook page username or ID

const AdminMessages = () => {
  const handleOpenMessenger = () => {
    window.open(FACEBOOK_MESSENGER_LINK, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-dgreen">Messages</h1>
        <p className="text-dgray mt-1">Manage customer inquiries and communications</p>
      </div>

      {/* Facebook Messenger Access */}
      <div className="bg-white rounded-lg p-8 shadow-sm border border-sage-light">
        <div className="flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 bg-sage-light rounded-full flex items-center justify-center">
            <MessageSquare className="w-10 h-10 text-dgreen" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-dgreen mb-2">Customer Messages</h2>
            <p className="text-dgray max-w-md">
              Customer messages and chat conversations are managed through Facebook Messenger.
              Click the button below to open Messenger.
            </p>
          </div>

          <button
            onClick={handleOpenMessenger}
            className="bg-dgreen text-cream px-6 py-3 rounded-lg hover:bg-lgreen transition-colors font-semibold flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
          >
            <MessageSquare className="w-5 h-5" />
            Open Facebook Messenger
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminMessages;
