// ============================================
// ZYGOBUS – Main JavaScript
// ============================================

const CITIES = [
  'Bangalore','Mumbai','Hyderabad','Chennai','Delhi',
  'Pune','Kolkata','Ahmedabad','Jaipur','Lucknow',
  'Kochi','Coimbatore','Mysore','Mangalore','Hubli',
  'Goa','Vizag','Vijayawada','Tirupati','Salem',
  'Madurai','Trichy','Nagpur','Indore','Bhopal',
  'Agra','Varanasi','Patna','Chandigarh','Amritsar'
];

const POPULAR_ROUTES = [
  { from:'Bangalore', to:'Hyderabad', price:450, duration:'6h 30m', buses:42, tag:'popular' },
  { from:'Mumbai', to:'Pune', price:280, duration:'3h 15m', buses:65, tag:'popular' },
  { from:'Chennai', to:'Bangalore', price:380, duration:'5h 45m', buses:38, tag:'deals' },
  { from:'Delhi', to:'Agra', price:320, duration:'4h', buses:28, tag:'popular' },
  { from:'Hyderabad', to:'Vijayawada', price:350, duration:'5h', buses:35, tag:'deals' },
  { from:'Kochi', to:'Coimbatore', price:290, duration:'4h 30m', buses:22, tag:'popular' },
  { from:'Jaipur', to:'Delhi', price:480, duration:'5h 30m', buses:30, tag:'popular' },
  { from:'Bangalore', to:'Goa', price:680, duration:'9h', buses:18, tag:'deals' },
];

// ===== NAVBAR SCROLL =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

// ===== AUTH STATE =====
(function initAuthState() {
  const user = JSON.parse(localStorage.getItem('zygobus_user') || 'null');
  const loginBtn = document.getElementById('loginBtn');
  const navActions = document.querySelector('.nav-actions');
  if (user && navActions) {
    // Replace login/signup buttons with user greeting + logout
    const signupBtn = navActions.querySelector('a[href="pages/register.html"], a[href="register.html"]');
    if (loginBtn) loginBtn.style.display = 'none';
    if (signupBtn) signupBtn.style.display = 'none';
    const greeting = document.createElement('span');
    greeting.style.cssText = 'color:#fff;font-weight:600;font-size:0.9rem;display:flex;align-items:center;gap:8px;';
    greeting.innerHTML = `<i class="fas fa-user-circle" style="color:var(--primary);font-size:1.1rem;"></i>${user.firstName}`;
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Logout';
    logoutBtn.className = 'btn-ghost';
    logoutBtn.style.cssText = 'cursor:pointer;border:none;background:none;';
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('zygobus_token');
      localStorage.removeItem('zygobus_user');
      window.location.reload();
    });
    navActions.insertBefore(logoutBtn, navActions.querySelector('.hamburger') || null);
    navActions.insertBefore(greeting, logoutBtn);
  }
})();

// ===== HAMBURGER =====
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger?.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  hamburger.classList.toggle('active');
});

// ===== SET DEFAULT DATE =====
const dateInput = document.getElementById('travelDate');
if (dateInput) {
  const today = new Date();
  dateInput.value = today.toISOString().split('T')[0];
  dateInput.min = today.toISOString().split('T')[0];
}

// ===== CITY AUTOCOMPLETE =====
function setupAutocomplete(inputId, suggestionsId) {
  const input = document.getElementById(inputId);
  const suggestionsEl = document.getElementById(suggestionsId);
  if (!input || !suggestionsEl) return;

  input.addEventListener('input', () => {
    const val = input.value.toLowerCase().trim();
    suggestionsEl.innerHTML = '';
    if (!val) return;
    const filtered = CITIES.filter(c => c.toLowerCase().startsWith(val)).slice(0,6);
    filtered.forEach(city => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.innerHTML = `<i class="fas fa-bus"></i> ${city}`;
      item.addEventListener('click', () => {
        input.value = city;
        suggestionsEl.innerHTML = '';
      });
      suggestionsEl.appendChild(item);
    });
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target)) suggestionsEl.innerHTML = '';
  });
}

setupAutocomplete('fromCity', 'fromSuggestions');
setupAutocomplete('toCity', 'toSuggestions');

// ===== SWAP CITIES =====
document.getElementById('swapBtn')?.addEventListener('click', () => {
  const from = document.getElementById('fromCity');
  const to = document.getElementById('toCity');
  if (from && to) { [from.value, to.value] = [to.value, from.value]; }
});

// ===== SEARCH BUTTON =====
document.getElementById('searchBtn')?.addEventListener('click', () => {
  const from = document.getElementById('fromCity')?.value.trim();
  const to = document.getElementById('toCity')?.value.trim();
  const date = document.getElementById('travelDate')?.value;
  if (!from) { showToast('Please enter source city', 'error'); return; }
  if (!to) { showToast('Please enter destination city', 'error'); return; }
  if (from.toLowerCase() === to.toLowerCase()) { showToast('Source and destination cannot be the same', 'error'); return; }
  const params = new URLSearchParams({ from, to, date });
  window.location.href = `pages/search-results.html?${params}`;
});

// ===== TAB BUTTONS =====
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ===== POPULAR ROUTES =====
function renderRoutes() {
  const grid = document.getElementById('routesGrid');
  if (!grid) return;
  grid.innerHTML = POPULAR_ROUTES.map(r => `
    <div class="route-card" onclick="searchRoute('${r.from}','${r.to}')">
      <div class="route-cities">
        <span class="route-city">${r.from}</span>
        <span class="route-arrow"><i class="fas fa-long-arrow-alt-right"></i></span>
        <span class="route-city">${r.to}</span>
      </div>
      <div class="route-meta">
        <div class="route-price">₹${r.price}<span style="font-size:0.75rem;color:var(--text-muted);font-weight:400;"> onwards</span></div>
        <div class="route-info"><i class="fas fa-clock"></i> ${r.duration}</div>
      </div>
      <div>
        <span class="route-tag ${r.tag === 'popular' ? 'tag-popular' : 'tag-deals'}">
          ${r.tag === 'popular' ? '🔥 Popular' : '💚 Best Deal'}
        </span>
        <span style="font-size:0.75rem;color:var(--text-muted);margin-left:8px;">${r.buses} buses</span>
      </div>
    </div>
  `).join('');
}

function searchRoute(from, to) {
  const date = new Date().toISOString().split('T')[0];
  const params = new URLSearchParams({ from, to, date });
  window.location.href = `pages/search-results.html?${params}`;
}

renderRoutes();

// ===== COUNTER ANIMATION =====
function animateCounter(el, target) {
  let current = 0;
  const duration = 2000;
  const steps = 60;
  const increment = target / steps;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = formatNumber(Math.floor(current));
  }, duration / steps);
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M+';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K+';
  return n + (n < 100 ? '%' : '+');
}

// Intersection Observer for counters
const statNums = document.querySelectorAll('.stat-num');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const target = parseInt(entry.target.dataset.target);
      animateCounter(entry.target, target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });
statNums.forEach(el => counterObserver.observe(el));

// ===== SCROLL REVEAL =====
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.style.animation = 'fadeInUp 0.6s ease both';
  });
}, { threshold: 0.1 });
document.querySelectorAll('.route-card,.feature-card,.offer-card,.testimonial-card').forEach(el => {
  el.style.opacity = '0';
  revealObserver.observe(el);
});

// ===== TOAST =====
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}

// ===== COPY COUPON CODE =====
function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    showToast(`✅ Code "${code}" copied!`, 'success');
  }).catch(() => {
    showToast(`Code: ${code}`, 'success');
  });
}
