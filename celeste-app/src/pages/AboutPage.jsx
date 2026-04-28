import PageHeader from '../components/PageHeader';
import Footer from '../components/Footer';

/* About Page - Company story, mission, values grid, team members */
export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About Us"
        subtitle="Discover the story behind Lumiere Visual Studio and our passion for capturing moments that matter."
      />
      <section className="about-section">
        <div className="about-content">
          <h2>Our Story</h2>
          <p>Lumiere Visual Studio was founded with a simple yet profound vision: to capture the beauty of human moments through the lens of exceptional photography. What started as a passion project has blossomed into a full-service photography studio serving clients across India and beyond.</p>
          <p>Our team of dedicated photographers and creative professionals believe that every moment tells a story worth preserving. Whether it is the joy of a wedding day, the elegance of a portrait, or the raw beauty of nature, we approach each project with meticulous attention to detail and artistic excellence.</p>

          <h2>Our Mission</h2>
          <p>To create timeless visual narratives that celebrate life's most precious moments, deliver exceptional quality that exceeds expectations, and build lasting relationships with our clients through trust and artistic integrity.</p>

          <h2>Our Values</h2>
          <div className="values-grid">
            <div className="value-card"><h3>Artistry</h3><p>Every photograph is a work of art, crafted with creativity and technical excellence.</p></div>
            <div className="value-card"><h3>Quality</h3><p>We never compromise on quality from pre-production to final delivery of every image.</p></div>
            <div className="value-card"><h3>Trust</h3><p>Your memories are sacred to us. We handle every project with utmost professionalism and care.</p></div>
            <div className="value-card"><h3>Innovation</h3><p>We embrace new techniques and technology to deliver fresh, contemporary photography.</p></div>
          </div>

          <h2>Meet Our Team</h2>
          <div className="team-grid">
            <div className="team-member">
              <div className="member-avatar">AS</div>
              <div className="member-name">Arjun Sharma</div>
              <div className="member-role">Lead Photographer</div>
              <div className="member-bio">12+ years of experience in wedding and portrait photography. Award-winning artist dedicated to capturing authentic moments.</div>
            </div>
            <div className="team-member">
              <div className="member-avatar">PP</div>
              <div className="member-name">Priya Patel</div>
              <div className="member-role">Creative Director</div>
              <div className="member-bio">Specializes in commercial and brand photography. Known for innovative visual storytelling and creative direction.</div>
            </div>
            <div className="team-member">
              <div className="member-avatar">RV</div>
              <div className="member-name">Rohan Verma</div>
              <div className="member-role">Post-Production Expert</div>
              <div className="member-bio">Master of digital editing and color grading. Ensures every image meets our highest quality standards.</div>
            </div>
          </div>

          <h2>Why Choose Lumiere?</h2>
          <p>We are not just photographers we are storytellers. Our commitment to excellence, attention to detail, and genuine care for our clients set us apart. With every project, we aim to exceed expectations and create photographs that will be treasured for generations to come.</p>
        </div>
      </section>
      <Footer />
    </>
  );
}

