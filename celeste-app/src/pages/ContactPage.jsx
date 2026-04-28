import { useState, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import Footer from '../components/Footer';

/* Contact Page - Info + form with success feedback */
export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => { setSent(false); e.target.reset(); }, 3000);
  }, []);

  return (
    <>
      <PageHeader title="Contact Us" subtitle="We'd love to hear from you. Reach out and let's create something beautiful together." />
      <section className="about-section" style={{ paddingTop: '40px' }}>
        <div className="contact-wrap">
          <div className="contact-info">
            <p>Whether you have a project in mind or simply want to say hello — we would love to hear from you.</p>
            <div className="contact-detail"><div className="contact-icon">✉</div><span><strong>Email Us</strong>hello@lumiere-studio.com</span></div>
            <div className="contact-detail"><div className="contact-icon">☏</div><span><strong>Call Us</strong>+91 98765 43210</span></div>
            <div className="contact-detail"><div className="contact-icon">⌖</div><span><strong>Studio</strong>12 Hazratganj, Lucknow<br />Uttar Pradesh, India</span></div>
          </div>
          <form className="contact-form" onSubmit={handleSubmit} style={{ background: '#1a1610', padding: '2rem', borderRadius: '12px' }}>
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
            <div className="form-group"><label>Your Message</label><textarea placeholder="Tell us about your vision…"></textarea></div>
            <button type="submit" className="submit-btn" style={sent ? { background: 'var(--gold)', color: 'var(--dark)' } : {}}>{sent ? 'Message Sent ✓' : 'Send Message →'}</button>
          </form>
        </div>
      </section>
      <Footer />
    </>
  );
}

