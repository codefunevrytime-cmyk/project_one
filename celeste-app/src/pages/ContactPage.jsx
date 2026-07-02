import { useState, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import Footer from '../components/Footer';

import { API_URL } from '../config/api';

const API = API_URL;

export default function ContactPage() {
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
      message: `[${formData.get('projectType')}] ${formData.get('message')}`,
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
    } catch (err) {
      setError('Could not connect to server. Please try again.');
    }
    setLoading(false);
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
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#b91c1c' }}>
                {error}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input type="text" name="firstName" placeholder="Arjun" required />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input type="text" name="lastName" placeholder="Sharma" required />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input type="email" name="email" placeholder="arjun@example.com" required />
            </div>

            <div className="form-group">
              <label>Phone (optional)</label>
              <input type="tel" name="phone" placeholder="+91 98765 43210" />
            </div>

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

            <div className="form-group">
              <label>Your Message</label>
              <textarea name="message" placeholder="Tell us about your vision…" required></textarea>
            </div>

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
      <Footer />
    </>
  );
}