console.log('--- NEW SCRIPT LOADED ---');

// Configuration
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSyHaRrlyE2gpfX2AvWVpBlxuZbavkUXrYH9y1bofyDFcFyPUDl0vnP8Kcw9Ro7bfXLF9rhnB8u0bIS/pub?gid=0&single=true&output=csv';

// State
let stores = [];
let currentProvince = 'all';
let searchQuery = '';

// DOM Elements
const storeGrid = document.getElementById('storeGrid');
const filterContainer = document.getElementById('filterContainer');
const searchInput = document.getElementById('searchInput');
const noResults = document.getElementById('noResults');

// --- Initialization ---
function init() {
  console.log('Initializing App...');

  if (typeof Papa === 'undefined') {
    console.error('PapaParse not found.');
    storeGrid.innerHTML = '<p style="padding:2rem; text-align:center;">Error: PapaParse library missing.</p>';
    return;
  }

  fetchData();
  setupEventListeners();
}

// --- Data Fetching ---
function fetchData() {
  console.log('Fetching CSV...');
  Papa.parse(SHEET_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      console.log('CSV Parsed. Rows:', results.data.length);
      if (results.data && results.data.length > 0) {
        stores = processData(results.data);
        renderFilterChips();
        renderStores();
      } else {
        storeGrid.innerHTML = '<p style="padding:2rem; text-align:center;">ไม่พบข้อมูล</p>';
      }
    },
    error: (err) => {
      console.error('Fetch Error:', err);
      storeGrid.innerHTML = `<p style="padding:2rem; text-align:center;">Error loading data: ${err.message}</p>`;
    }
  });
}

// --- Data Processing ---
function processData(rows) {
  return rows.map((row, index) => {
    // Validation
    if (!row['Store Name']) return null;

    // 1. Basic Info
    const name = row['Store Name'].trim();
    const province = row['Province'] ? row['Province'].trim() : '';
    const district = row['District'] ? row['District'].trim() : '';

    // 2. Contact
    let phone = row['Mobile'] ? row['Mobile'].trim() : '';
    if (!phone && row['Phone']) phone = row['Phone'].trim();
    if (!phone) phone = '-';

    // 3. Links
    const facebook = row['Facebook'] ? row['Facebook'].trim() : '';
    const shopee = row['Shopee'] ? row['Shopee'].trim() : '';
    const mapLink = row['Google Maps URL'] ? row['Google Maps URL'].trim() : '#';

    // 4. Image Logic (Photo 1 > Logo)
    let rawImage = row['Photo 1 URL'];
    if (!rawImage || rawImage.trim() === '') {
      rawImage = row['Logo URL'];
    }
    const imageUrl = getDirectLink(rawImage);

    // Debug Log
    console.log(`[Store ${index}] ${name} | Image: ${imageUrl}`);

    return {
      id: index,
      name,
      province,
      district,
      phone,
      mapLink,
      social: { facebook, shopee },
      image: imageUrl
    };
  }).filter(item => item !== null);
}

// --- Helper: Google Drive Link Converter ---
const getDirectLink = (url) => {
  if (!url || url.trim() === '') return 'assets/tama-logo.png';
  const match = url.match(/[-\w]{25,}/);
  if (match) {
    // ใช้ lh3.googleusercontent.com/d/ID เป็นท่ามาตรฐานที่เสถียรที่สุด
    return `https://lh3.googleusercontent.com/d/${match[0]}`;
  }
  return url;
};

// --- Rendering ---
function renderFilterChips() {
  const uniqueProvinces = [...new Set(stores.map(s => s.province).filter(p => p))];
  const chips = ['all', ...uniqueProvinces];

  filterContainer.innerHTML = chips.map(prov => `
        <button 
            class="filter-chip ${prov === currentProvince ? 'active' : ''}" 
            onclick="window.setFilter('${prov}')"
        >
            ${prov === 'all' ? 'ทั้งหมด' : prov}
        </button>
    `).join('');
}

function renderStores() {
  // Filter
  const filtered = stores.filter(store => {
    const matchProv = currentProvince === 'all' || store.province === currentProvince;
    const searchTerms = [store.name, store.province, store.district].join(' ').toLowerCase();
    return matchProv && searchTerms.includes(searchQuery);
  });

  // Render
  if (filtered.length === 0) {
    storeGrid.innerHTML = '';
    noResults.classList.remove('hidden');
  } else {
    noResults.classList.add('hidden');
    storeGrid.innerHTML = filtered.map(store => `
            <article class="store-card">
                <div class="store-image-container">
                    <img 
                        src="${store.image}" 
                        alt="${store.name}" 
                        class="store-image" 
                        crossorigin="anonymous"
                        loading="lazy"
                        onerror="this.onerror=null; this.src='assets/tama-logo.png';"
                    >
                </div>
                <div class="store-content">
                    <h3 class="store-name">${store.name}</h3>
                    
                    <div class="store-tags">
                        <span class="location-tag">
                            <i class="fa-solid fa-location-dot"></i> 
                            ${store.district}, ${store.province}
                        </span>
                    </div>

                    <div class="store-footer">
                        <div class="contact-row">
                            <span class="phone-section">
                                <i class="fa-solid fa-phone" style="color: var(--color-primary); margin-right: 6px;"></i> 
                                ${store.phone}
                            </span>
                            <div class="social-links">
                                ${store.social.facebook ? `<a href="${store.social.facebook}" target="_blank" class="social-btn facebook"><i class="fa-brands fa-facebook-f"></i></a>` : ''}
                                ${store.social.shopee ? `<a href="${store.social.shopee}" target="_blank" class="social-btn shopee"><i class="fa-solid fa-bag-shopping"></i></a>` : ''}
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 8px; margin-top: 12px;">
                            ${store.phone && store.phone !== '-' ?
        `<a href="tel:${store.phone}" class="btn-primary" style="flex: 1; justify-content: center;">
                                    <i class="fa-solid fa-phone"></i> โทรเลย
                                </a>` :
        `<span class="btn-secondary" style="flex: 1; justify-content: center; opacity: 0.5;">
                                    <i class="fa-solid fa-phone-slash"></i> โทรเลย
                                </span>`
      }
                            <a href="${store.mapLink}" target="_blank" class="btn-secondary" style="flex: 1; justify-content: center;">
                                <i class="fa-solid fa-map"></i> ดูแผนที่
                            </a>
                        </div>
                    </div>
                </div>
            </article>
        `).join('');
  }
}

// --- Event Listeners ---
function setupEventListeners() {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderStores();
  });
}

// Global scope for HTML access
window.setFilter = (province) => {
  currentProvince = province;
  renderFilterChips();
  renderStores();
};

// Start
init();
