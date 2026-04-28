
  let slides, dots, current;
  let testimonialSlides, testimonialDots, testimonialCurrent;

  const testimonialData = [
    {
      img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
      name: 'Sofia Marchetti',
      role: 'Travel Blogger, Rome',
      text: 'Absolutely breathtaking work. Every shot tells a story we didn\'t know we were living.'
    },
    {
      img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
      name: 'James Holloway',
      role: 'Creative Director, London',
      text: 'The team\'s eye for light and composition is unmatched. Our brand campaign exceeded expectations.'
    },
    {
      img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
      name: 'Amara Diallo',
      role: 'Wedding Client, Paris',
      text: 'From booking to delivery, the experience was seamless. The photos are simply magical.'
    },
    {
      img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
      name: 'Marcus Chen',
      role: 'E-commerce Founder, Singapore',
      text: 'Incredible attention to detail. Our product shots have driven a 40% uplift in conversions.'
    },
    {
      img: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80',
      name: 'Lena Bauer',
      role: 'Hospitality Owner, Bavaria',
      text: 'They captured the soul of our landscape retreat better than we imagined possible.'
    },
    {
      img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80',
      name: 'Ravi Shankar',
      role: 'Documentary Producer, Mumbai',
      text: 'Professional, punctual and extraordinarily talented. Highly recommend for any project.'
    },
    {
      img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
      name: 'Isabelle Fontaine',
      role: 'NGO Director, Geneva',
      text: 'The portrait series they created for our foundation gala was deeply moving and powerful.'
    },
    {
      img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
      name: 'Tomás Ferreira',
      role: 'Architect, Lisbon',
      text: 'Working with Lumière transformed how we see and share our architectural projects.'
    },
    {
      img: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=400&q=80',
      name: 'Priya Nair',
      role: 'Fashion Designer, Delhi',
      text: 'From the first call to the final files — an absolute pleasure. Will work with them forever.'
    }
  ];

  const galleryData = [
    {
      tag: 'Landscape',
      title: 'Mountain Lake',
      location: 'Himalayas, India',
      category: 'Nature Photography',
      price: '₹15,000',
      pills: ['Scenic', 'Adventure', 'Premium'],
      desc: 'Captured at dawn in the pristine Himalayan foothills, this serene mountain lake reflects the surrounding peaks in perfect symmetry. The golden hour light creates a magical atmosphere that showcases the raw beauty of untouched wilderness.',
      img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80'
    },
    {
      tag: 'Nature',
      title: 'Forest Path',
      location: 'Black Forest, Germany',
      category: 'Landscape Photography',
      price: '₹12,000',
      pills: ['Woodland', 'Mystical', 'Tranquil'],
      desc: 'A winding forest path shrouded in morning mist, leading the eye through ancient trees that have stood for centuries. The composition captures the essence of exploration and discovery in one of Europe\'s most enchanting woodlands.',
      img: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600&q=80'
    },
    {
      tag: 'Sunrise',
      title: 'Golden Hills',
      location: 'California, USA',
      category: 'Landscape Photography',
      price: '₹18,000',
      pills: ['Golden Hour', 'Dramatic', 'Iconic'],
      desc: 'Rolling hills bathed in the warm glow of sunrise, creating a tapestry of gold and amber that stretches to the horizon. This location offers unparalleled opportunities for capturing the transformative power of natural light.',
      img: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=80'
    },
    {
      tag: 'Valley',
      title: 'Panoramic Vista',
      location: 'Swiss Alps, Switzerland',
      category: 'Adventure Photography',
      price: '₹22,000',
      pills: ['Panoramic', 'Extreme', 'Breathtaking'],
      desc: 'A commanding view from the highest peaks overlooking vast valleys carved by ancient glaciers. The sheer scale and dramatic lighting make this one of the most sought-after locations for professional landscape photography.',
      img: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80'
    },
    {
      tag: 'Autumn',
      title: 'Golden Foliage',
      location: 'Vermont, USA',
      category: 'Seasonal Photography',
      price: '₹14,000',
      pills: ['Fall Colors', 'Vibrant', 'Timeless'],
      desc: 'The peak of autumn splendor where maple trees transform entire mountainsides into canvases of red, orange, and gold. Each season brings new opportunities to capture nature\'s most spectacular color displays.',
      img: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=600&q=80'
    },
    {
      tag: 'Coastal',
      title: 'Ocean Cliffs',
      location: 'Big Sur, California',
      category: 'Adventure Photography',
      price: '₹20,000',
      pills: ['Dramatic', 'Rugged', 'Ocean Views'],
      desc: 'Sheer cliffs meeting the relentless power of the Pacific Ocean, creating one of the most dynamic and challenging photography locations in the world. The constant interplay of light, water, and rock produces unforgettable images.',
      img: 'dummy.jpg'
    },
    {
      tag: 'Wildlife',
      title: 'Nature\'s Beauty',
      location: 'Serengeti, Tanzania',
      category: 'Wildlife Photography',
      price: '₹25,000',
      pills: ['Safari', 'Wildlife', 'Adventure'],
      desc: 'The great migration in full swing, where millions of animals move in perfect harmony across the vast plains. Capturing the raw power and grace of wildlife in their natural habitat requires patience, skill, and respect for the wild.',
      img: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=600&q=80'
    },
    {
      tag: 'Forest',
      title: 'Pine Forest',
      location: 'Black Hills, USA',
      category: 'Nature Photography',
      price: '₹13,000',
      pills: ['Evergreen', 'Majestic', 'Peaceful'],
      desc: 'Towering ponderosa pines standing sentinel over forest floors carpeted with fallen needles. The filtered light creates a cathedral-like atmosphere perfect for contemplative and spiritual photography sessions.',
      img: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600&q=80'
    },
    {
      tag: 'Summit',
      title: 'Mountain Peak',
      location: 'Mount Fuji, Japan',
      category: 'Adventure Photography',
      price: '₹28,000',
      pills: ['Summit', 'Cultural', 'Iconic'],
      desc: 'Standing atop one of Japan\'s most sacred mountains, watching the sunrise paint the sky in impossible colors. This legendary peak offers photographers the chance to create images that transcend the ordinary.',
      img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80'
    }
  ];

  let galleryCurrent = -1;

  function toggleMenu() {
    document.getElementById('mobileMenu').classList.toggle('open');
  }

  function goToSlide(n) {
    if (!slides || !dots) return; // Wait until initialized
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = n;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function goToTestimonialSlide(n) {
    if (!testimonialSlides || !testimonialDots) return;
    testimonialSlides[testimonialCurrent].classList.remove('active');
    testimonialDots[testimonialCurrent].classList.remove('active');
    testimonialCurrent = n;
    testimonialSlides[testimonialCurrent].classList.add('active');
    testimonialDots[testimonialCurrent].classList.add('active');
  }

  function createTestimonialSlides() {
    const slider = document.getElementById('testimonialSlider');
    const dotsContainer = document.getElementById('testimonialDots');
    if (!slider || !dotsContainer) return;

    slider.innerHTML = '';
    dotsContainer.innerHTML = '';

    const cardsPerSlide = 3;
    const slideCount = Math.ceil(testimonialData.length / cardsPerSlide);

    for (let i = 0; i < slideCount; i++) {
      const slide = document.createElement('div');
      slide.className = 'testimonial-slide';
      if (i === 0) slide.classList.add('active');

      const start = i * cardsPerSlide;
      const group = testimonialData.slice(start, start + cardsPerSlide);

      group.forEach(t => {
        const card = document.createElement('div');
        card.className = 'testimonial-card';
        card.innerHTML = `
          <img class="card-img" src="${t.img}" alt="${t.name}" />
          <div class="card-body">
            <div class="card-stars">★★★★★</div>
            <p class="card-quote">"${t.text}"</p>
            <div class="card-author"><strong>${t.name}</strong>${t.role}</div>
          </div>
        `;
        slide.appendChild(card);
      });

      slider.appendChild(slide);

      const dot = document.createElement('div');
      dot.className = i === 0 ? 'testimonial-dot active' : 'testimonial-dot';
      dot.addEventListener('click', () => goToTestimonialSlide(i));
      dotsContainer.appendChild(dot);
    }

    testimonialSlides = document.querySelectorAll('.testimonial-slide');
    testimonialDots = document.querySelectorAll('.testimonial-dot');
  }

  // ── GALLERY MODAL FUNCTIONS ──
  function openGalleryModal(index) {
    galleryCurrent = index;
    const item = galleryData[index];
    document.getElementById('galleryModalImg').src = item.img;
    document.getElementById('galleryModalImg').alt = item.title;
    document.getElementById('galleryModalBadge').textContent = item.tag;
    document.getElementById('galleryModalTag').textContent = item.tag;
    document.getElementById('galleryModalTitle').textContent = item.title;
    document.getElementById('galleryModalLocation').textContent = item.location;
    document.getElementById('galleryModalCategory').textContent = item.category;
    document.getElementById('galleryModalDesc').textContent = item.desc;
    document.getElementById('galleryModalPrice').textContent = item.price;

    const pillColors = ['pill-amber', 'pill-teal', 'pill-blue'];
    document.getElementById('galleryModalPills').innerHTML = item.pills
      .map((p, j) => `<span class="pill ${pillColors[j % 3]}">${p}</span>`)
      .join('');

    // Re-trigger animation
    const box = document.getElementById('galleryModalBox');
    box.style.animation = 'none';
    void box.offsetHeight;
    box.style.animation = '';

    document.getElementById('galleryModal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeGalleryModal() {
    document.getElementById('galleryModal').classList.remove('open');
    document.body.style.overflow = '';
    galleryCurrent = -1;
  }

  function handleGalleryBackdropClick(e) {
    if (e.target === document.getElementById('galleryModal')) closeGalleryModal();
  }

  function navigateGallery(dir) {
    if (galleryCurrent < 0) return;
    galleryCurrent = (galleryCurrent + dir + galleryData.length) % galleryData.length;
    openGalleryModal(galleryCurrent);
  }

  // ── GALLERY GRID SETUP ──
  function setupGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    const items = grid.querySelectorAll('.gallery-item');
    items.forEach((item, index) => {
      item.addEventListener('click', () => openGalleryModal(index));
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    /* ── SLIDER LOGIC ── */
    current = 0;
    slides = document.querySelectorAll('.slide');
    dots   = document.querySelectorAll('.dot');
    setInterval(() => {
      goToSlide((current + 1) % slides.length);
    },4000);

    /* ── TESTIMONIAL SLIDER LOGIC ── */
    testimonialCurrent = 0;
    createTestimonialSlides();
    setInterval(() => {
      goToTestimonialSlide((testimonialCurrent + 1) % testimonialSlides.length);
    }, 6000);

    /* ── GALLERY SETUP ── */
    setupGallery();
  });


  /* ── GALLERY KEYBOARD CONTROLS ── */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeGalleryModal();
    if (e.key === 'ArrowRight') navigateGallery(1);
    if (e.key === 'ArrowLeft') navigateGallery(-1);
  });


  /* ── CONTACT FORM SUBMIT FEEDBACK ── */

  function handleSubmit(e) {
    // Prevents the browser from reloading the page (default form submit behaviour)
    e.preventDefault();

    // e.target = the form element; querySelector finds the button inside it
    const btn = e.target.querySelector('.submit-btn');

    // Change button to confirmation state
    btn.textContent = 'Message Sent ✓';
    btn.style.background = 'var(--gold)';
    btn.style.color = 'var(--dark)';

    // setTimeout runs the callback after 3000ms (3 seconds)
    setTimeout(() => {
      // Reset button back to original label and style
      btn.textContent = 'Send Message →';
      btn.style.background = 'transparent';
      btn.style.color = 'var(--gold)';
      // e.target.reset() clears all form fields back to empty
      e.target.reset();
    }, 3000);
  }



  

