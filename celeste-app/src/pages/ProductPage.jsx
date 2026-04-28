import PageHeader from '../components/PageHeader';
import Footer from '../components/Footer';
import { productData } from '../data/productData';

/* Product Page - 6 photography service cards with pricing */
export default function ProductPage() {
  return (
    <>
      <PageHeader title="Our Products" subtitle="Explore our premium collection of photography services and packages." />
      <section className="products-section">
        <h2 className="section-title" style={{ textAlign: 'center' }}>Featured Services</h2>
        <div className="section-line" style={{ margin: '0 auto 50px' }}></div>
        <div className="products-grid">
          {productData.map((p) => (
            <div key={p.name} className="product-card">
              <div className="product-image">{p.emoji}</div>
              <div className="product-info">
                <div className="product-name">{p.name}</div>
                <div className="product-desc">{p.desc}</div>
                <div className="product-price">{p.price}</div>
                <button className="product-btn">Book Now</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </>
  );
}

