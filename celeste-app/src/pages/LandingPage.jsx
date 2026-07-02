import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSlider } from '../hooks/useSlider';
import { useModal } from '../hooks/useModal';
import Footer from '../components/Footer';
import { testimonialData } from '../context/data/testimonialData';

import { API_URL } from '../config/api';

const API = API_URL;

/* Hero Slider Data */
const heroSlides = [
  { tag: 'Landscape Collection', title: 'Where Mountains Meet the Sky', sub: 'Discover majestic peaks and sweeping horizons captured through our lens.', btnText: 'Explore Gallery', btnLink: '#gallery' },
  { tag: 'Nature Series', title: 'The Wilderness Calls to You', sub: "Pristine forests, untouched valleys — nature's finest compositions.", btnText: 'Join Us', btnLink: '/signup' },
  { tag: 'Wildlife Edition', title: 'Moments Frozen in Time', sub: 'Rare wildlife encounters, beautifully preserved in every frame.', btnText: 'Book a Session', btnLink: '#contact' },
];

/* ── Complete 9-image hardcoded gallery (3×3 grid) ── */
const hardcodedGallery = [
  {
    id: 'hc-1',
    image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
    title: 'Mountain Lake',
    tag: 'Landscape',
    location: 'Himalayas, India',
    description: 'A serene mountain lake reflecting the peaks above at dawn.',
  },
  {
    id: 'hc-2',
    image_url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80',
    title: 'Forest Path',
    tag: 'Nature',
    location: 'Black Forest, Germany',
    description: 'A winding path through an ancient forest shrouded in morning mist.',
  },
  {
    id: 'hc-3',
    image_url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
    title: 'Golden Hills',
    tag: 'Sunrise',
    location: 'California, USA',
    description: 'Rolling hills bathed in the warm golden glow of sunrise.',
  },
  {
    id: 'hc-4',
    image_url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80',
    title: 'Panoramic Vista',
    tag: 'Valley',
    location: 'Swiss Alps, Switzerland',
    description: 'A sweeping panorama of valleys carved by ancient glaciers.',
  },
  {
    id: 'hc-5',
    image_url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&q=80',
    title: 'Golden Foliage',
    tag: 'Autumn',
    location: 'Vermont, USA',
    description: 'Autumn trees ablaze with warm golden and crimson hues.',
  },
  {
    id: 'hc-6',
    image_url: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&q=80',
    title: "Nature's Beauty",
    tag: 'Wildlife',
    location: 'Serengeti, Tanzania',
    description: 'Wildlife captured in perfect harmony with its natural habitat.',
  },
  {
    id: 'hc-7',
    image_url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80',
    title: 'Pine Forest',
    tag: 'Forest',
    location: 'Black Hills, USA',
    description: 'Towering pines standing sentinel in cathedral-like silence.',
  },
  {
    id: 'hc-8',
    image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    title: 'Mountain Peak',
    tag: 'Summit',
    location: 'Mount Fuji, Japan',
    description: "Standing atop one of Japan's most sacred mountains at sunrise.",
  },
  {
    id: 'hc-9',
    image_url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80',
    title: 'Ocean Cliffs',
    tag: 'Coastal',
    location: 'Big Sur, California',
    description: 'Sheer cliffs meeting the relentless power of the Pacific Ocean.',
  },
];

/* Gallery Modal Component */
function GalleryModal({ isOpen, onClose, item, onPrev, onNext }) {
  if (!item) return null;
  return (
    <div className={isOpen ? 'modal-backdrop open' : 'modal-backdrop'} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" key={item.title}>
        <div className="modal-img-col">
          <img src={item.image_url} alt={item.title} />
        </div>
        <div className="modal-content">
          <button className="modal-close" onClick={onClose}>✕</button>
          {item.tag && <div className="modal-tag">{item.tag}</div>}
          <div className="modal-title">{item.title || 'Untitled'}</div>
          {item.description && <div className="modal-desc">{item.description}</div>}
          {item.location && (
            <div className="detail-row" style={{ marginTop: 12 }}>
              <span className="d-label">Location</span>
              <span className="d-val">{item.location}</span>
            </div>
          )}
          <div className="modal-footer">
            <div className="footer-right">
              <button className="nav-btn" onClick={onPrev} title="Previous">&larr;</button>
              <button className="nav-btn" onClick={onNext} title="Next">&rarr;</button>
              <a href="#contact" className="btn-book" onClick={onClose}>Book Session</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Testimonial Carousel */
function TestimonialCarousel() {
  const cardsPerSlide = 3;
  const slideCount = Math.ceil(testimonialData.length / cardsPerSlide);
  const { current, goTo } = useSlider(slideCount, 6000);
  const groups = [];
  for (let i = 0; i < slideCount; i++) groups.push(testimonialData.slice(i * cardsPerSlide, (i + 1) * cardsPerSlide));
  return (
    <>
      <div className="testimonial-slider">
        {groups.map((group, i) => (
          <div key={i} className={i === current ? 'testimonial-slide active' : 'testimonial-slide'}>
            {group.map((t) => (
              <div key={t.name} className="testimonial-card">
                <img className="card-img" src={t.img} alt={t.name} />
                <div className="card-body">
                  <div className="card-stars">{'\u2605'.repeat(5)}</div>
                  <p className="card-quote">"{t.text}"</p>
                  <div className="card-author"><strong>{t.name}</strong>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="testimonial-dots">
        {groups.map((_, i) => <div key={i} className={i === current ? 'testimonial-dot active' : 'testimonial-dot'} onClick={() => goTo(i)} />)}
      </div>
    </>
  );
}

/* Contact Section */
function ContactSection() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.target);
    const payload = {
      client_name: `${formData.get('firstName')} ${formData.get('lastName')}`.trim(),
      email: formData.get('email'),
      phone: formData.get('phone') || '',
      message: `[${formData.get('projectType') || 'General'}] ${formData.get('message')}`,
    };
    try {
      const res = await fetch(`${API}/queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        e.target.reset();
        setTimeout(() => setSent(false), 4000);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Could not connect to server. Please try again.');
    }
    setLoading(false);
  }, []);

  return (
    <section id="contact">
      <div className="section-label">Get in Touch</div>
      <h2 className="section-title">Start a Conversation</h2>
      <div className="section-line"></div>
      <div className="contact-wrap">
        <div className="contact-info">
          <p>Whether you have a project in mind, a question about our work, or simply want to say hello — we would love to hear from you.</p>
          <div className="contact-detail"><div className="contact-icon">{'\u2709'}</div><span><strong>Email Us</strong>hello@lumiere-studio.com</span></div>
          <div className="contact-detail"><div className="contact-icon">{'\u260F'}</div><span><strong>Call Us</strong>+91 98765 43210</span></div>
          <div className="contact-detail"><div className="contact-icon">{'\u2316'}</div><span><strong>Studio</strong>12 Hazratganj, Lucknow<br />Uttar Pradesh, India</span></div>
        </div>
        <form className="contact-form" onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#b91c1c' }}>
              {error}
            </div>
          )}
          <div className="form-row">
            <div className="form-group"><label>First Name</label><input type="text" name="firstName" placeholder="Arjun" required /></div>
            <div className="form-group"><label>Last Name</label><input type="text" name="lastName" placeholder="Sharma" required /></div>
          </div>
          <div className="form-group"><label>Email Address</label><input type="email" name="email" placeholder="arjun@example.com" required /></div>
          <div className="form-group"><label>Phone (optional)</label><input type="tel" name="phone" placeholder="+91 98765 43210" /></div>
          <div className="form-group">
            <label>Project Type</label>
            <select name="projectType" defaultValue="">
              <option value="">Select a service</option>
              <option>Wedding Photography</option>
              <option>Portrait Session</option>
              <option>Brand / Commercial</option>
              <option>Landscape / Travel</option>
              <option>Architecture</option>
              <option>Other</option>
            </select>
          </div>
          <div className="form-group"><label>Your Message</label><textarea name="message" placeholder="Tell us about your vision..." required></textarea></div>
          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
            style={sent ? { background: 'var(--gold)', color: 'var(--dark)' } : {}}
          >
            {loading ? 'Sending…' : sent ? 'Message Sent ✓' : 'Send Message →'}
          </button>
        </form>
      </div>
    </section>
  );
}

/* ── Landing Page ── */
export default function LandingPage() {
  const { current: heroCurrent, goTo: goToHero } = useSlider(heroSlides.length, 4000);
  const { isOpen, open, close, navigate, currentIndex } = useModal(hardcodedGallery.length);

  return (
    <>
      {/* Hero Slider */}
      <section className="slider" id="home">
        {heroSlides.map((s, i) => (
          <div key={i} className={i === heroCurrent ? 'slide active' : 'slide'}>
            <div className="slide-content">
              <span className="slide-tag">{s.tag}</span>
              <h1 className="slide-title">{s.title}</h1>
              <p className="slide-sub">{s.sub}</p>
              {s.btnLink.startsWith('#')
                ? <a href={s.btnLink} className="slide-btn">{s.btnText}</a>
                : <Link to={s.btnLink} className="slide-btn">{s.btnText}</Link>}
            </div>
          </div>
        ))}
        <div className="slider-dots">
          {heroSlides.map((_, i) => (
            <div key={i} className={i === heroCurrent ? 'dot active' : 'dot'} onClick={() => goToHero(i)} />
          ))}
        </div>
      </section>

      {/* ── Gallery Grid — 9 images, 3×3 ── */}
      <section id="gallery">
        <div className="section-label">Our Work</div>
        <h2 className="section-title">Visual Stories</h2>
        <div className="section-line"></div>

        <div className="gallery-grid">
          {hardcodedGallery.map((item, index) => (
            <div
              key={item.id}
              className="gallery-item"
              onClick={() => open(index)}
            >
              <img src={item.image_url} alt={item.title} loading="lazy" />
              <div className="eye-icon">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M1 8s3-6 7-6 7 6 7 6-3 6-7 6-7-6-7-6z" stroke="white" strokeWidth="1.4" fill="none"/>
                  <circle cx="8" cy="8" r="2" stroke="white" strokeWidth="1.3" fill="none"/>
                </svg>
              </div>
              <div className="item-overlay">
                <div className="item-mini">
                  <div className="item-mini-text">
                    {item.tag && <div className="item-mini-tag">{item.tag}</div>}
                    <div className="item-mini-title">{item.title}</div>
                    {item.location && (
                      <div className="item-mini-meta">
                        <span className="meta-chip">{item.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery Modal */}
      <GalleryModal
        isOpen={isOpen}
        onClose={close}
        item={hardcodedGallery[currentIndex] || null}
        onPrev={() => navigate(-1)}
        onNext={() => navigate(1)}
      />

      {/* Testimonials */}
      <section id="testimonials">
        <div className="section-label">Client Stories</div>
        <h2 className="section-title">What People Say</h2>
        <div className="section-line"></div>
        <TestimonialCarousel />
      </section>

      {/* Contact */}
      <ContactSection />

      {/* Footer */}
      <Footer />
    </>
  );
}

// 223 - 47 - 2 - 
// 183 - 39 - 2
// 164 - 40 - 6
// 132 - 30 - 3

// 205 - 98
// 138 - 87
// 98 - 89
// 159 - 96