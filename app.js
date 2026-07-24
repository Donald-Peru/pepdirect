const app = document.getElementById('app');

function normalizeRoute(pathname) {
  if (!pathname || pathname === '/') return '/';
  if (pathname.endsWith('/index.html')) return '/';
  if (pathname.endsWith('.html')) return pathname.replace(/\.html$/, '');
  if (pathname.includes('index.html')) return '/';
  return pathname;
}

const state = {
  route: normalizeRoute(window.location.pathname),
  collections: {
    peptides: [],
    therapyCenters: [],
    makers: [],
    blogs: [],
    users: [],
  },
  activeAdminView: 'peptides',
  user: null,
};

function setRoute(pathname) {
  state.route = pathname;
  window.history.pushState({}, '', pathname);
  render();
}

function navigate(event) {
  const link = event.target.closest('a[data-route]');
  if (!link) return;
  event.preventDefault();
  setRoute(link.getAttribute('data-route'));
}

document.addEventListener('click', navigate);
window.addEventListener('popstate', () => {
  state.route = normalizeRoute(window.location.pathname);
  render();
});

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function loadSession() {
  try {
    const response = await apiRequest('/api/session');
    state.user = response.user || null;
  } catch (error) {
    state.user = null;
  }
}

async function loadData() {
  const [peptides, therapyCenters, makers, blogs, users] = await Promise.all([
    apiRequest('/api/peptides'),
    apiRequest('/api/therapyCenters'),
    apiRequest('/api/makers'),
    apiRequest('/api/blogs'),
    apiRequest('/api/users'),
  ]);
  state.collections.peptides = peptides;
  state.collections.therapyCenters = therapyCenters;
  state.collections.makers = makers;
  state.collections.blogs = blogs;
  state.collections.users = users;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pageLayout(content) {
  return `
    <section class="hero">
      <h1>Peptide Therapy Directory</h1>
      <p>Discover peptide therapy centers, research and FDA-approved peptides, and peptide makers in the USA from one modern directory.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="/peptides" data-route="/peptides">Browse Peptides</a>
        <a class="btn btn-secondary" href="/centers" data-route="/centers">Explore Centers</a>
      </div>
    </section>
    ${content}
  `;
}

function renderHome() {
  const stats = [
    { title: 'Peptides', value: state.collections.peptides.length },
    { title: 'Centers', value: state.collections.therapyCenters.length },
    { title: 'Makers', value: state.collections.makers.length },
    { title: 'Blogs', value: state.collections.blogs.length },
  ];

  const cards = stats.map((item) => `
    <article class="card">
      <h3>${item.title}</h3>
      <p>${item.value} curated entries</p>
    </article>
  `).join('');

  const latestPeptides = state.collections.peptides.slice(0, 3).map((item) => `
    <article class="card">
      <h3>${escapeHtml(item.name)}</h3>
      <p class="meta">${escapeHtml(item.status)}</p>
      <p>${escapeHtml(item.summary)}</p>
      <a href="/peptide/${item.slug}" data-route="/peptide/${item.slug}">View profile</a>
    </article>
  `).join('');

  return pageLayout(`
    <h2 class="section-title">Highlights</h2>
    <div class="grid">${cards}</div>
    <h2 class="section-title">Featured Peptides</h2>
    <div class="grid">${latestPeptides}</div>
  `);
}

function renderCollection(type, title, items, detailsRoutePrefix) {
  const cards = items.map((item) => `
    <article class="card">
      <h3>${escapeHtml(item.name || item.title)}</h3>
      <p class="meta">${escapeHtml(item.status || item.location || item.category || '')}</p>
      <p>${escapeHtml(item.summary || item.excerpt || item.description || '')}</p>
      <a href="${detailsRoutePrefix}/${item.slug}" data-route="${detailsRoutePrefix}/${item.slug}">View details</a>
    </article>
  `).join('');

  return pageLayout(`
    <h2 class="section-title">${title}</h2>
    <div class="list">${cards || '<p class="small">No entries yet.</p>'}</div>
  `);
}

function renderPeptideDetail(slug) {
  const item = state.collections.peptides.find((entry) => entry.slug === slug);
  if (!item) {
    return pageLayout('<h2 class="section-title">Peptide not found</h2>');
  }
  return pageLayout(`
    <article class="detail-card">
      <h1>${escapeHtml(item.name)}</h1>
      <p class="summary">${escapeHtml(item.summary)}</p>
      <p><strong>Status:</strong> ${escapeHtml(item.status)}</p>
      <p><strong>Category:</strong> ${escapeHtml(item.category)}</p>
      <p>${escapeHtml(item.description)}</p>
    </article>
  `);
}

function renderCenterDetail(slug) {
  const item = state.collections.therapyCenters.find((entry) => entry.slug === slug);
  if (!item) {
    return pageLayout('<h2 class="section-title">Center not found</h2>');
  }
  return pageLayout(`
    <article class="detail-card">
      <h1>${escapeHtml(item.name)}</h1>
      <p class="summary">${escapeHtml(item.focus)}</p>
      <p><strong>Location:</strong> ${escapeHtml(item.location)}</p>
      <p>${escapeHtml(item.description)}</p>
      ${item.website ? `<p><a href="${item.website}" target="_blank" rel="noreferrer">Visit website</a></p>` : ''}
    </article>
  `);
}

function renderMakerDetail(slug) {
  const item = state.collections.makers.find((entry) => entry.slug === slug);
  if (!item) {
    return pageLayout('<h2 class="section-title">Maker not found</h2>');
  }
  return pageLayout(`
    <article class="detail-card">
      <h1>${escapeHtml(item.name)}</h1>
      <p class="summary">${escapeHtml(item.focus)}</p>
      <p><strong>Location:</strong> ${escapeHtml(item.location)}</p>
      <p>${escapeHtml(item.description)}</p>
      ${item.website ? `<p><a href="${item.website}" target="_blank" rel="noreferrer">Visit website</a></p>` : ''}
    </article>
  `);
}

function buildBlogJsonLd(item) {
  const canonicalUrl = item.canonicalUrl || `https://example.com/blog/${item.slug}`;
  const publishedDate = item.createdAt ? item.createdAt.split('T')[0] : '';

  return {
    '@context': 'https://schema.org',
    '@type': item.schemaType || 'BlogPosting',
    headline: item.metaTitle || item.title,
    description: item.metaDescription || item.excerpt || '',
    author: {
      '@type': 'Organization',
      name: item.author || 'Peptide Directory',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Peptide Directory',
    },
    datePublished: publishedDate,
    image: item.featuredImage || '',
    url: canonicalUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  };
}

function renderBlogDetail(slug) {
  const item = state.collections.blogs.find((entry) => entry.slug === slug);
  if (!item) {
    return pageLayout('<h2 class="section-title">Blog not found</h2>');
  }

  const safeContent = String(item.content || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '');

  const jsonLd = buildBlogJsonLd(item);

  return pageLayout(`
    <article class="detail-card">
      <h1>${escapeHtml(item.title)}</h1>
      <p class="summary">${escapeHtml(item.excerpt)}</p>
      <p><strong>Category:</strong> ${escapeHtml(item.category)}</p>
      <div>${safeContent}</div>
    </article>
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  `);
}

function renderBlogList() {
  return pageLayout(`
    <h2 class="section-title">Blog & News</h2>
    <div class="list">
      ${state.collections.blogs.map((item) => `
        <article class="card">
          <h3>${escapeHtml(item.title)}</h3>
          <p class="meta">${escapeHtml(item.category)}</p>
          <p>${escapeHtml(item.excerpt)}</p>
          <a href="/blog/${item.slug}" data-route="/blog/${item.slug}">Read article</a>
        </article>
      `).join('') || '<p class="small">No blog posts yet.</p>'}
    </div>
  `);
}

function renderAdmin() {
  const isPeptideView = state.activeAdminView === 'peptides';
  const isCenterView = state.activeAdminView === 'therapyCenters';
  const isMakerView = state.activeAdminView === 'makers';
  const isBlogView = state.activeAdminView === 'blogs';

  if (!state.user) {
    return pageLayout(`
      <section class="admin-layout">
        <div class="admin-grid">
          <section class="form-card">
            <h3>Admin login</h3>
            <p>Sign in to manage peptides, centers, makers, and blog posts.</p>
            <form id="login-form">
              <label>Email
                <input name="email" type="email" placeholder="admin@example.com" required />
              </label>
              <label>Password
                <input name="password" type="password" placeholder="Enter password" required />
              </label>
              <button class="btn btn-primary" type="submit">Log in</button>
            </form>
          </section>
        </div>
      </section>
    `);
  }

  return pageLayout(`
    <section class="admin-layout">
      <aside class="sidebar">
        <button type="button" class="${state.activeAdminView === 'peptides' ? 'active' : ''}" data-admin-view="peptides">Manage Peptides</button>
        <button type="button" class="${state.activeAdminView === 'therapyCenters' ? 'active' : ''}" data-admin-view="therapyCenters">Manage Centers</button>
        <button type="button" class="${state.activeAdminView === 'makers' ? 'active' : ''}" data-admin-view="makers">Manage Makers</button>
        <button type="button" class="${state.activeAdminView === 'blogs' ? 'active' : ''}" data-admin-view="blogs">Manage Blogs</button>
        <button type="button" class="${state.activeAdminView === 'users' ? 'active' : ''}" data-admin-view="users">Manage Users</button>
        <button type="button" class="btn btn-secondary" data-action="logout">Log out</button>
      </aside>
      <div class="admin-grid">
        <section class="form-card">
          <h3>${getAdminTitle(state.activeAdminView)}</h3>
          <form id="admin-form" data-collection="${state.activeAdminView}">
            ${isPeptideView ? `
              <label>Name
                <input name="name" placeholder="Example: BPC-157" required />
              </label>
              <label>Slug
                <input name="slug" placeholder="bpc-157" />
              </label>
              <label>Status
                <select name="status">
                  <option>Research</option>
                  <option>FDA Approved</option>
                  <option>Clinical</option>
                  <option>Experimental</option>
                </select>
              </label>
              <label>Category
                <input name="category" placeholder="Recovery, Metabolic, Cognitive" />
              </label>
              <label>Summary
                <input name="summary" placeholder="Short summary" />
              </label>
              <label>Trade names
                <input name="tradeNames" placeholder="Comma-separated trade names" />
              </label>
              <label>Companies
                <input name="companies" placeholder="Comma-separated companies" />
              </label>
              <label>Manufacturer
                <input name="manufacturer" placeholder="Manufacturer name" />
              </label>
              <label>Website
                <input name="website" placeholder="https://example.com" />
              </label>
              <label>Description
                <textarea name="description" placeholder="Detailed description"></textarea>
              </label>
              <label>Mechanism
                <textarea name="mechanism" placeholder="How it works"></textarea>
              </label>
              <label>Common uses
                <textarea name="commonUses" placeholder="Comma-separated use cases"></textarea>
              </label>
              <label>Approved use
                <textarea name="approvedFor" placeholder="Approved or clinical use"></textarea>
              </label>
              <label>Research notes
                <textarea name="researchNotes" placeholder="Research context"></textarea>
              </label>
              <label>Safety notes
                <textarea name="safetyNotes" placeholder="Safety notes"></textarea>
              </label>
              <label>Source links
                <textarea name="sourceLinks" placeholder="https://example.com"></textarea>
              </label>
            ` : isCenterView ? `
              <label>Name
                <input name="name" placeholder="Center name" required />
              </label>
              <label>Slug
                <input name="slug" placeholder="center-slug" />
              </label>
              <label>Focus
                <input name="focus" placeholder="Peptide therapy, wellness, IV therapy" />
              </label>
              <label>Location
                <input name="location" placeholder="City, State, Country" />
              </label>
              <label>Street address
                <input name="streetAddress" placeholder="123 Main Street" />
              </label>
              <label>City
                <input name="city" placeholder="City" />
              </label>
              <label>State / Region
                <input name="state" placeholder="State or region" />
              </label>
              <label>Postal code
                <input name="postalCode" placeholder="ZIP / postal code" />
              </label>
              <label>Country
                <input name="country" placeholder="Country" />
              </label>
              <label>Phone
                <input name="phone" placeholder="+1 (555) 123-4567" />
              </label>
              <label>Email
                <input name="email" placeholder="contact@example.com" />
              </label>
              <label>Website
                <input name="website" placeholder="https://example.com" />
              </label>
              <label>Specialties
                <input name="specialties" placeholder="Comma-separated specialties" />
              </label>
              <label>Services
                <input name="services" placeholder="Comma-separated services" />
              </label>
              <label>Opening hours
                <input name="openingHours" placeholder="Mo-Fr 09:00-17:00" />
              </label>
              <label>Latitude
                <input name="latitude" placeholder="Example: 40.7128" />
              </label>
              <label>Longitude
                <input name="longitude" placeholder="Example: -74.0060" />
              </label>
              <label>Description
                <textarea name="description" placeholder="Detailed description"></textarea>
              </label>
              <label>Image URL
                <input name="imageUrl" placeholder="https://example.com/image.jpg" />
              </label>
              <label>Same As
                <input name="sameAs" placeholder="https://social-profile.example" />
              </label>
            ` : isMakerView ? `
              <label>Name
                <input name="name" placeholder="Maker or company name" required />
              </label>
              <label>Slug
                <input name="slug" placeholder="maker-slug" />
              </label>
              <label>Focus
                <input name="focus" placeholder="Peptide manufacturing, synthesis, research" />
              </label>
              <label>Location
                <input name="location" placeholder="City, State, Country" />
              </label>
              <label>Street address
                <input name="streetAddress" placeholder="123 Main Street" />
              </label>
              <label>City
                <input name="city" placeholder="City" />
              </label>
              <label>State / Region
                <input name="state" placeholder="State or region" />
              </label>
              <label>Postal code
                <input name="postalCode" placeholder="ZIP / postal code" />
              </label>
              <label>Country
                <input name="country" placeholder="Country" />
              </label>
              <label>Phone
                <input name="phone" placeholder="+1 (555) 123-4567" />
              </label>
              <label>Email
                <input name="email" placeholder="contact@example.com" />
              </label>
              <label>Website
                <input name="website" placeholder="https://example.com" />
              </label>
              <label>Specialties
                <input name="specialties" placeholder="Comma-separated specialties" />
              </label>
              <label>Certifications
                <input name="certifications" placeholder="Comma-separated certifications" />
              </label>
              <label>Products
                <input name="products" placeholder="Comma-separated product lines" />
              </label>
              <label>Description
                <textarea name="description" placeholder="Detailed description"></textarea>
              </label>
              <label>Image URL
                <input name="imageUrl" placeholder="https://example.com/image.jpg" />
              </label>
              <label>Same As
                <input name="sameAs" placeholder="https://company-profile.example" />
              </label>
            ` : isBlogView ? `
              <label>Title
                <input name="title" placeholder="Blog post title" required />
              </label>
              <label>Slug
                <input name="slug" placeholder="blog-slug" />
              </label>
              <label>Category
                <input name="category" placeholder="News, Research, Industry" />
              </label>
              <label>Excerpt
                <input name="excerpt" placeholder="Short summary for cards and previews" />
              </label>
              <label>Meta title
                <input name="metaTitle" placeholder="SEO title" />
              </label>
              <label>Meta description
                <textarea name="metaDescription" placeholder="SEO meta description"></textarea>
              </label>
              <label>Canonical URL
                <input name="canonicalUrl" placeholder="https://example.com/blog/post" />
              </label>
              <label>Author
                <input name="author" placeholder="Author name" />
              </label>
              <label>Tags
                <input name="tags" placeholder="Comma-separated tags" />
              </label>
              <label>Featured image URL
                <input name="featuredImage" placeholder="https://example.com/image.jpg" />
              </label>
              <label>Publish status
                <select name="publishStatus">
                  <option>Draft</option>
                  <option>Published</option>
                  <option>Scheduled</option>
                </select>
              </label>
              <label>Schema type
                <input name="schemaType" placeholder="Article, BlogPosting, NewsArticle" />
              </label>
              <label>Content
                <textarea name="content" placeholder="Write your blog content here"></textarea>
              </label>
            ` : `
              <label>Name / Title
                <input name="name" placeholder="Enter name" required />
              </label>
              <label>Summary / Excerpt
                <input name="summary" placeholder="Short summary" />
              </label>
              <label>Location / Category
                <input name="location" placeholder="Location or category" />
              </label>
              <label>Description
                <textarea name="description" placeholder="Details"></textarea>
              </label>
            `}
            <button class="btn btn-primary" type="submit">Save entry</button>
          </form>
        </section>
        <section class="list-card">
          <h3>Current entries</h3>
          ${renderAdminList(state.activeAdminView)}
        </section>
      </div>
    </section>
  `);
}

function getAdminTitle(collection) {
  const titles = {
    peptides: 'Add a peptide',
    therapyCenters: 'Add a therapy center',
    makers: 'Add a maker',
    blogs: 'Add a blog post',
    users: 'Add a user',
  };
  return titles[collection] || 'Add an item';
}

function renderAdminList(collection) {
  const items = state.collections[collection] || [];
  return items.map((item) => `
    <div class="item">
      <div>
        <strong>${escapeHtml(item.name || item.title)}</strong>
        <div class="small">${escapeHtml(item.summary || item.excerpt || item.location || item.role || '')}</div>
      </div>
      <div class="actions">
        <button class="edit" data-action="edit" data-id="${item.id}" type="button">Edit</button>
        <button class="delete" data-action="delete" data-id="${item.id}" type="button">Delete</button>
      </div>
    </div>
  `).join('');
}

async function handleAdminSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const collection = form.dataset.collection;
  const payload = Object.fromEntries(new FormData(form).entries());
  const body = {
    ...payload,
    name: payload.name || payload.title || '',
    title: payload.title || payload.name || '',
    slug: payload.slug || '',
    summary: payload.summary || payload.excerpt || '',
    description: payload.description || '',
    location: payload.location || '',
    tradeNames: payload.tradeNames ? payload.tradeNames.split(',').map((item) => item.trim()).filter(Boolean) : [],
    companies: payload.companies ? payload.companies.split(',').map((item) => item.trim()).filter(Boolean) : [],
    commonUses: payload.commonUses ? payload.commonUses.split(',').map((item) => item.trim()).filter(Boolean) : [],
    services: payload.services ? payload.services.split(',').map((item) => item.trim()).filter(Boolean) : [],
    specialties: payload.specialties ? payload.specialties.split(',').map((item) => item.trim()).filter(Boolean) : [],
    certifications: payload.certifications ? payload.certifications.split(',').map((item) => item.trim()).filter(Boolean) : [],
    products: payload.products ? payload.products.split(',').map((item) => item.trim()).filter(Boolean) : [],
    tags: payload.tags ? payload.tags.split(',').map((item) => item.trim()).filter(Boolean) : [],
    sourceLinks: payload.sourceLinks ? payload.sourceLinks.split(',').map((item) => item.trim()).filter(Boolean) : [],
  };
  await apiRequest(`/api/${collection}`, { method: 'POST', body: JSON.stringify(body) });
  await loadData();
  render();
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const payload = Object.fromEntries(new FormData(form).entries());
  await apiRequest('/api/login', { method: 'POST', body: JSON.stringify(payload) });
  await loadSession();
  await loadData();
  render();
}

async function handleAdminAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (action === 'delete') {
    const collection = state.activeAdminView;
    await apiRequest(`/api/${collection}/${id}`, { method: 'DELETE' });
    await loadData();
    render();
  }
  if (action === 'logout') {
    await apiRequest('/api/logout', { method: 'POST' });
    state.user = null;
    render();
  }
}

function render() {
  const route = state.route;
  if (route === '/admin') {
    app.innerHTML = renderAdmin();
    return;
  }
  if (route === '/peptides') {
    app.innerHTML = renderCollection('peptides', 'Peptides', state.collections.peptides, '/peptide');
    return;
  }
  if (route === '/centers') {
    app.innerHTML = renderCollection('therapyCenters', 'Therapy Centers', state.collections.therapyCenters, '/center');
    return;
  }
  if (route === '/makers') {
    app.innerHTML = renderCollection('makers', 'Peptide Makers', state.collections.makers, '/maker');
    return;
  }
  if (route === '/blog') {
    app.innerHTML = renderBlogList();
    return;
  }
  if (route.startsWith('/peptide/')) {
    app.innerHTML = renderPeptideDetail(route.replace('/peptide/', ''));
    return;
  }
  if (route.startsWith('/center/')) {
    app.innerHTML = renderCenterDetail(route.replace('/center/', ''));
    return;
  }
  if (route.startsWith('/maker/')) {
    app.innerHTML = renderMakerDetail(route.replace('/maker/', ''));
    return;
  }
  if (route.startsWith('/blog/')) {
    app.innerHTML = renderBlogDetail(route.replace('/blog/', ''));
    return;
  }
  app.innerHTML = renderHome();
}

async function init() {
  await loadSession();
  await loadData();
  render();
}

document.addEventListener('click', (event) => {
  const viewButton = event.target.closest('button[data-admin-view]');
  if (viewButton) {
    state.activeAdminView = viewButton.dataset.adminView;
    render();
  }
});

document.addEventListener('submit', (event) => {
  if (event.target.id === 'admin-form') {
    handleAdminSubmit(event);
  }
  if (event.target.id === 'login-form') {
    handleLoginSubmit(event);
  }
});

document.addEventListener('click', (event) => {
  if (event.target.closest('button[data-action]')) {
    handleAdminAction(event);
  }
});

init().catch((error) => {
  app.innerHTML = `<div class="hero"><h1>Unable to load data</h1><p>${escapeHtml(error.message)}</p></div>`;
});
