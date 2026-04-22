// ============================================
// ZYGOBUS – Search Results JS
// ============================================

const OPERATORS = [
  { name: 'VRL Travels', type: 'Volvo AC Sleeper', amenities: ['wifi','charging','water','blanket'], rating: 4.5 },
  { name: 'SRS Travels', type: 'AC Seater', amenities: ['charging','water'], rating: 4.2 },
  { name: 'Orange Travels', type: 'AC Sleeper', amenities: ['wifi','charging','water','blanket'], rating: 4.6 },
  { name: 'KSRTC Express', type: 'Non-AC Seater', amenities: ['water'], rating: 3.8 },
  { name: 'Chartered Bus', type: 'AC Seater', amenities: ['charging','water','wifi'], rating: 4.3 },
  { name: 'Patel Travels', type: 'Volvo Multi-Axle', amenities: ['wifi','charging','water','blanket','entertainment'], rating: 4.7 },
  { name: 'IntraBus', type: 'AC Sleeper', amenities: ['charging','water','blanket'], rating: 4.1 },
  { name: 'Greenline Travels', type: 'Non-AC Sleeper', amenities: ['water'], rating: 3.6 },
];

const AMENITY_ICONS = {
  wifi: { icon: 'fa-wifi', label: 'Free WiFi' },
  charging: { icon: 'fa-bolt', label: 'Charging Point' },
  water: { icon: 'fa-tint', label: 'Water Bottle' },
  blanket: { icon: 'fa-bed', label: 'Blanket' },
  entertainment: { icon: 'fa-tv', label: 'Entertainment' },
};

const params = new URLSearchParams(window.location.search);
let FROM = params.get('from') || 'Bangalore';
let TO = params.get('to') || 'Hyderabad';
let DATE = params.get('date') || new Date().toISOString().split('T')[0];

let selectedBus = null;
let selectedSeats = [];
let baseFare = 0;

// ===== POPULATE TOP SEARCH =====
document.getElementById('csFrom').value = FROM;
document.getElementById('csTo').value = TO;
document.getElementById('csDate').value = DATE;
document.getElementById('csDate').min = new Date().toISOString().split('T')[0];

// ===== SWAP =====
document.getElementById('csSwap').addEventListener('click', () => {
  const f = document.getElementById('csFrom');
  const t = document.getElementById('csTo');
  [f.value, t.value] = [t.value, f.value];
});

// ===== SEARCH =====
document.getElementById('csSearch').addEventListener('click', () => {
  FROM = document.getElementById('csFrom').value.trim();
  TO = document.getElementById('csTo').value.trim();
  DATE = document.getElementById('csDate').value;
  if (!FROM || !TO) { showToast('Please fill all fields', 'error'); return; }
  const p = new URLSearchParams({ from: FROM, to: TO, date: DATE });
  window.history.pushState({}, '', `?${p}`);
  generateAndRenderBuses();
});

// ===== DATE NAVIGATOR =====
function renderDateNav() {
  const nav = document.getElementById('dateNav');
  const base = new Date(DATE);
  nav.innerHTML = '';
  for (let i = -2; i <= 4; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const chip = document.createElement('div');
    chip.className = 'date-chip' + (i === 0 ? ' active' : '');
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    chip.innerHTML = `<span class="chip-day">${dayNames[d.getDay()]}</span><span class="chip-date">${d.getDate()} ${d.toLocaleString('default',{month:'short'})}</span>`;
    chip.addEventListener('click', () => {
      DATE = d.toISOString().split('T')[0];
      document.getElementById('csDate').value = DATE;
      document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      generateAndRenderBuses();
    });
    nav.appendChild(chip);
  }
}

// ===== GENERATE BUSES =====
function generateBuses() {
  const seed = (FROM + TO + DATE).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = (n) => { let x = Math.sin(seed + n) * 10000; return x - Math.floor(x); };
  const count = 5 + Math.floor(rng(1) * 6);
  const buses = [];
  const departures = [6,7,8,9,10,13,14,15,18,19,20,21,22,23];
  const hours = [5,6,7,8,9];
  for (let i = 0; i < count; i++) {
    const op = OPERATORS[Math.floor(rng(i * 3) * OPERATORS.length)];
    const depH = departures[Math.floor(rng(i * 5) * departures.length)];
    const depM = Math.floor(rng(i * 7) * 4) * 15;
    const durH = hours[Math.floor(rng(i * 11) * hours.length)];
    const durM = Math.floor(rng(i * 13) * 4) * 15;
    const arrH = (depH + durH + Math.floor((depM + durM) / 60)) % 24;
    const arrM = (depM + durM) % 60;
    const basePrice = 200 + Math.floor(rng(i * 17) * 800);
    const seats = 3 + Math.floor(rng(i * 19) * 18);
    buses.push({
      id: i,
      operator: op.name,
      busType: op.type,
      amenities: op.amenities,
      rating: op.rating,
      departure: `${String(depH).padStart(2,'0')}:${String(depM).padStart(2,'0')}`,
      arrival: `${String(arrH).padStart(2,'0')}:${String(arrM).padStart(2,'0')}`,
      duration: `${durH}h ${durM > 0 ? durM + 'm' : ''}`,
      price: basePrice,
      seatsLeft: seats,
    });
  }
  return buses;
}

let allBuses = [];

function generateAndRenderBuses() {
  allBuses = generateBuses();
  applyFiltersAndRender();
  document.getElementById('resultsTitle').innerHTML =
    `<strong>${FROM} → ${TO}</strong> <span>on ${formatDate(DATE)}</span>`;
}

function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
}

// ===== RENDER BUS CARDS =====
function renderBuses(buses) {
  const list = document.getElementById('busList');
  const noResults = document.getElementById('noResults');
  if (!buses.length) {
    list.innerHTML = '';
    noResults.style.display = 'block';
    return;
  }
  noResults.style.display = 'none';
  list.innerHTML = buses.map(bus => `
    <div class="bus-card" id="bus-${bus.id}">
      <div class="bus-card-top">
        <div class="bus-operator">
          <div class="operator-name">${bus.operator}</div>
          <span class="bus-type-badge">${bus.busType}</span>
        </div>
        <div class="bus-time">
          <div class="time-value">${bus.departure}</div>
          <div class="time-city">${FROM}</div>
        </div>
        <div class="bus-duration">
          <div class="duration-line"></div>
          <div class="duration-text"><i class="fas fa-clock"></i> ${bus.duration}</div>
        </div>
        <div class="bus-time">
          <div class="time-value">${bus.arrival}</div>
          <div class="time-city">${TO}</div>
        </div>
        <div class="bus-price">
          <div class="price-value">₹${bus.price}</div>
          <div class="price-label">per seat</div>
          <div class="bus-rating">
            <span class="rating-badge">${bus.rating}★</span>
          </div>
        </div>
      </div>
      <div class="bus-card-bottom">
        <div class="bus-amenities">
          ${bus.amenities.map(a => `<span class="amenity"><i class="fas ${AMENITY_ICONS[a]?.icon || 'fa-check'}"></i> ${AMENITY_ICONS[a]?.label || a}</span>`).join('')}
        </div>
        <div class="bus-actions">
          <span class="seats-left">${bus.seatsLeft} seats left</span>
          <button class="btn-select-seat" onclick="openSeatModal(${bus.id})">
            <i class="fas fa-chair"></i> Select Seat
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ===== FILTERS =====
function applyFiltersAndRender() {
  let filtered = [...allBuses];

  // Time filter
  const activeTime = document.querySelector('.time-chip.active')?.dataset.time;
  if (activeTime && activeTime !== 'all') {
    filtered = filtered.filter(b => {
      const h = parseInt(b.departure.split(':')[0]);
      if (activeTime === 'morning') return h >= 6 && h < 12;
      if (activeTime === 'afternoon') return h >= 12 && h < 18;
      if (activeTime === 'night') return h >= 18 || h < 6;
      return true;
    });
  }

  // Bus type filter
  const checkedTypes = [...document.querySelectorAll('.bus-type:checked')].map(el => el.value.toLowerCase());
  if (checkedTypes.length) {
    filtered = filtered.filter(b => checkedTypes.some(t => b.busType.toLowerCase().includes(t.toLowerCase().split(' ')[0])));
  }

  // Price filter
  const maxPrice = parseInt(document.getElementById('priceSlider').value);
  filtered = filtered.filter(b => b.price <= maxPrice);

  // Sort
  const sort = document.getElementById('sortSelect').value;
  if (sort === 'price') filtered.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
  else if (sort === 'departure') filtered.sort((a, b) => a.departure.localeCompare(b.departure));
  else if (sort === 'rating') filtered.sort((a, b) => b.rating - a.rating);

  renderBuses(filtered);
}

// ===== FILTER EVENTS =====
document.querySelectorAll('.time-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.time-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    applyFiltersAndRender();
  });
});
document.querySelectorAll('.bus-type, .rating-filter').forEach(el => el.addEventListener('change', applyFiltersAndRender));
document.getElementById('sortSelect').addEventListener('change', applyFiltersAndRender);
document.getElementById('priceSlider').addEventListener('input', function() {
  document.getElementById('priceMax').textContent = `₹${this.value}`;
  applyFiltersAndRender();
});
document.getElementById('clearFilters').addEventListener('click', () => {
  document.querySelectorAll('.time-chip').forEach((c, i) => c.classList.toggle('active', i === 0));
  document.querySelectorAll('.bus-type').forEach(el => el.checked = true);
  document.getElementById('priceSlider').value = 2000;
  document.getElementById('priceMax').textContent = '₹2000';
  applyFiltersAndRender();
});

// ===== SEAT MODAL =====
function openSeatModal(busId) {
  selectedBus = allBuses.find(b => b.id === busId);
  if (!selectedBus) return;
  baseFare = selectedBus.price;
  selectedSeats = [];
  renderSeatLayout();
  updateSeatSummary();
  document.getElementById('seatModal').classList.add('open');
}

function renderSeatLayout() {
  const layout = document.getElementById('seatLayout');
  const rows = 10;
  layout.innerHTML = '';
  // Generate random booked/ladies seats
  const bookedSeats = new Set();
  const ladiesSeats = new Set([3, 4]);
  for (let i = 0; i < 14; i++) {
    const r = Math.floor(Math.random() * rows) + 1;
    const c = ['A','B','C','D'][Math.floor(Math.random() * 4)];
    bookedSeats.add(`${r}${c}`);
  }

  for (let r = 1; r <= rows; r++) {
    const row = document.createElement('div');
    row.className = 'seat-row';
    row.innerHTML = `<div class="seat-row-num">${r}</div>`;
    ['A','B'].forEach(col => {
      const id = `${r}${col}`;
      const seat = document.createElement('div');
      seat.className = 'seat' + (bookedSeats.has(id) ? ' booked-seat' : '') + (ladiesSeats.has(r) && col === 'D' ? ' ladies-seat' : '');
      seat.textContent = col;
      seat.dataset.id = id;
      if (!seat.classList.contains('booked-seat') && !seat.classList.contains('ladies-seat')) {
        seat.addEventListener('click', () => toggleSeat(seat, id));
      }
      row.appendChild(seat);
    });
    row.innerHTML += `<div class="aisle"></div>`;
    ['C','D'].forEach(col => {
      const id = `${r}${col}`;
      const isLadies = ladiesSeats.has(r) && col === 'D';
      const seat = document.createElement('div');
      seat.className = 'seat' + (bookedSeats.has(id) ? ' booked-seat' : '') + (isLadies ? ' ladies-seat' : '');
      seat.textContent = col;
      seat.dataset.id = id;
      if (!seat.classList.contains('booked-seat') && !seat.classList.contains('ladies-seat')) {
        seat.addEventListener('click', () => toggleSeat(seat, id));
      }
      row.appendChild(seat);
    });
    layout.appendChild(row);
  }
}

function toggleSeat(el, id) {
  if (selectedSeats.includes(id)) {
    selectedSeats = selectedSeats.filter(s => s !== id);
    el.classList.remove('selected-seat');
  } else if (selectedSeats.length < 6) {
    selectedSeats.push(id);
    el.classList.add('selected-seat');
  } else {
    showToast('Maximum 6 seats per booking', 'error');
  }
  updateSeatSummary();
}

function updateSeatSummary() {
  document.getElementById('selectedSeats').textContent = selectedSeats.length ? selectedSeats.join(', ') : 'None';
  document.getElementById('totalFare').textContent = `₹${baseFare * selectedSeats.length}`;
}

document.getElementById('modalClose').addEventListener('click', () => document.getElementById('seatModal').classList.remove('open'));
document.getElementById('modalCancelBtn').addEventListener('click', () => document.getElementById('seatModal').classList.remove('open'));
document.getElementById('seatModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('seatModal')) document.getElementById('seatModal').classList.remove('open');
});

document.getElementById('proceedBook').addEventListener('click', () => {
  if (!selectedSeats.length) { showToast('Please select at least one seat', 'error'); return; }
  const p = new URLSearchParams({
    from:      FROM,
    to:        TO,
    date:      DATE,
    operator:  selectedBus.operator,
    seats:     selectedSeats.length,           // numeric count for backend
    seatIds:   selectedSeats.join(', '),        // human-readable labels
    fare:      baseFare * selectedSeats.length,
    departure: selectedBus.departure,
    arrival:   selectedBus.arrival,
    duration:  selectedBus.duration,
    busType:   selectedBus.busType,
  });
  window.location.href = `booking.html?${p}`;
});

// ===== TOAST =====
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}

// ===== INIT =====
renderDateNav();
generateAndRenderBuses();
