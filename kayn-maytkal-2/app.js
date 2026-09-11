const els = {
  splash: document.getElementById('splash'),
  locateBtn: document.getElementById('locateBtn'),
  emptyLocateBtn: document.getElementById('emptyLocateBtn'),
  searchInput: document.getElementById('searchInput'),
  clearSearch: document.getElementById('clearSearch'),
  radiusSelect: document.getElementById('radiusSelect'),
  sortSelect: document.getElementById('sortSelect'),
  categoryChips: document.getElementById('categoryChips'),
  statusText: document.getElementById('statusText'),
  results: document.getElementById('results'),
  emptyState: document.getElementById('emptyState'),
  resultCount: document.getElementById('resultCount'),
  favorites: document.getElementById('favorites'),
  favoritesEmpty: document.getElementById('favoritesEmpty'),
  favoriteCount: document.getElementById('favoriteCount'),
  template: document.getElementById('placeCardTemplate')
};

const state = {
  position: null,
  places: [],
  filtered: [],
  category: 'all',
  favorites: JSON.parse(localStorage.getItem('kaynMaytkalFavorites') || '[]'),
  map: null,
  markers: []
};

window.addEventListener('load', () => {
  setTimeout(() => els.splash.classList.add('hidden'), 850);
  renderFavorites();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
});

function setStatus(text) { els.statusText.textContent = text; }
function deg2rad(v) { return v * Math.PI / 180; }
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function locate() {
  if (!navigator.geolocation) {
    setStatus('La géolocalisation n’est pas disponible sur cet appareil.');
    return;
  }
  setStatus('كنقلب على localisation ديالك...');
  els.locateBtn.disabled = true;
  navigator.geolocation.getCurrentPosition(async pos => {
    state.position = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    els.locateBtn.disabled = false;
    setStatus('لقيناك. كنقلب دابا على بلايص قريبة...');
    await loadNearby();
  }, err => {
    els.locateBtn.disabled = false;
    if (err.code === 1) setStatus('خاصك تسمح بالـ localisation من إعدادات المتصفح.');
    else setStatus('ما قدرناش نحددو المكان ديالك. عاود جرّب.');
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
}

async function loadNearby() {
  if (!state.position) return;
  const radius = Number(els.radiusSelect.value);
  const { lat, lon } = state.position;
  const query = `[out:json][timeout:25];(node["amenity"~"restaurant|fast_food|cafe"](around:${radius},${lat},${lon});way["amenity"~"restaurant|fast_food|cafe"](around:${radius},${lat},${lon});node["shop"="bakery"](around:${radius},${lat},${lon});way["shop"="bakery"](around:${radius},${lat},${lon}););out center tags;`;
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: 'data=' + encodeURIComponent(query)
    });
    if (!res.ok) throw new Error('Overpass error');
    const data = await res.json();
    state.places = data.elements.map(toPlace).filter(Boolean);
    applyFilters();
    setStatus(state.places.length ? `لقينا ${state.places.length} بلاصة فالنطاق اللي اخترتي.` : 'ما لقيناش نتائج فهاد النطاق. جرّب توسّع distance.');
  } catch (e) {
    setStatus('وقع مشكل فالتحميل. تأكد من الإنترنت وعاود جرّب.');
  }
}

function toPlace(el) {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  const t = el.tags || {};
  const category = t.amenity || (t.shop === 'bakery' ? 'bakery' : 'restaurant');
  const name = t.name || t['name:fr'] || t['name:ar'] || categoryLabel(category);
  const address = [t['addr:housenumber'], t['addr:street'], t['addr:suburb'], t['addr:city']].filter(Boolean).join(', ');
  return {
    id: `${el.type}-${el.id}`,
    name,
    category,
    cuisine: t.cuisine || '',
    address: address || 'Adresse non renseignée',
    lat,
    lon,
    distance: distanceKm(state.position.lat, state.position.lon, lat, lon)
  };
}

function categoryLabel(category) {
  return ({ fast_food:'Fast food', restaurant:'Restaurant', cafe:'Café', bakery:'Boulangerie' })[category] || 'À manger';
}

function categoryIcon(category) {
  return ({ fast_food:'🍔', restaurant:'🍽️', cafe:'☕', bakery:'🥐' })[category] || '🍴';
}

function applyFilters() {
  const q = els.searchInput.value.trim().toLowerCase();
  const cat = state.category;
  state.filtered = state.places.filter(p => {
    const matchCat = cat === 'all' || p.category === cat;
    const haystack = `${p.name} ${p.cuisine} ${p.address}`.toLowerCase();
    return matchCat && (!q || haystack.includes(q));
  });
  if (els.sortSelect.value === 'distance') state.filtered.sort((a,b) => a.distance - b.distance);
  else state.filtered.sort((a,b) => a.name.localeCompare(b.name));
  renderResults();
  updateMap();
}

function renderResults() {
  els.results.innerHTML = '';
  els.resultCount.textContent = `${state.filtered.length} résultat${state.filtered.length === 1 ? '' : 's'}`;
  els.emptyState.style.display = state.filtered.length ? 'none' : 'block';
  state.filtered.forEach(place => els.results.appendChild(makeCard(place)));
}

function makeCard(place) {
  const card = els.template.content.firstElementChild.cloneNode(true);
  card.querySelector('.place-icon').textContent = categoryIcon(place.category);
  card.querySelector('.place-name').textContent = place.name;
  card.querySelector('.place-meta').textContent = `${categoryLabel(place.category)}${place.cuisine ? ' • ' + place.cuisine.replaceAll(';', ', ') : ''} • ${place.distance.toFixed(1)} km`;
  card.querySelector('.place-address').textContent = place.address;
  const fav = card.querySelector('.favorite-btn');
  const active = state.favorites.some(f => f.id === place.id);
  fav.textContent = active ? '♥' : '♡';
  fav.classList.toggle('active', active);
  fav.addEventListener('click', () => toggleFavorite(place));
  card.querySelector('.route-btn').addEventListener('click', () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`, '_blank', 'noopener');
  });
  card.querySelector('.map-btn').addEventListener('click', () => {
    openView('mapView');
    setTimeout(() => {
      initMap();
      state.map.setView([place.lat, place.lon], 17);
    }, 80);
  });
  return card;
}

function toggleFavorite(place) {
  const idx = state.favorites.findIndex(f => f.id === place.id);
  if (idx >= 0) state.favorites.splice(idx, 1); else state.favorites.push(place);
  localStorage.setItem('kaynMaytkalFavorites', JSON.stringify(state.favorites));
  renderResults();
  renderFavorites();
}

function renderFavorites() {
  els.favorites.innerHTML = '';
  els.favoriteCount.textContent = state.favorites.length;
  els.favoritesEmpty.style.display = state.favorites.length ? 'none' : 'block';
  state.favorites.forEach(place => els.favorites.appendChild(makeCard(place)));
}

function initMap() {
  if (state.map) {
    state.map.invalidateSize();
    return;
  }
  state.map = L.map('map', { zoomControl:true }).setView([33.5731, -7.5898], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'&copy; OpenStreetMap contributors'
  }).addTo(state.map);
}

function updateMap() {
  if (!state.map) return;
  state.markers.forEach(m => m.remove());
  state.markers = [];
  if (state.position) {
    const me = L.circleMarker([state.position.lat, state.position.lon], { radius:9, weight:4 }).addTo(state.map).bindPopup('أنت هنا');
    state.markers.push(me);
  }
  state.filtered.forEach(p => {
    const m = L.marker([p.lat, p.lon]).addTo(state.map).bindPopup(`<strong>${escapeHtml(p.name)}</strong><br>${categoryLabel(p.category)} • ${p.distance.toFixed(1)} km`);
    state.markers.push(m);
  });
  if (state.filtered.length) {
    const bounds = L.latLngBounds(state.filtered.map(p => [p.lat, p.lon]));
    if (state.position) bounds.extend([state.position.lat, state.position.lon]);
    state.map.fitBounds(bounds, { padding:[30,30], maxZoom:15 });
  } else if (state.position) state.map.setView([state.position.lat, state.position.lon], 14);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function openView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active-view', v.id === viewId));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
  if (viewId === 'mapView') {
    initMap();
    setTimeout(() => { state.map.invalidateSize(); updateMap(); }, 100);
  }
  if (viewId === 'favoritesView') renderFavorites();
}

document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => openView(btn.dataset.view)));
els.locateBtn.addEventListener('click', locate);
els.emptyLocateBtn.addEventListener('click', locate);
els.searchInput.addEventListener('input', applyFilters);
els.clearSearch.addEventListener('click', () => { els.searchInput.value=''; applyFilters(); els.searchInput.focus(); });
els.radiusSelect.addEventListener('change', () => state.position ? loadNearby() : null);
els.sortSelect.addEventListener('change', applyFilters);
els.categoryChips.addEventListener('click', e => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  state.category = btn.dataset.category;
  applyFilters();
});
