// ============================================
// ZYGOBUS – Search Results JS (Real-Time API)
// ============================================

const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3001/api' : '/api';

const AMENITY_ICONS = {
  wifi:          { icon: 'fa-wifi',     label: 'Free WiFi' },
  charging:      { icon: 'fa-bolt',     label: 'Charging Point' },
  water:         { icon: 'fa-tint',     label: 'Water Bottle' },
  blanket:       { icon: 'fa-bed',      label: 'Blanket' },
  entertainment: { icon: 'fa-tv',       label: 'Entertainment' },
};

const params = new URLSearchParams(window.location.search);
let FROM = params.get('from') || 'Bangalore';
let TO   = params.get('to')   || 'Hyderabad';
let DATE = params.get('date') || new Date().toISOString().split('T')[0];

let selectedBus  = null;
let selectedSeats = [];
let baseFare = 0;
let allBuses = [];

// ── Top search bar ──────────────────────────────────────────
document.getElementById('csFrom').value = FROM;
document.getElementById('csTo').value   = TO;
document.getElementById('csDate').value = DATE;
document.getElementById('csDate').min   = new Date().toISOString().split('T')[0];

document.getElementById('csSwap').addEventListener('click', () => {
  const f = document.getElementById('csFrom');
  const t = document.getElementById('csTo');
  [f.value, t.value] = [t.value, f.value];
});

document.getElementById('csSearch').addEventListener('click', () => {
  FROM = document.getElementById('csFrom').value.trim();
  TO   = document.getElementById('csTo').value.trim();
  DATE = document.getElementById('csDate').value;
  if (!FROM || !TO) { showToast('Please fill source and destination', 'error'); return; }
  const p = new URLSearchParams({ from: FROM, to: TO, date: DATE });
  window.history.pushState({}, '', `?${p}`);
  fetchAndRenderBuses();
});

// ── Date Navigator ──────────────────────────────────────────
function renderDateNav() {
  const nav  = document.getElementById('dateNav');
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
      fetchAndRenderBuses();
    });
    nav.appendChild(chip);
  }
}

// ── Fetch buses from API ────────────────────────────────────
async function fetchAndRenderBuses() {
  const list = document.getElementById('busList');
  list.innerHTML = `
    <div style="text-align:center;padding:60px 24px;color:var(--text-muted);">
      <i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--primary);margin-bottom:16px;display:block;"></i>
      <p>Searching live buses…</p>
    </div>`;
  document.getElementById('noResults').style.display = 'none';
  document.getElementById('resultsTitle').innerHTML =
    `<strong>${FROM} → ${TO}</strong> <span>on ${formatDate(DATE)}</span>`;

  try {
    const res  = await fetch(`${API}/search?from=${encodeURIComponent(FROM)}&to=${encodeURIComponent(TO)}&date=${DATE}`);
    const data = await res.json();
    allBuses = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Search error:', e);
    allBuses = [];
  }

  applyFiltersAndRender();
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
}

// ── Render bus cards ────────────────────────────────────────
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
            <span style="font-size:0.7rem;color:var(--text-muted);margin-left:4px;">(${(bus.ratingCount || 0).toLocaleString('en-IN')})</span>
          </div>
        </div>
      </div>
      <div class="bus-card-bottom">
        <div class="bus-amenities">
          ${(bus.amenities || []).map(a => `<span class="amenity"><i class="fas ${AMENITY_ICONS[a]?.icon || 'fa-check'}"></i> ${AMENITY_ICONS[a]?.label || a}</span>`).join('')}
        </div>
        <div class="bus-actions">
          <span class="seats-left ${bus.seatsLeft <= 5 ? 'low-seats' : ''}">${bus.seatsLeft} seat${bus.seatsLeft !== 1 ? 's' : ''} left</span>
          <button class="btn-select-seat" onclick="openSeatModal(${bus.id})" ${bus.seatsLeft === 0 ? 'disabled' : ''}>
            <i class="fas fa-chair"></i> ${bus.seatsLeft === 0 ? 'Sold Out' : 'Select Seat'}
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Filters ─────────────────────────────────────────────────
function applyFiltersAndRender() {
  let filtered = [...allBuses];

  const activeTime = document.querySelector('.time-chip.active')?.dataset.time;
  if (activeTime && activeTime !== 'all') {
    filtered = filtered.filter(b => {
      const h = parseInt(b.departure.split(':')[0]);
      if (activeTime === 'morning')   return h >= 6  && h < 12;
      if (activeTime === 'afternoon') return h >= 12 && h < 18;
      if (activeTime === 'night')     return h >= 18 || h < 6;
      return true;
    });
  }

  const checkedTypes = [...document.querySelectorAll('.bus-type:checked')].map(el => el.value.toLowerCase());
  if (checkedTypes.length) {
    filtered = filtered.filter(b =>
      checkedTypes.some(t => b.busType.toLowerCase().includes(t.split(' ')[0]))
    );
  }

  const maxPrice = parseInt(document.getElementById('priceSlider').value);
  filtered = filtered.filter(b => b.price <= maxPrice);

  const ratingFilters = [...document.querySelectorAll('.rating-filter:checked')].map(el => parseFloat(el.value));
  if (ratingFilters.length) {
    const minRating = Math.min(...ratingFilters);
    filtered = filtered.filter(b => b.rating >= minRating);
  }

  const sort = document.getElementById('sortSelect').value;
  if (sort === 'price')      filtered.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
  else if (sort === 'departure')  filtered.sort((a, b) => a.departure.localeCompare(b.departure));
  else if (sort === 'rating')     filtered.sort((a, b) => b.rating - a.rating);

  renderBuses(filtered);
}

// Filter events
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
  document.querySelectorAll('.rating-filter').forEach(el => el.checked = false);
  document.getElementById('priceSlider').value = 2000;
  document.getElementById('priceMax').textContent = '₹2000';
  applyFiltersAndRender();
});

// ── Seat Modal (Real-Time) ───────────────────────────────────
async function openSeatModal(busId) {
  selectedBus   = allBuses.find(b => b.id === busId);
  if (!selectedBus) return;
  baseFare      = selectedBus.price;
  selectedSeats = [];

  document.getElementById('seatModal').classList.add('open');
  document.getElementById('seatLayout').innerHTML =
    `<div style="text-align:center;padding:40px;color:var(--text-muted);">
       <i class="fas fa-spinner fa-spin" style="font-size:1.5rem;color:var(--primary);"></i>
       <p style="margin-top:12px;">Loading live seat availability…</p>
     </div>`;
  updateSeatSummary();

  try {
    const res  = await fetch(`${API}/seats?scheduleId=${selectedBus.id}&date=${DATE}`);
    const data = await res.json();
    renderSeatLayout(data.totalSeats || 40, data.bookedSeats || []);
  } catch (e) {
    console.error('Seat fetch error:', e);
    renderSeatLayout(40, []);
  }
}

function renderSeatLayout(totalSeats, bookedSeats) {
  const layout  = document.getElementById('seatLayout');
  const rows    = Math.ceil(totalSeats / 4);
  const booked  = new Set(bookedSeats);
  // Ladies-only seats (last row, D column)
  const ladies  = new Set([`${rows}D`]);

  layout.innerHTML = '';

  for (let r = 1; r <= rows; r++) {
    const row = document.createElement('div');
    row.className = 'seat-row';
    row.innerHTML = `<div class="seat-row-num">${r}</div>`;

    ['A', 'B'].forEach(col => {
      const id   = `${r}${col}`;
      const seat = document.createElement('div');
      const isBooked = booked.has(id);
      seat.className = 'seat' + (isBooked ? ' booked-seat' : '');
      seat.textContent = col;
      seat.dataset.id  = id;
      seat.title = isBooked ? 'Already booked' : `Seat ${id}`;
      if (!isBooked) seat.addEventListener('click', () => toggleSeat(seat, id));
      row.appendChild(seat);
    });

    row.innerHTML += `<div class="aisle"></div>`;

    ['C', 'D'].forEach(col => {
      const id      = `${r}${col}`;
      const isBooked = booked.has(id);
      const isLadies = ladies.has(id);
      const seat    = document.createElement('div');
      seat.className = 'seat' + (isBooked ? ' booked-seat' : '') + (isLadies ? ' ladies-seat' : '');
      seat.textContent = col;
      seat.dataset.id  = id;
      seat.title = isBooked ? 'Already booked' : isLadies ? 'Ladies only' : `Seat ${id}`;
      if (!isBooked && !isLadies) seat.addEventListener('click', () => toggleSeat(seat, id));
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
document.getElementById('seatModal').addEventListener('click', e => {
  if (e.target === document.getElementById('seatModal')) document.getElementById('seatModal').classList.remove('open');
});

document.getElementById('proceedBook').addEventListener('click', () => {
  if (!selectedSeats.length) { showToast('Please select at least one seat', 'error'); return; }
  const p = new URLSearchParams({
    scheduleId: selectedBus.id,
    from:       FROM,
    to:         TO,
    date:       DATE,
    operator:   selectedBus.operator,
    seats:      selectedSeats.length,
    seatIds:    selectedSeats.join(', '),
    fare:       baseFare * selectedSeats.length,
    departure:  selectedBus.departure,
    arrival:    selectedBus.arrival,
    duration:   selectedBus.duration,
    busType:    selectedBus.busType,
  });
  window.location.href = `booking.html?${p}`;
});

// ── Toast ────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}

// ── Init ─────────────────────────────────────────────────────
renderDateNav();
fetchAndRenderBuses();
