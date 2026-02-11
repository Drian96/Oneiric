import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from "../components/Home/HeaderRight";
import Footer from "../shared/Footer";
import Hero from "../components/Home/Hero";
import FeaturedProducts from "../components/Home/FeaturedProducts";
import Testimonials from "../components/Home/Testimonials";
import About from "../components/Home/About";
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const navigate = useNavigate();
  const { shopSlug } = useParams();
  const { isAuthenticated, isLoading, memberships, lastShopSlug } = useAuth();

  useEffect(() => {
    // Root landing should not show for authenticated users.
    if (isLoading || shopSlug || !isAuthenticated) return;

    if (memberships.length > 0) {
      const targetSlug = lastShopSlug || memberships[0]?.slug;
      if (!targetSlug) return;
      navigate(`/${targetSlug}/admin`, { replace: true });
      return;
    }

    navigate('/dashboard', { replace: true });
  }, [isLoading, shopSlug, isAuthenticated, memberships, lastShopSlug, navigate]);

  return (
    <div className="min-h-screen">
      {/* Header, Hero, Featured Products, About, Testimonials, Footer */}
      <Header />
      <Hero />
      <FeaturedProducts />
      <About />
      <Testimonials />
      <Footer />
    </div>
  );
}

export default Home;
