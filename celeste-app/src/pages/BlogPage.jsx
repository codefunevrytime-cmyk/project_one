import PageHeader from '../components/PageHeader';
import Footer from '../components/Footer';
import { blogData } from '../data/blogData';

/* Blog Page - Grid of 6 article cards */
export default function BlogPage() {
  return (
    <>
      <PageHeader
        title="Our Blog"
        subtitle="Stories, tips, and insights about photography, visual art, and capturing life's beautiful moments."
      />
      <section className="blog-section">
        <h2 className="section-title" style={{ textAlign: 'center' }}>Latest Articles</h2>
        <div className="section-line" style={{ margin: '0 auto 40px' }}></div>
        <div className="blog-grid">
          {blogData.map((post) => (
            <div key={post.title} className="blog-card">
              <div className="blog-image">{post.emoji}</div>
              <div className="blog-content">
                <div className="blog-category">{post.category}</div>
                <div className="blog-title">{post.title}</div>
                <div className="blog-meta">
                  <div className="blog-meta-item">📅 {post.date}</div>
                  <div className="blog-meta-item">⏱️ {post.readTime}</div>
                </div>
                <div className="blog-excerpt">{post.excerpt}</div>
                <a href="#" className="read-more">Read More →</a>
              </div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </>
  );
}

