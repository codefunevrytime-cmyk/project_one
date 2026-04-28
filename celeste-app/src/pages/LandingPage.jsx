import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { galleryData } from '../data/galleryData';
import { testimonialData } from '../data/testimonialData';
import { useSlider } from '../hooks/useSlider';
import { useModal } from '../hooks/useModal';
import Footer from '../components/Footer';

/* Hero Slider Data */
const heroSlides = [
  { tag: 'Landscape Collection', title: 'Where Mountains Meet the Sky', sub: 'Discover majestic peaks and sweeping horizons captured through our lens.', btnText: 'Explore Gallery', btnLink: '#gallery' },
  { tag: 'Nature Series', title: 'The Wilderness Calls to You', sub: "Pristine forests, untouched valleys — nature's finest compositions.", btnText: 'Join Us', btnLink: '/signup' },
  { tag: 'Wildlife Edition', title: 'Moments Frozen in Time', sub: 'Rare wildlife encounters, beautifully preserved in every frame.', btnText: 'Book a Session', btnLink: '#contact' },
];

/* Gallery Modal Component */
function GalleryModal({ isOpen, onClose, item, onPrev, onNext }) {
  if (!item) return null;
  const pillColors = ['pill-amber', 'pill-teal', 'pill-blue'];
  return (
    <div className={isOpen ? 'modal-backdrop open' : 'modal-backdrop'} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" key={item.title}>
        <div className="modal-img-col">
          <img src={item.img} alt={item.title} />
          <div className="modal-badge">{item.tag}</div>
        </div>
        <div className="modal-content">
          <button className="modal-close" onClick={onClose}>x</button>
          <div className="modal-tag">{item.tag}</div>
          <div className="modal-title">{item.title}</div>
          <div className="detail-list">
            <div className="detail-row">
              <div className="d-icon"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5z" stroke="currentColor" strokeWidth="1.4" fill="none"/><circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" fill="none"/></svg></div>
              <span className="d-label">Location</span><span className="d-val">{item.location}</span>
            </div>
            <div className="detail-row">
              <div className="d-icon"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" fill="none"/><path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></div>
              <span className="d-label">Category</span><span className="d-val">{item.category}</span>
            </div>
          </div>
          <div className="pill-row">
            {item.pills.map((p, j) => <span key={p} className={'pill ' + pillColors[j % 3]}>{p}</span>)}
          </div>
          <div className="modal-desc">{item.desc}</div>
          <div className="modal-footer">
            <div className="price-block"><div className="price-big">{item.price}</div><div className="price-note">Photography Session</div></div>
            <div className="footer-right">
              <button className="nav-btn" onClick={onPrev} title="Previous">&larr;</button>
              <button className="nav-btn" onClick={onNext} title="Next">&rarr;</button>
              <button className="btn-book">Book Session</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Testimonial Carousel - 3 cards per slide, auto-advances every 6s */
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

/* Contact Form with 3-second success feedback */
function ContactSection() {
  const [sent, setSent] = useState(false);
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => { setSent(false); e.target.reset(); }, 3000);
  }, []);
  return (
    <section id="contact">
      <div className="section-label">Get in Touch</div>
      <h2 className="section-title">Start a Conversation</h2>
      <div className="section-line"></div>
      <div className="contact-wrap">
        <div className="contact-info">
          <p>Whether you have a project in mind, a question about our work, or simply want to say hello — we would love to hear from you. Great photographs begin with great conversations.</p>
          <div className="contact-detail"><div className="contact-icon">{'\u2709'}</div><span><strong>Email Us</strong>hello@lumiere-studio.com</span></div>
          <div className="contact-detail"><div className="contact-icon">{'\u260F'}</div><span><strong>Call Us</strong>+91 98765 43210</span></div>
          <div className="contact-detail"><div className="contact-icon">{'\u2316'}</div><span><strong>Studio</strong>12 Hazratganj, Lucknow<br />Uttar Pradesh, India</span></div>
        </div>
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>First Name</label><input type="text" placeholder="Arjun" required /></div>
            <div className="form-group"><label>Last Name</label><input type="text" placeholder="Sharma" required /></div>
          </div>
          <div className="form-group"><label>Email Address</label><input type="email" placeholder="arjun@example.com" required /></div>
          <div className="form-group">
            <label>Project Type</label>
            <select defaultValue="">
              <option value="">Select a service</option>
              <option>Wedding Photography</option>
              <option>Portrait Session</option>
              <option>Brand / Commercial</option>
              <option>Landscape / Travel</option>
              <option>Architecture</option>
              <option>Other</option>
            </select>
          </div>
          <div className="form-group"><label>Your Message</label><textarea placeholder="Tell us about your vision..."></textarea></div>
          <button type="submit" className="submit-btn" style={sent ? { background: 'var(--gold)', color: 'var(--dark)' } : {}}>{sent ? 'Message Sent ' + '\u2713' : 'Send Message \u2192'}</button>
        </form>
      </div>
    </section>
  );
}

/* Landing Page - Hero Slider + Gallery + Testimonials + Contact + Footer */
export default function LandingPage() {
  const { current: heroCurrent, goTo: goToHero } = useSlider(heroSlides.length, 4000);
  const { isOpen, open, close, navigate, currentIndex } = useModal(galleryData.length);

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
              {s.btnLink.startsWith('#') ? <a href={s.btnLink} className="slide-btn">{s.btnText}</a> : <Link to={s.btnLink} className="slide-btn">{s.btnText}</Link>}
            </div>
          </div>
        ))}
        <div className="slider-dots">
          {heroSlides.map((_, i) => <div key={i} className={i === heroCurrent ? 'dot active' : 'dot'} onClick={() => goToHero(i)} />)}
        </div>
      </section>

      {/* Gallery Grid */}
      <section id="gallery">
        <div className="section-label">Our Work</div>
        <h2 className="section-title">Visual Stories</h2>
        <div className="section-line"></div>
        <div className="gallery-grid">
          {galleryData.map((item, index) => (
            <div key={index} className="gallery-item" onClick={() => open(index)}>
              <img src={item.img} alt={item.title} loading="lazy" />
              <div className="eye-icon">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1 8s3-6 7-6 7 6 7 6-3 6-7 6-7-6-7-6z" stroke="white" strokeWidth="1.4" fill="none"/><circle cx="8" cy="8" r="2" stroke="white" strokeWidth="1.3" fill="none"/></svg>
              </div>
              <div className="item-overlay">
                <div className="item-mini">
                  <div className="item-mini-text">
                    <div className="item-mini-tag">{item.tag}</div>
                    <div className="item-mini-title">{item.title}</div>
                    <div className="item-mini-meta">
                      <span className="meta-chip">
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5z" stroke="rgba(255,255,255,0.65)" strokeWidth="1.4" fill="none"/></svg>
                        {item.location.split(',')[0]}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery Modal */}
      <GalleryModal isOpen={isOpen} onClose={close} item={galleryData[currentIndex] || null} onPrev={() => navigate(-1)} onNext={() => navigate(1)} />

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

