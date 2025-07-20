// Smooth scroll for navigation
const navLinks = document.querySelectorAll('.main-nav a');
navLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      window.scrollTo({
        top: target.offsetTop - 40,
        behavior: 'smooth'
      });
    }
  });
});

// Simple form validation
const form = document.querySelector('.get-started-form');
if (form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = form.querySelector('input[type="text"]').value.trim();
    const email = form.querySelector('input[type="email"]').value.trim();
    const message = form.querySelector('textarea').value.trim();
    if (!name || !email || !message) {
      alert('Please fill in all fields.');
      return;
    }
    alert('Thank you for your inquiry! We will get back to you soon.');
    form.reset();
  });
}

// Geometric pattern animation for banner
const geoBg = document.querySelector('.geometric-bg');
if (geoBg) {
  let angle = 0;
  setInterval(() => {
    angle += 0.2;
    geoBg.style.background = `repeating-linear-gradient(${135 + angle}deg, transparent, transparent 40px, #c8956d 41px, transparent 42px), repeating-linear-gradient(${-135 - angle}deg, transparent, transparent 40px, #d4a574 41px, transparent 42px)`;
  }, 60);
}

window.addEventListener('scroll', function() {
  const topbar = document.querySelector('.topbar');
  if (window.scrollY > 10) {
    topbar.classList.add('scrolled');
  } else {
    topbar.classList.remove('scrolled');
  }
}); 