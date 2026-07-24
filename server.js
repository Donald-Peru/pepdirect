const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const SESSION_NAME = 'peptide_session';
const SESSIONS = new Map();

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { peptides: [], therapyCenters: [], makers: [], blogs: [], users: [] };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return raw.split(';').map((item) => item.trim()).filter(Boolean).reduce((result, entry) => {
    const separator = entry.indexOf('=');
    if (separator === -1) return result;
    const key = entry.slice(0, separator);
    const value = entry.slice(separator + 1);
    result[key] = value;
    return result;
  }, {});
}

function getSessionUser(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_NAME];
  if (!token) return null;
  return SESSIONS.get(token) || null;
}

function createSession(res, user) {
  const token = crypto.randomBytes(24).toString('hex');
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions || [],
  };

  SESSIONS.set(token, safeUser);
  res.setHeader('Set-Cookie', `${SESSION_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax`);
  return safeUser;
}

function clearSession(res) {
  res.setHeader('Set-Cookie', `${SESSION_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function hashPassword(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function normalizeArrayField(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value || '')
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function findItem(items, identifier) {
  return items.find((item) => item.id === identifier || item.slug === identifier);
}

function createItem(collectionName, payload) {
  const now = new Date().toISOString();
  const base = {
    id: `${collectionName}-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };

  switch (collectionName) {
    case 'peptides':
      return {
        ...base,
        name: payload.name || 'Untitled peptide',
        slug: slugify(payload.slug || payload.name || 'untitled-peptide'),
        status: payload.status || 'Research',
        summary: payload.summary || 'A peptide profile',
        description: payload.description || payload.summary || 'A peptide profile',
        category: payload.category || 'Research',
        tradeNames: normalizeArrayField(payload.tradeNames || payload.trade_name || payload.trade_names),
        companies: normalizeArrayField(payload.companies),
        manufacturer: payload.manufacturer || '',
        mechanism: payload.mechanism || '',
        commonUses: normalizeArrayField(payload.commonUses || payload.common_uses),
        approvedFor: payload.approvedFor || payload.approved_use || '',
        researchNotes: payload.researchNotes || payload.research_notes || '',
        safetyNotes: payload.safetyNotes || payload.safety_notes || '',
        sourceLinks: normalizeArrayField(payload.sourceLinks || payload.source_links),
        website: payload.website || '',
        imageUrl: payload.imageUrl || payload.image_url || '',
        isFeatured: Boolean(payload.isFeatured || payload.is_featured),
      };
    case 'therapyCenters':
      return {
        ...base,
        name: payload.name || 'New therapy center',
        slug: slugify(payload.slug || payload.name || 'new-therapy-center'),
        location: payload.location || [payload.city, payload.state, payload.country].filter(Boolean).join(', ') || 'United States',
        focus: payload.focus || 'Peptide therapy',
        streetAddress: payload.streetAddress || '',
        addressLocality: payload.city || '',
        addressRegion: payload.state || '',
        postalCode: payload.postalCode || '',
        addressCountry: payload.country || 'United States',
        telephone: payload.phone || '',
        email: payload.email || '',
        website: payload.website || '',
        description: payload.description || 'New therapy center profile',
        specialties: normalizeArrayField(payload.specialties || payload.specialty),
        services: normalizeArrayField(payload.services),
        openingHours: payload.openingHours || '',
        latitude: payload.latitude || '',
        longitude: payload.longitude || '',
        imageUrl: payload.imageUrl || payload.image_url || '',
        sameAs: normalizeArrayField(payload.sameAs || payload.same_as),
      };
    case 'makers':
      return {
        ...base,
        name: payload.name || 'New peptide maker',
        slug: slugify(payload.slug || payload.name || 'new-peptide-maker'),
        location: payload.location || [payload.city, payload.state, payload.country].filter(Boolean).join(', ') || 'United States',
        focus: payload.focus || 'Peptide manufacturing',
        streetAddress: payload.streetAddress || '',
        addressLocality: payload.city || '',
        addressRegion: payload.state || '',
        postalCode: payload.postalCode || '',
        addressCountry: payload.country || 'United States',
        telephone: payload.phone || '',
        email: payload.email || '',
        website: payload.website || '',
        description: payload.description || 'New peptide maker profile',
        specialties: normalizeArrayField(payload.specialties || payload.specialty),
        certifications: normalizeArrayField(payload.certifications),
        products: normalizeArrayField(payload.products),
        imageUrl: payload.imageUrl || payload.image_url || '',
        sameAs: normalizeArrayField(payload.sameAs || payload.same_as),
      };
    case 'blogs':
      return {
        ...base,
        title: payload.title || 'New blog post',
        slug: slugify(payload.slug || payload.title || 'new-blog-post'),
        category: payload.category || 'News',
        excerpt: payload.excerpt || 'A new article',
        content: payload.content || 'Write your blog content here.',
        metaTitle: payload.metaTitle || payload.title || 'New blog post',
        metaDescription: payload.metaDescription || payload.excerpt || 'A new article',
        canonicalUrl: payload.canonicalUrl || '',
        author: payload.author || '',
        tags: normalizeArrayField(payload.tags),
        featuredImage: payload.featuredImage || payload.featured_image || '',
        publishStatus: payload.publishStatus || 'Draft',
        schemaType: payload.schemaType || 'BlogPosting',
      };
    case 'users':
      return {
        ...base,
        name: payload.name || 'New user',
        email: payload.email || 'user@example.com',
        role: payload.role || 'Viewer',
        permissions: (payload.permissions || 'view').split(',').map((item) => item.trim()).filter(Boolean),
      };
    default:
      return { ...base, ...payload };
  }
}

function handleApi(req, res, url) {
  const segments = url.pathname.split('/').filter(Boolean);
  const collectionName = segments[1];
  const identifier = segments[2];

  if (req.method === 'GET' && segments[0] === 'api' && segments.length === 2 && collectionName === 'session') {
    const sessionUser = getSessionUser(req);
    if (!sessionUser) return sendJson(res, 401, { error: 'Unauthorized' });
    return sendJson(res, 200, { user: sessionUser });
  }

  if (req.method === 'POST' && segments[0] === 'api' && segments.length === 2 && collectionName === 'login') {
    readJsonBody(req)
      .then((payload) => {
        const data = loadData();
        const candidate = (data.users || []).find((user) => user.email === payload.email);
        const storedPassword = candidate?.passwordHash || candidate?.password || '';
        if (!candidate || hashPassword(payload.password || '') !== storedPassword) {
          return sendJson(res, 401, { error: 'Invalid credentials' });
        }
        const sessionUser = createSession(res, candidate);
        return sendJson(res, 200, { user: sessionUser });
      })
      .catch((error) => sendJson(res, 400, { error: error.message }));
    return;
  }

  if (req.method === 'POST' && segments[0] === 'api' && segments.length === 2 && collectionName === 'logout') {
    clearSession(res);
    return sendJson(res, 200, { success: true });
  }

  if (req.method === 'GET' && segments[0] === 'api' && segments.length === 2 && collectionName) {
    const data = loadData();
    const collection = data[collectionName] || [];
    return sendJson(res, 200, collection);
  }

  if (req.method === 'GET' && segments[0] === 'api' && segments.length === 3 && collectionName) {
    const data = loadData();
    const collection = data[collectionName] || [];
    const item = findItem(collection, identifier);
    if (!item) return sendJson(res, 404, { error: 'Item not found' });
    return sendJson(res, 200, item);
  }

  if (req.method === 'POST' && segments[0] === 'api' && segments.length === 2 && collectionName) {
    const sessionUser = getSessionUser(req);
    if (!sessionUser) return sendJson(res, 401, { error: 'Unauthorized' });

    readJsonBody(req)
      .then((payload) => {
        const data = loadData();
        const collection = data[collectionName] || [];
        const item = createItem(collectionName, payload);
        collection.unshift(item);
        data[collectionName] = collection;
        saveData(data);
        return sendJson(res, 201, item);
      })
      .catch((error) => sendJson(res, 400, { error: error.message }));
    return;
  }

  if (req.method === 'PUT' && segments[0] === 'api' && segments.length === 3 && collectionName) {
    const sessionUser = getSessionUser(req);
    if (!sessionUser) return sendJson(res, 401, { error: 'Unauthorized' });

    readJsonBody(req)
      .then((payload) => {
        const data = loadData();
        const collection = data[collectionName] || [];
        const index = collection.findIndex((item) => item.id === identifier || item.slug === identifier);
        if (index === -1) return sendJson(res, 404, { error: 'Item not found' });

        const updated = {
          ...collection[index],
          ...payload,
          updatedAt: new Date().toISOString(),
        };
        updated.slug = updated.slug || slugify(updated.name || updated.title || 'item');
        collection[index] = updated;
        data[collectionName] = collection;
        saveData(data);
        return sendJson(res, 200, updated);
      })
      .catch((error) => sendJson(res, 400, { error: error.message }));
    return;
  }

  if (req.method === 'DELETE' && segments[0] === 'api' && segments.length === 3 && collectionName) {
    const sessionUser = getSessionUser(req);
    if (!sessionUser) return sendJson(res, 401, { error: 'Unauthorized' });

    const data = loadData();
    const collection = data[collectionName] || [];
    const filtered = collection.filter((item) => item.id !== identifier && item.slug !== identifier);
    if (filtered.length === collection.length) return sendJson(res, 404, { error: 'Item not found' });
    data[collectionName] = filtered;
    saveData(data);
    return sendJson(res, 200, { success: true });
  }

  if (req.method === 'GET' && segments[0] === 'api' && segments.length === 2 && collectionName === 'overview') {
    const data = loadData();
    return sendJson(res, 200, {
      peptides: data.peptides.length,
      centers: data.therapyCenters.length,
      makers: data.makers.length,
      blogs: data.blogs.length,
      users: data.users.length,
    });
  }

  return sendJson(res, 404, { error: 'Route not found' });
}

function serveStatic(req, res, url) {
  const pathname = decodeURIComponent(url.pathname);
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(PUBLIC_DIR, requestedPath);

  if (filePath.startsWith(PUBLIC_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(filePath));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(fs.readFileSync(path.join(PUBLIC_DIR, 'index.html')));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url);
    return;
  }
  serveStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log(`Peptide directory server running at http://localhost:${PORT}`);
});
