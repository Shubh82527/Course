/* ============================================================
   COURSE API — app.js
   Connects to FastAPI backend at http://localhost:8000
   ============================================================ */

const BASE = 'http://localhost:8000';

// ─── DOM REFS ─────────────────────────────────────────────
const views      = document.querySelectorAll('.view');
const navItems   = document.querySelectorAll('.nav-item');
const toast      = document.getElementById('toast');
const modalOverlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');
const modalClose = document.getElementById('modalClose');
const apiStatus  = document.getElementById('apiStatus');
const apiStatusText = document.getElementById('apiStatusText');

// Stats
const statTotal     = document.getElementById('statTotal');
const statPublished = document.getElementById('statPublished');
const statAvgPrice  = document.getElementById('statAvgPrice');
const statCats      = document.getElementById('statCats');

// ─── TOAST ────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'info') {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ─── API HELPERS ──────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'API error');
  return data;
}

// ─── API STATUS CHECK ─────────────────────────────────────
async function checkApiStatus() {
  try {
    await apiFetch('/');
    apiStatus.className = 'status-dot online';
    apiStatusText.textContent = 'API Online';
  } catch {
    apiStatus.className = 'status-dot offline';
    apiStatusText.textContent = 'API Offline';
  }
}

// ─── NAVIGATION ───────────────────────────────────────────
const pageTitles = {
  all:       ['All Courses', 'Browse the full catalog'],
  filter:    ['Filter Courses', 'Narrow by category, price & more'],
  paginated: ['Paginated View', 'Page through the catalog'],
  create:    ['New Course', 'Add a course to the catalog'],
};

function switchView(name) {
  views.forEach(v => v.classList.remove('active'));
  navItems.forEach(n => n.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
  document.querySelector(`[data-view="${name}"]`).classList.add('active');
  const [title, sub] = pageTitles[name];
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageSubtitle').textContent = sub;
}

navItems.forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    switchView(view);
    if (view === 'all') loadAllCourses();
  });
});

// ─── PRICE FORMATTER ──────────────────────────────────────
function fmtPrice(price) {
  return '₹' + Number(price).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function discountedPrice(price, discount) {
  return price - (price * discount / 100);
}

// ─── COURSE CARD BUILDER ──────────────────────────────────
function buildCard(c) {
  const card = document.createElement('div');
  card.className = 'course-card';
  card.style.animationDelay = `${Math.random() * 0.15}s`;

  const hasDiscount = c.discount_percent > 0;
  const finalPrice = hasDiscount ? discountedPrice(c.price, c.discount_percent) : c.price;

  card.innerHTML = `
    <div class="card-header">
      <span class="card-id">#${c.id}</span>
      <span class="card-badge ${c.is_published ? 'badge-published' : 'badge-unpublished'}">
        ${c.is_published ? '● Live' : '○ Draft'}
      </span>
    </div>
    <div class="card-title">${escHtml(c.title)}</div>
    <div class="card-meta">
      <div class="meta-row">
        <span class="meta-icon">◆</span>
        <span>${escHtml(c.instructor)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-icon">◉</span>
        <span class="meta-tag">${escHtml(c.category)}</span>
      </div>
    </div>
    <div class="card-pricing">
      <div>
        ${hasDiscount ? `<span class="price-original">${fmtPrice(c.price)}</span>` : ''}
        <span class="price-main">${fmtPrice(finalPrice)}</span>
        ${hasDiscount ? `<span class="discount-badge">-${c.discount_percent}%</span>` : ''}
      </div>
      <span class="duration-info">${c.duration_hours}h</span>
    </div>
    <div class="card-actions">
      <button class="btn-card btn-edit"   data-id="${c.id}">Edit</button>
      <button class="btn-card btn-delete" data-id="${c.id}">Delete</button>
    </div>
  `;

  // Click title area → detail modal
  card.querySelector('.card-title').style.cursor = 'pointer';
  card.querySelector('.card-title').addEventListener('click', () => openDetailModal(c));

  card.querySelector('.btn-edit').addEventListener('click', e => {
    e.stopPropagation();
    openEditForm(c);
  });

  card.querySelector('.btn-delete').addEventListener('click', e => {
    e.stopPropagation();
    confirmDelete(c.id, c.title);
  });

  return card;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── RENDER GRID ──────────────────────────────────────────
function renderGrid(el, courses) {
  el.innerHTML = '';
  if (!courses || courses.length === 0) {
    el.innerHTML = '<div class="empty-state">No courses found.</div>';
    return;
  }
  courses.forEach(c => el.appendChild(buildCard(c)));
}

// ─── STATS ────────────────────────────────────────────────
function updateStats(courses) {
  if (!courses.length) {
    statTotal.textContent = '0';
    statPublished.textContent = '0';
    statAvgPrice.textContent = '—';
    statCats.textContent = '0';
    return;
  }
  const published = courses.filter(c => c.is_published).length;
  const avgPrice = courses.reduce((s, c) => s + c.price, 0) / courses.length;
  const cats = new Set(courses.map(c => c.category)).size;

  statTotal.textContent = courses.length;
  statPublished.textContent = published;
  statAvgPrice.textContent = fmtPrice(avgPrice);
  statCats.textContent = cats;
}

// ─── ALL COURSES ──────────────────────────────────────────
async function loadAllCourses() {
  const grid = document.getElementById('courseGrid');
  grid.innerHTML = '<div class="loading-state">Loading courses…</div>';
  try {
    const data = await apiFetch('/courses');
    renderGrid(grid, data);
    updateStats(data);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">⚠ ${err.message}</div>`;
    showToast(err.message, 'error');
  }
}

// ─── SEARCH BY ID ─────────────────────────────────────────
document.getElementById('searchBtn').addEventListener('click', searchById);
document.getElementById('searchId').addEventListener('keydown', e => {
  if (e.key === 'Enter') searchById();
});

async function searchById() {
  const id = document.getElementById('searchId').value.trim();
  if (!id) return;
  try {
    const data = await apiFetch(`/courses/${id}`);
    const course = Array.isArray(data) ? data[0] : data;
    openDetailModal(course);
  } catch (err) {
    showToast(`ID ${id}: ${err.message}`, 'error');
  }
}

// ─── REFRESH ──────────────────────────────────────────────
document.getElementById('refreshBtn').addEventListener('click', () => {
  loadAllCourses();
  checkApiStatus();
  showToast('Refreshed', 'info');
});

// ─── FILTER ───────────────────────────────────────────────
document.getElementById('applyFilter').addEventListener('click', async () => {
  const params = new URLSearchParams();
  const cat  = document.getElementById('fCategory').value.trim();
  const inst = document.getElementById('fInstructor').value.trim();
  const minP = document.getElementById('fMinPrice').value;
  const maxP = document.getElementById('fMaxPrice').value;
  const pub  = document.getElementById('fPublished').value;

  if (cat)  params.append('category', cat);
  if (inst) params.append('instructor', inst);
  if (minP) params.append('min_price', minP);
  if (maxP) params.append('max_price', maxP);
  if (pub !== '') params.append('is_published', pub);

  const grid = document.getElementById('filterGrid');
  grid.innerHTML = '<div class="loading-state">Filtering…</div>';
  try {
    const res = await apiFetch(`/courses/filter?${params}`);
    renderGrid(grid, res.data);
    showToast(`${res.data.length} result(s) found`, 'info');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">⚠ ${err.message}</div>`;
    showToast(err.message, 'error');
  }
});

// ─── PAGINATION ───────────────────────────────────────────
let pgState = { page: 1, limit: 10, total: 0 };

document.getElementById('applyPagination').addEventListener('click', () => {
  pgState.page = parseInt(document.getElementById('pgPage').value) || 1;
  pgState.limit = parseInt(document.getElementById('pgLimit').value) || 10;
  loadPaginated();
});

async function loadPaginated() {
  const grid = document.getElementById('paginatedGrid');
  grid.innerHTML = '<div class="loading-state">Loading…</div>';
  try {
    const res = await apiFetch(`/courses/paginated?page=${pgState.page}&limit=${pgState.limit}`);
    pgState.total = res.total;
    renderGrid(grid, res.data);
    const totalPages = Math.ceil(res.total / pgState.limit);
    document.getElementById('pgInfo').textContent =
      `Page ${res.page} of ${totalPages} — ${res.total} total`;
    const pgNav = document.getElementById('pgNav');
    pgNav.style.display = 'flex';
    document.getElementById('pgPrev').disabled = pgState.page <= 1;
    document.getElementById('pgNext').disabled = pgState.page >= totalPages;
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">⚠ ${err.message}</div>`;
    showToast(err.message, 'error');
  }
}

document.getElementById('pgPrev').addEventListener('click', () => {
  if (pgState.page > 1) { pgState.page--; document.getElementById('pgPage').value = pgState.page; loadPaginated(); }
});
document.getElementById('pgNext').addEventListener('click', () => {
  pgState.page++; document.getElementById('pgPage').value = pgState.page; loadPaginated();
});

// ─── CREATE / EDIT FORM ───────────────────────────────────
const submitBtn  = document.getElementById('submitCourse');
const cancelBtn  = document.getElementById('cancelEdit');
const formMsg    = document.getElementById('formMsg');
const formHeading = document.getElementById('formHeading');

function clearForm() {
  ['fTitle','fInstructor2','fCategory2','fPrice','fDuration'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('fDiscount').value = '0';
  document.getElementById('fIsPublished').value = 'true';
  document.getElementById('editId').value = '';
  formMsg.textContent = '';
  formMsg.className = 'form-msg';
  formHeading.textContent = 'Create New Course';
  submitBtn.textContent = 'Create Course';
  cancelBtn.style.display = 'none';
}

function openEditForm(c) {
  switchView('create');
  document.getElementById('fTitle').value       = c.title;
  document.getElementById('fInstructor2').value = c.instructor;
  document.getElementById('fCategory2').value   = c.category;
  document.getElementById('fPrice').value       = c.price;
  document.getElementById('fDuration').value    = c.duration_hours;
  document.getElementById('fDiscount').value    = c.discount_percent;
  document.getElementById('fIsPublished').value = c.is_published ? 'true' : 'false';
  document.getElementById('editId').value       = c.id;
  formHeading.textContent = `Edit Course #${c.id}`;
  submitBtn.textContent   = 'Save Changes';
  cancelBtn.style.display = 'inline-flex';
  formMsg.textContent = '';
}

cancelBtn.addEventListener('click', clearForm);

submitBtn.addEventListener('click', async () => {
  const id       = document.getElementById('editId').value;
  const isEdit   = !!id;

  const payload = {
    title:          document.getElementById('fTitle').value.trim(),
    instructor:     document.getElementById('fInstructor2').value.trim(),
    category:       document.getElementById('fCategory2').value.trim(),
    price:          parseFloat(document.getElementById('fPrice').value),
    duration_hours: parseInt(document.getElementById('fDuration').value),
    discount_percent: parseFloat(document.getElementById('fDiscount').value) || 0,
    is_published:   document.getElementById('fIsPublished').value === 'true',
  };

  // Basic client-side validation
  if (!payload.title || payload.title.length < 5) {
    setFormMsg('Title must be at least 5 characters.', 'error'); return;
  }
  if (!payload.instructor || payload.instructor.length < 3) {
    setFormMsg('Instructor name must be at least 3 characters.', 'error'); return;
  }
  if (!payload.category || payload.category.length < 2) {
    setFormMsg('Category must be at least 2 characters.', 'error'); return;
  }
  if (!payload.price || payload.price <= 0) {
    setFormMsg('Price must be greater than 0.', 'error'); return;
  }
  if (!payload.is_published && payload.discount_percent > 0) {
    setFormMsg('Unpublished course cannot have a discount.', 'error'); return;
  }

  submitBtn.textContent = isEdit ? 'Saving…' : 'Creating…';
  submitBtn.disabled = true;

  try {
    if (isEdit) {
      await apiFetch(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      setFormMsg(`Course #${id} updated successfully!`, 'success');
      showToast('Course updated ✓', 'success');
    } else {
      const created = await apiFetch('/courses', { method: 'POST', body: JSON.stringify(payload) });
      setFormMsg(`Course #${created.id} created!`, 'success');
      showToast('Course created ✓', 'success');
      clearForm();
    }
    loadAllCourses();
  } catch (err) {
    setFormMsg(err.message, 'error');
    showToast(err.message, 'error');
  } finally {
    submitBtn.textContent = isEdit ? 'Save Changes' : 'Create Course';
    submitBtn.disabled = false;
  }
});

function setFormMsg(msg, type) {
  formMsg.textContent = msg;
  formMsg.className = `form-msg ${type}`;
}

// ─── DELETE ───────────────────────────────────────────────
function confirmDelete(id, title) {
  modalContent.innerHTML = `
    <div class="modal-course-title">Delete Course</div>
    <p style="color:var(--text-2);font-size:14px;margin-bottom:6px;">Are you sure you want to delete:</p>
    <p style="font-family:var(--font-mono);font-size:13px;color:var(--red);margin-bottom:20px;">#${id} — ${escHtml(title)}</p>
    <div class="modal-actions">
      <button class="btn-primary" id="confirmDeleteBtn" style="background:var(--red);color:#fff">Delete</button>
      <button class="btn-ghost" id="cancelDeleteBtn">Cancel</button>
    </div>
  `;
  openModal();
  document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    try {
      await apiFetch(`/courses/${id}`, { method: 'DELETE' });
      showToast(`Course #${id} deleted`, 'success');
      closeModal();
      loadAllCourses();
    } catch (err) {
      showToast(err.message, 'error');
      closeModal();
    }
  });
  document.getElementById('cancelDeleteBtn').addEventListener('click', closeModal);
}

// ─── DETAIL MODAL ─────────────────────────────────────────
function openDetailModal(c) {
  const hasDiscount = c.discount_percent > 0;
  const finalPrice = hasDiscount ? discountedPrice(c.price, c.discount_percent) : c.price;
  modalContent.innerHTML = `
    <div class="modal-course-title">${escHtml(c.title)}</div>
    <table class="detail-table">
      <tr><td>ID</td><td>#${c.id}</td></tr>
      <tr><td>Instructor</td><td>${escHtml(c.instructor)}</td></tr>
      <tr><td>Category</td><td>${escHtml(c.category)}</td></tr>
      <tr><td>Price</td><td>${fmtPrice(c.price)}</td></tr>
      ${hasDiscount ? `<tr><td>Discount</td><td>${c.discount_percent}%</td></tr>` : ''}
      <tr><td>Final Price</td><td style="color:var(--gold)">${fmtPrice(finalPrice)}</td></tr>
      <tr><td>Duration</td><td>${c.duration_hours} hours</td></tr>
      <tr><td>Status</td><td style="color:${c.is_published ? 'var(--green)' : 'var(--red)'}">${c.is_published ? 'Published' : 'Draft'}</td></tr>
    </table>
    <div class="modal-actions" style="margin-top:22px">
      <button class="btn-primary" id="modalEditBtn">Edit Course</button>
      <button class="btn-ghost" id="modalCloseBtn2">Close</button>
    </div>
  `;
  openModal();
  document.getElementById('modalEditBtn').addEventListener('click', () => {
    closeModal();
    openEditForm(c);
  });
  document.getElementById('modalCloseBtn2').addEventListener('click', closeModal);
}

function openModal()  { modalOverlay.classList.add('open'); }
function closeModal() { modalOverlay.classList.remove('open'); }

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ─── INIT ─────────────────────────────────────────────────
checkApiStatus();
loadAllCourses();
setInterval(checkApiStatus, 30000); // Ping every 30s
