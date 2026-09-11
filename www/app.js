const els = {
  splash: document.getElementById('splash'),
  offlineBanner: document.getElementById('offlineBanner'),
  installBtn: document.getElementById('installBtn'),
  locateBtn: document.getElementById('locateBtn'),
  emptyLocateBtn: document.getElementById('emptyLocateBtn'),
  surpriseBtn: document.getElementById('surpriseBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
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
  privacyBtn: document.getElementById('privacyBtn'),
  privacyDialog: document.getElementById('privacyDialog'),
  privacyClose: document.getElementById('privacyClose'),
  template: document.getElementById('placeCardTemplate')
};

const state = {
  position: null,
  places: [],
  filtered: [],
  category: 'all',
  favorites: safeJsonParse(localStorage.getItem('kaynMaytkalFavorites'), []),
  map: null,
  markers: [],
  leafletLoading: null,
  deferredInstallPrompt: null,
  loading: false
};

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

window.addEventListener('load', () => {
  setTimeout(() => els.splash.classList.add('hidden'), 650);
  renderFavorites();
  updateOnlineState();
  if (!window.AndroidBridge && 'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  if (new URLSearchParams(location.search).get('demo') === '1') loadDemoData();
  if (location.hash === '#favorites') openView('favoritesView');
  else if (location.hash === '#map') openView('mapView');
});

window.addEventListener('online', updateOnlineState);
window.addEventListener('offline', updateOnlineState);
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  state.deferredInstallPrompt = event;
  els.installBtn.hidden = false;
});
window.addEventListener('appinstalled', () => {
  state.deferredInstallPrompt = null;
  els.installBtn.hidden = true;
  setStatus('Kayn Maytkal تْنصّبات بنجاح ✅');
});

function safeJsonParse(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}
function setStatus(text) { els.statusText.textContent = text; }
function updateOnlineState() { els.offlineBanner.hidden = navigator.onLine; }

function openExternal(url) {
  if (window.AndroidBridge?.openUrl) {
    window.AndroidBridge.openUrl(url);
    return;
  }
  window.open(url, '_blank', 'noopener');
}
function deg2rad(v) { return v * Math.PI / 180; }
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function installApp() {
  if (!state.deferredInstallPrompt) return;
  state.deferredInstallPrompt.prompt();
  await state.deferredInstallPrompt.userChoice.catch(() => null);
  state.deferredInstallPrompt = null;
  els.installBtn.hidden = true;
}

function locate() {
  if (!navigator.geolocation) {
    setStatus('La géolocalisation n’est pas disponible sur cet appareil.');
    return;
  }
  if (!navigator.onLine) {
    setStatus('خاص الإنترنت باش نقلبو على بلايص جديدة.');
    return;
  }
  setStatus('كنقلب على localisation ديالك...');
  setLoading(true);
  navigator.geolocation.getCurrentPosition(async pos => {
    state.position = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    setStatus('لقيناك. كنقلب دابا على بلايص قريبة...');
    await loadNearby();
  }, err => {
    setLoading(false);
    if (err.code === 1) setStatus('خاصك تسمح بالـ localisation من إعدادات المتصفح.');
    else if (err.code === 3) setStatus('تأخر تحديد المكان. عاود جرّب فبلاصة فيها GPS أو réseau مزيان.');
    else setStatus('ما قدرناش نحددو المكان ديالك. عاود جرّب.');
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
}

function setLoading(value) {
  state.loading = value;
  els.locateBtn.disabled = value;
  els.emptyLocateBtn.disabled = value;
  els.refreshBtn.disabled = value;
  els.locateBtn.textContent = value ? '…' : '⌖';
}

async function loadNearby() {
  if (!state.position || state.loading && state.places.length === 0) {
    // state.loading may already be true from locate; continue intentionally.
  }
  if (!state.position) return;
  if (!navigator.onLine) {
    setLoading(false);
    setStatus('ما كاينش الإنترنت باش نحدّث النتائج.');
    return;
  }
  setLoading(true);
  const radius = Number(els.radiusSelect.value);
  const { lat, lon } = state.position;
  const query = `[out:json][timeout:25];(node["amenity"~"restaurant|fast_food|cafe"](around:${radius},${lat},${lon});way["amenity"~"restaurant|fast_food|cafe"](around:${radius},${lat},${lon});node["shop"="bakery"](around:${radius},${lat},${lon});way["shop"="bakery"](around:${radius},${lat},${lon}););out center tags;`;

  let lastError;
  try {
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 18000);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: 'data=' + encodeURIComponent(query),
          signal: controller.signal
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        state.places = dedupePlaces(data.elements.map(toPlace).filter(Boolean));
        applyFilters();
        setStatus(state.places.length ? `لقينا ${state.places.length} بلاصة فالنطاق اللي اخترتي.` : 'ما لقيناش نتائج هنا. جرّب توسّع distance.');
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Overpass unavailable');
  } catch {
    setStatus('الخدمة ديال الأماكن ما جاوباتش دابا. عاود جرّب من بعد أو وسّع/نقص distance.');
  } finally {
    setLoading(false);
  }
}

function dedupePlaces(places) {
  const seen = new Map();
  for (const place of places) {
    const key = `${place.name.toLowerCase()}|${place.lat.toFixed(5)}|${place.lon.toFixed(5)}`;
    if (!seen.has(key)) seen.set(key, place);
  }
  return [...seen.values()];
}

function toPlace(el) {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  const t = el.tags || {};
  const category = t.amenity || (t.shop === 'bakery' ? 'bakery' : 'restaurant');
  const name = t.name || t['name:ar'] || t['name:fr'] || categoryLabel(category);
  const address = [t['addr:housenumber'], t['addr:street'], t['addr:suburb'], t['addr:city']].filter(Boolean).join(', ');
  const website = normalizeWebsite(t.website || t['contact:website']);
  const phone = t.phone || t['contact:phone'] || '';
  return {
    id: `${el.type}-${el.id}`,
    name,
    category,
    cuisine: t.cuisine || '',
    address: address || 'Adresse non renseignée',
    phone,
    website,
    lat,
    lon,
    distance: distanceKm(state.position.lat, state.position.lon, lat, lon)
  };
}

function normalizeWebsite(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}
function categoryLabel(category) {
  return ({ fast_food: 'Fast food', restaurant: 'Restaurant', cafe: 'Café', bakery: 'Boulangerie' })[category] || 'À manger';
}
function categoryIcon(category) {
  return ({ fast_food: '🍔', restaurant: '🍽️', cafe: '☕', bakery: '🥐' })[category] || '🍴';
}

function applyFilters() {
  const q = els.searchInput.value.trim().toLowerCase();
  const cat = state.category;
  state.filtered = state.places.filter(p => {
    const matchCat = cat === 'all' || p.category === cat;
    const haystack = `${p.name} ${p.cuisine} ${p.address}`.toLowerCase();
    return matchCat && (!q || haystack.includes(q));
  });
  if (els.sortSelect.value === 'distance') state.filtered.sort((a, b) => a.distance - b.distance);
  else state.filtered.sort((a, b) => a.name.localeCompare(b.name));
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
  card.dataset.placeId = place.id;
  card.querySelector('.place-icon').textContent = categoryIcon(place.category);
  card.querySelector('.place-name').textContent = place.name;
  card.querySelector('.place-meta').textContent = `${categoryLabel(place.category)}${place.cuisine ? ' • ' + place.cuisine.replaceAll(';', ', ') : ''} • ${place.distance.toFixed(1)} km`;
  card.querySelector('.place-address').textContent = place.address;

  const fav = card.querySelector('.favorite-btn');
  const active = state.favorites.some(f => f.id === place.id);
  fav.textContent = active ? '♥' : '♡';
  fav.classList.toggle('active', active);
  fav.setAttribute('aria-label', active ? 'Retirer des favoris' : 'Ajouter aux favoris');
  fav.addEventListener('click', () => toggleFavorite(place));

  const contactRow = card.querySelector('.contact-row');
  const phoneLink = card.querySelector('.phone-link');
  const websiteLink = card.querySelector('.website-link');
  if (place.phone) phoneLink.href = `tel:${place.phone.replace(/\s+/g, '')}`; else phoneLink.hidden = true;
  if (place.website) websiteLink.href = place.website; else websiteLink.hidden = true;
  contactRow.hidden = !place.phone && !place.website;

  card.querySelector('.route-btn').addEventListener('click', () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;
    openExternal(url);
  });
  card.querySelector('.map-btn').addEventListener('click', () => {
    openView('mapView');
    setTimeout(async () => {
      await initMap();
      if (state.map) state.map.setView([place.lat, place.lon], 17);
    }, 80);
  });
  card.querySelector('.share-btn').addEventListener('click', () => sharePlace(place));
  return card;
}

async function sharePlace(place) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`;
  const data = { title: place.name, text: `${place.name} — ${categoryLabel(place.category)} (${place.distance.toFixed(1)} km)`, url: mapsUrl };
  if (window.AndroidBridge?.shareText) {
    window.AndroidBridge.shareText(`${data.text}\n${mapsUrl}`);
    return;
  }
  if (navigator.share) {
    try { await navigator.share(data); return; } catch (e) { if (e?.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(`${data.text}\n${mapsUrl}`);
    setStatus('الرابط تْنسخ ✅');
  } catch {
    openExternal(mapsUrl);
  }
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

async function ensureLeaflet() {
  if (typeof L !== 'undefined') return true;
  if (!navigator.onLine) return false;
  if (state.leafletLoading) return state.leafletLoading;
  state.leafletLoading = new Promise(resolve => {
    if (!document.querySelector('link[data-leaflet]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      css.dataset.leaflet = '1';
      document.head.appendChild(css);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.dataset.leaflet = '1';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  }).finally(() => { state.leafletLoading = null; });
  return state.leafletLoading;
}

async function initMap() {
  if (state.map) {
    state.map.invalidateSize();
    return state.map;
  }
  const ready = await ensureLeaflet();
  if (!ready || typeof L === 'undefined') {
    setStatus('الخريطة محتاجة الإنترنت باش تتحمّل.');
    return null;
  }
  state.map = L.map('map', { zoomControl: true }).setView([33.5731, -7.5898], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(state.map);
  updateMap();
  return state.map;
}

function updateMap() {
  if (!state.map) return;
  state.markers.forEach(m => m.remove());
  state.markers = [];
  if (state.position) {
    const me = L.circleMarker([state.position.lat, state.position.lon], { radius: 9, weight: 4 }).addTo(state.map).bindPopup('أنت هنا');
    state.markers.push(me);
  }
  state.filtered.forEach(p => {
    const m = L.marker([p.lat, p.lon]).addTo(state.map).bindPopup(`<strong>${escapeHtml(p.name)}</strong><br>${categoryLabel(p.category)} • ${p.distance.toFixed(1)} km`);
    state.markers.push(m);
  });
  if (state.filtered.length) {
    const bounds = L.latLngBounds(state.filtered.map(p => [p.lat, p.lon]));
    if (state.position) bounds.extend([state.position.lat, state.position.lon]);
    state.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
  } else if (state.position) state.map.setView([state.position.lat, state.position.lon], 14);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function openView(viewId) {
  const hash = viewId === 'favoritesView' ? '#favorites' : viewId === 'mapView' ? '#map' : '#home';
  if (location.hash !== hash) history.replaceState(null, '', hash);
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active-view', v.id === viewId));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
  if (viewId === 'mapView') {
    initMap().then(() => setTimeout(() => { if (state.map) { state.map.invalidateSize(); updateMap(); } }, 100));
  }
  if (viewId === 'favoritesView') renderFavorites();
}

function surpriseMe() {
  if (!state.filtered.length) {
    setStatus('خصنا نلقاو النتائج الأول، ومن بعد نختارو ليك 😄');
    if (!state.position) locate();
    return;
  }
  openView('resultsView');
  const place = state.filtered[Math.floor(Math.random() * state.filtered.length)];
  requestAnimationFrame(() => {
    const card = [...els.results.querySelectorAll('.place-card')].find(el => el.dataset.placeId === place.id);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('surprise-highlight');
      setTimeout(() => card.classList.remove('surprise-highlight'), 1700);
    }
  });
  setStatus(`🎲 اخترنا ليك: ${place.name}`);
}

function loadDemoData() {
  state.position = { lat: 33.5731, lon: -7.5898 };
  const demo = [
    ['Casa Burger', 'fast_food', 33.5752, -7.5868, 'burger;fast_food', 'Boulevard de Paris, Casablanca'],
    ['Dar Dada', 'restaurant', 33.5708, -7.5881, 'moroccan', 'Centre-ville, Casablanca'],
    ['Café Central', 'cafe', 33.5719, -7.5931, 'coffee_shop', 'Casablanca'],
    ['Boulangerie Atlas', 'bakery', 33.5760, -7.5920, 'bakery', 'Casablanca']
  ];
  state.places = demo.map((p, i) => ({
    id: `demo-${i}`, name: p[0], category: p[1], lat: p[2], lon: p[3], cuisine: p[4], address: p[5], phone: '', website: '',
    distance: distanceKm(state.position.lat, state.position.lon, p[2], p[3])
  }));
  applyFilters();
  setStatus('Mode démo — données fictives pour tester l’interface.');
}

document.addEventListener('click', e => {
  if (!window.AndroidBridge?.openUrl) return;
  const a = e.target.closest('a[href]');
  if (!a) return;
  const href = a.getAttribute('href') || '';
  if (/^(https?:|tel:|mailto:)/i.test(href)) {
    e.preventDefault();
    window.AndroidBridge.openUrl(a.href);
  }
});

document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => openView(btn.dataset.view)));
els.installBtn.addEventListener('click', installApp);
els.locateBtn.addEventListener('click', locate);
els.emptyLocateBtn.addEventListener('click', locate);
els.refreshBtn.addEventListener('click', () => state.position ? loadNearby() : locate());
els.surpriseBtn.addEventListener('click', surpriseMe);
els.searchInput.addEventListener('input', applyFilters);
els.clearSearch.addEventListener('click', () => { els.searchInput.value = ''; applyFilters(); els.searchInput.focus(); });
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
els.privacyBtn.addEventListener('click', () => els.privacyDialog.showModal());
els.privacyClose.addEventListener('click', () => els.privacyDialog.close());
els.privacyDialog.addEventListener('click', e => {
  if (e.target === els.privacyDialog) els.privacyDialog.close();
});
