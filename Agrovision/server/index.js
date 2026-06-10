import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import db from './db.js'
import { signToken, requireAuth, optionalAuth, verifyToken } from './auth.js'
import dotenv from 'dotenv'
import { adviceHandler } from './routes/chat.js'
import { diseasesTrendHandler, farmerDiseasesTrendHandler } from './routes/analytics.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../.env') })
console.log('dotenv loaded', { gemini: !!process.env.GEMINI_API_KEY })

const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(join(__dirname, 'uploads')))

const storage = multer.diskStorage({
  destination: join(__dirname, 'uploads'),
  filename: (req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`)
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

const KENYA_PLACES = [
  { name: 'Ngong', county: 'Kajiado County', lat: -1.3527, lng: 36.6699 },
  { name: 'Ongata Rongai', county: 'Kajiado County', lat: -1.3976, lng: 36.7649 },
  { name: 'Karen', county: 'Nairobi County', lat: -1.3197, lng: 36.7061 },
  { name: 'Kiserian', county: 'Kajiado County', lat: -1.4282, lng: 36.6867 },
  { name: 'Nairobi', county: 'Nairobi County', lat: -1.2864, lng: 36.8172 },
  { name: 'Kikuyu', county: 'Kiambu County', lat: -1.2463, lng: 36.6629 },
  { name: 'Kiambu', county: 'Kiambu County', lat: -1.1714, lng: 36.8356 },
  { name: 'Nakuru', county: 'Nakuru County', lat: -0.3031, lng: 36.0800 },
  { name: 'Meru', county: 'Meru County', lat: 0.0463, lng: 37.6559 },
  { name: 'Eldoret', county: 'Uasin Gishu County', lat: 0.5143, lng: 35.2698 },
]

function inferBuyerRegion(lat, lng) {
  const nearest = KENYA_PLACES
    .map(place => ({ ...place, distance: haversine(lat, lng, place.lat, place.lng) }))
    .sort((a, b) => a.distance - b.distance)[0]
  if (!nearest || nearest.distance > 35) return 'Precise coordinates'
  return `${nearest.name}, ${nearest.county}`
}

function preciseLocationLabel(region, lat, lng) {
  return `${region} (${lat.toFixed(5)}, ${lng.toFixed(5)})`
}

function parseBuyerCoords(body = {}) {
  const lat = parseFloat(body.buyer_lat)
  const lng = parseFloat(body.buyer_lng)
  return {
    buyer_lat: Number.isFinite(lat) ? lat : null,
    buyer_lng: Number.isFinite(lng) ? lng : null,
  }
}

// Simulate AI disease diagnosis
function simulateDiagnosis(filename = '', fileSize = 0) {
  const hash = [...(filename + fileSize)].reduce((a, c) => a + c.charCodeAt(0), 0)
  const rand = (hash % 100) / 100

  let disease_result, confidence, affected_area_pct

  if (rand < 0.35) {
    disease_result = 'healthy'
    confidence = 88 + Math.floor(rand * 30)
    affected_area_pct = 0
  } else if (rand < 0.67) {
    disease_result = 'early_blight'
    confidence = 75 + Math.floor((rand - 0.35) * 70)
    affected_area_pct = 10 + Math.floor((rand - 0.35) * 60)
  } else {
    disease_result = 'late_blight'
    confidence = 80 + Math.floor((rand - 0.67) * 60)
    affected_area_pct = 25 + Math.floor((rand - 0.67) * 100)
  }

  confidence = Math.min(confidence, 97)
  affected_area_pct = Math.min(affected_area_pct, 90)

  const severity = disease_result === 'healthy' ? 'none'
    : affected_area_pct < 20 ? 'mild'
    : affected_area_pct < 50 ? 'moderate' : 'severe'

  return { disease_result, confidence, affected_area_pct, severity }
}

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:5002'

function mapAiDiagnosis(label = '') {
  const normalized = label.toLowerCase().replace(/\s+/g, '_')
  if (normalized.includes('early')) return 'early_blight'
  if (normalized.includes('late')) return 'late_blight'
  return 'healthy'
}

function severityFromCoverage(affected_area_pct) {
  if (affected_area_pct <= 0) return 'none'
  if (affected_area_pct < 20) return 'mild'
  if (affected_area_pct < 50) return 'moderate'
  return 'severe'
}

async function runAiDiagnosis(file) {
  const fileBuffer = await readFile(file.path)
  const formData = new FormData()
  formData.append('file', new Blob([fileBuffer], { type: file.mimetype || 'application/octet-stream' }), file.originalname)

  const response = await fetch(`${AI_ENGINE_URL}/predict`, { method: 'POST', body: formData })
  if (!response.ok) throw new Error(`AI engine responded with ${response.status}`)

  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'AI engine prediction failed')

  const disease_result = mapAiDiagnosis(data.diagnosis)
  const affected_area_pct = disease_result === 'healthy' ? 0 : Math.round(Number(data.affected_area_pct) || 0)

  return {
    disease_result,
    confidence: Math.round(Number(data.confidence) || 0),
    affected_area_pct,
    severity: severityFromCoverage(affected_area_pct),
    heatmap: data.heatmap || null,
  }
}

// ── AUTH ──
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'farmer' } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' })
    const password_hash = await bcrypt.hash(password, 10)
    const colors = ['#4ade80','#60a5fa','#f59e0b','#f472b6','#a78bfa','#34d399']
    const avatar_color = colors[Math.floor(Math.random() * colors.length)]
    const id = randomUUID()
    const validRole = ['buyer','farmer','admin'].includes(role) ? role : 'farmer'
    db.prepare('INSERT INTO users (id, name, email, password_hash, role, avatar_color) VALUES (?, ?, ?, ?, ?, ?)').run(id, name.trim(), email.toLowerCase().trim(), password_hash, validRole, avatar_color)
    const user = db.prepare('SELECT id, name, email, role, avatar_color, buyer_lat, buyer_lng, buyer_region, buyer_location, created_at FROM users WHERE id = ?').get(id)
    const token = signToken({ id: user.id, email: user.email, role: user.role })
    res.status(201).json({ token, user })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim())
    if (!user) return res.status(401).json({ error: 'No account found with this email' })
    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) return res.status(401).json({ error: 'Incorrect password' })
    const { password_hash, ...safeUser } = user
    const token = signToken({ id: user.id, email: user.email, role: user.role })
    res.json({ token, user: safeUser })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

app.get('/api/auth/me', (req, res) => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  const payload = verifyToken(auth.slice(7))
  if (!payload) return res.status(401).json({ error: 'Invalid token' })
  const user = db.prepare('SELECT id, name, email, role, avatar_color, buyer_lat, buyer_lng, buyer_region, buyer_location, created_at FROM users WHERE id = ?').get(payload.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

app.put('/api/users/location', requireAuth, (req, res) => {
  const lat = parseFloat(req.body.lat)
  const lng = parseFloat(req.body.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ error: 'Valid lat and lng required' })
  const buyer_region = inferBuyerRegion(lat, lng)
  const buyer_location = preciseLocationLabel(buyer_region, lat, lng)
  db.prepare('UPDATE users SET buyer_lat=?, buyer_lng=?, buyer_region=?, buyer_location=? WHERE id=?').run(lat, lng, buyer_region, buyer_location, req.user.id)
  const user = db.prepare('SELECT id, name, email, role, avatar_color, buyer_lat, buyer_lng, buyer_region, buyer_location, created_at FROM users WHERE id = ?').get(req.user.id)
  res.json(user)
})

// ── DISEASE DIAGNOSIS / AI SCAN ──
app.post('/api/diagnosis/scan', upload.single('image'), async (req, res) => {
  const { user_id, farm_id, notes } = req.body
  const image_url = req.file ? `/uploads/${req.file.filename}` : null

  let diagnosis
  try {
    diagnosis = req.file ? await runAiDiagnosis(req.file) : simulateDiagnosis('', 0)
  } catch (err) {
    console.warn('AI engine unavailable, using simulated diagnosis:', err.message)
    diagnosis = simulateDiagnosis(req.file?.originalname || '', req.file?.size || 0)
  }

  const { disease_result, confidence, affected_area_pct, severity, heatmap = null } = diagnosis
  const id = randomUUID()
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  db.prepare(`INSERT INTO disease_scans (id, user_id, farm_id, image_url, heatmap, disease_result, confidence, severity, affected_area_pct, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, user_id||null, farm_id||null, image_url, heatmap, disease_result, confidence, severity, affected_area_pct, notes||null, now)
  res.json({ id, disease_result, confidence, affected_area_pct, severity, heatmap, image_url, created_at: now })
})

app.get('/api/diagnosis/history', (req, res) => {
  const { user_id, farm_id } = req.query
  let q = 'SELECT * FROM disease_scans WHERE 1=1'
  const params = []
  if (user_id) { q += ' AND user_id=?'; params.push(user_id) }
  if (farm_id) { q += ' AND farm_id=?'; params.push(farm_id) }
  q += ' ORDER BY created_at DESC LIMIT 20'
  res.json(db.prepare(q).all(...params))
})

app.post('/chat/advice', adviceHandler)

// ── INLINE ANALYTICS HANDLER ──
app.get('/api/analytics/disease-trends', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month_raw,
        SUM(CASE WHEN disease_result = 'late_blight' THEN 1 ELSE 0 END) as lateBlight,
        SUM(CASE WHEN disease_result = 'early_blight' THEN 1 ELSE 0 END) as earlyBlight,
        SUM(CASE WHEN disease_result = 'healthy' THEN 1 ELSE 0 END) as healthy
      FROM disease_scans
      GROUP BY month_raw
      ORDER BY month_raw ASC
      LIMIT 6
    `).all();

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    let formattedData = rows.map(r => {
      const [year, month] = r.month_raw.split('-');
      return {
        month: monthNames[parseInt(month, 10) - 1],
        lateBlight: r.lateBlight || 0,
        earlyBlight: r.earlyBlight || 0,
        healthy: r.healthy || 0
      };
    });

    if (formattedData.length < 2) {
      formattedData = [
        { month: 'Jan', lateBlight: 12, earlyBlight: 28, healthy: 45 },
        { month: 'Feb', lateBlight: 18, earlyBlight: 35, healthy: 42 },
        { month: 'Mar', lateBlight: 24, earlyBlight: 40, healthy: 38 },
        { month: 'Apr', lateBlight: 35, earlyBlight: 45, healthy: 30 },
        { month: 'May', lateBlight: 42, earlyBlight: 50, healthy: 25 },
        { month: 'Jun', lateBlight: 28, earlyBlight: 30, healthy: 60 }
      ];
    }

    res.json(formattedData);
  } catch (err) {
    console.error("Disease trends aggregation error:", err);
    res.status(500).json({ error: "Failed to load trends" });
  }
});

app.get('/api/analytics/farmer/:farmId/disease-trends', farmerDiseasesTrendHandler)

// Helper to automatically aggregate live AI scans into region detection counts
function syncRegionDetections() {
  const counts = db.prepare(`
    SELECT f.region, COUNT(s.id) as actual_count
    FROM disease_scans s
    JOIN farms f ON f.id = s.farm_id
    WHERE s.disease_result != 'healthy'
    GROUP BY f.region
  `).all()

  for (const row of counts) {
    db.prepare(`UPDATE region_disease_risk SET detection_count = ? WHERE region = ?`).run(row.actual_count, row.region)
  }
}

// ── FARMS ──
app.get('/api/farms', (req, res) => res.json(db.prepare('SELECT * FROM farms ORDER BY name').all()))

app.get('/api/farms/map', (req, res) => {
  syncRegionDetections()

  const adminView = req.query.view === 'admin'
  const regions = db.prepare('SELECT * FROM region_disease_risk ORDER BY region').all()

  if (!adminView) {
    const farms = db.prepare(`
      SELECT f.*, r.risk_level, r.detection_count, r.blight_type as region_blight,
        COUNT(p.id) as product_count
      FROM farms f
      LEFT JOIN region_disease_risk r ON r.region = f.region
      LEFT JOIN products p ON p.farm_id = f.id AND p.status = 'approved' AND p.quarantined = 0
      GROUP BY f.id ORDER BY f.name
    `).all()
    return res.json(farms)
  }

  let farms
  try {
    farms = db.prepare(`
      SELECT f.*, r.risk_level, r.detection_count, r.blight_type as region_blight,
        COALESCE(SUM(CASE WHEN p.status = 'approved' AND p.quarantined = 0 THEN 1 ELSE 0 END), 0) as product_count,
        COALESCE(SUM(CASE WHEN p.quarantined = 1 THEN 1 ELSE 0 END), 0) as quarantined_count,
        COALESCE(SUM(CASE WHEN p.status = 'pending' THEN 1 ELSE 0 END), 0) as pending_count,
        COALESCE(SUM(CASE WHEN p.status = 'archived' THEN 1 ELSE 0 END), 0) as archived_count,
        COALESCE(SUM(p.views), 0) as total_views,
        (SELECT COALESCE(SUM(revenue), 0) FROM sales WHERE farm_id = f.id) as total_revenue,
        (SELECT COUNT(*) FROM sales WHERE farm_id = f.id) as sales_count,
        (SELECT COUNT(*) FROM disease_scans WHERE farm_id = f.id) as scan_count,
        (SELECT disease_result FROM disease_scans WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1) as last_scan_result,
        (SELECT confidence FROM disease_scans WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1) as last_scan_confidence,
        (SELECT severity FROM disease_scans WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1) as last_scan_severity,
        (SELECT image_url FROM disease_scans WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1) as last_scan_image_url,
        (SELECT heatmap FROM disease_scans WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1) as last_scan_heatmap,
        (SELECT created_at FROM disease_scans WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1) as last_scan_at,
        (SELECT status FROM certifications WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1) as cert_status
      FROM farms f
      LEFT JOIN region_disease_risk r ON r.region = f.region
      LEFT JOIN products p ON p.farm_id = f.id
      GROUP BY f.id ORDER BY f.name
    `).all()
  } catch (err) {
    console.error('Admin map query failed:', err)
    return res.status(500).json({ error: 'Failed to load admin map data' })
  }

  const summary = {
    total_farms: farms.length,
    certified_farms: farms.filter(f => f.certified_clean === 1).length,
    disease_safe_farms: farms.filter(f => f.disease_safe === 1).length,
    outbreak_regions: regions.filter(r => r.risk_level === 'outbreak').length,
    watch_regions: regions.filter(r => r.risk_level === 'watch').length,
    total_detections: regions.reduce((s, r) => s + (r.detection_count || 0), 0),
    quarantined_listings: farms.reduce((s, f) => s + (f.quarantined_count || 0), 0),
    pending_listings: farms.reduce((s, f) => s + (f.pending_count || 0), 0),
    farms_in_outbreak_zone: farms.filter(f => f.risk_level === 'outbreak').length,
    total_revenue: farms.reduce((s, f) => s + (f.total_revenue || 0), 0),
    total_scans: farms.reduce((s, f) => s + (f.scan_count || 0), 0),
  }

  res.json({ farms, regions, summary })
})

app.post('/api/farms', (req, res) => {
  const { name, region, lat, lng, owner_email, owner_phone, disease_safe } = req.body
  const id = randomUUID()
  db.prepare(`INSERT INTO farms (id,name,region,lat,lng,owner_email,owner_phone,disease_safe) VALUES (?,?,?,?,?,?,?,?)`).run(id, name, region, lat||0, lng||0, owner_email||null, owner_phone||null, disease_safe?1:0)
  res.status(201).json(db.prepare('SELECT * FROM farms WHERE id=?').get(id))
})

// UPDATED ROUTE: Properly parses incoming coordinates from frontend
app.put('/api/farms/:id', (req, res) => {
  const { name, region, lat, lng, owner_email, owner_phone, disease_safe } = req.body
  const ex = db.prepare('SELECT * FROM farms WHERE id=?').get(req.params.id)
  
  if (!ex) return res.status(404).json({ error: 'Not found' })

  const parsedLat = lat !== undefined ? parseFloat(lat) : ex.lat
  const parsedLng = lng !== undefined ? parseFloat(lng) : ex.lng

  db.prepare(`UPDATE farms SET name=?, region=?, lat=?, lng=?, owner_email=?, owner_phone=?, disease_safe=? WHERE id=?`).run(
    name || ex.name,
    region || ex.region,
    parsedLat,
    parsedLng,
    owner_email || ex.owner_email,
    owner_phone || ex.owner_phone,
    disease_safe !== undefined ? (disease_safe ? 1 : 0) : ex.disease_safe,
    req.params.id
  )
  
  res.json(db.prepare('SELECT * FROM farms WHERE id=?').get(req.params.id))
})

// ── PRODUCTS ──
app.get('/api/products', (req, res) => {
  const { search, category, region, disease_safe, certified, sort='newest', status='approved', buyer_lat, buyer_lng } = req.query
  let query = `
    SELECT p.*, f.name as farm_name, f.region, f.disease_safe, f.certified_clean, f.rating, f.lat as farm_lat, f.lng as farm_lng,
      r.risk_level as region_risk, r.blight_type as region_blight,
      COALESCE(rv.avg_rating, f.rating) as product_rating,
      COALESCE(rv.review_count, 0) as review_count
    FROM products p
    JOIN farms f ON p.farm_id = f.id
    LEFT JOIN region_disease_risk r ON r.region = f.region
    LEFT JOIN (SELECT product_id, AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE approved=1 GROUP BY product_id) rv ON rv.product_id = p.id
    WHERE p.status = ?
  `
  const params = [status]
  if (search) {
    const ids = db.prepare(`SELECT product_id FROM products_fts WHERE products_fts MATCH ?`).all(`${search}*`).map(r => r.product_id)
    if (!ids.length) return res.json([])
    query += ` AND p.id IN (${ids.map(()=>'?').join(',')})`;  params.push(...ids)
  }
  if (category) { query += ' AND p.category=?'; params.push(category) }
  if (region) { query += ' AND f.region=?'; params.push(region) }
  if (disease_safe === 'true') query += ' AND f.disease_safe=1'
  if (certified === 'true') query += ' AND f.certified_clean=1'
  if (sort === 'price_asc') query += ' ORDER BY p.price ASC'
  else if (sort === 'price_desc') query += ' ORDER BY p.price DESC'
  else if (sort === 'rating') query += ' ORDER BY product_rating DESC'
  else query += ' ORDER BY p.created_at DESC'

  let products = db.prepare(query).all(...params)
  if (buyer_lat && buyer_lng) {
    const blat = parseFloat(buyer_lat), blng = parseFloat(buyer_lng)
    products = products.map(p => ({ ...p, distance_km: Math.round(haversine(blat, blng, p.farm_lat, p.farm_lng)) }))
    if (sort === 'proximity') products.sort((a, b) => a.distance_km - b.distance_km)
  }
  res.json(products)
})

app.get('/api/products/:id', (req, res) => {
  db.prepare(`UPDATE products SET views=views+1 WHERE id=?`).run(req.params.id)
  const p = db.prepare(`SELECT p.*, f.name as farm_name, f.region, f.disease_safe, f.certified_clean, f.rating, f.lat as farm_lat, f.lng as farm_lng, r.risk_level as region_risk, r.blight_type as region_blight FROM products p JOIN farms f ON p.farm_id=f.id LEFT JOIN region_disease_risk r ON r.region=f.region WHERE p.id=?`).get(req.params.id)
  if (!p) return res.status(404).json({ error: 'Not found' })
  res.json(p)
})

app.post('/api/products', upload.single('image'), (req, res) => {
  const { name, category, price, quantity, farm_id, disease_type } = req.body
  let disease_risk_tag = req.body.disease_risk_tag || 'low'
  if (!['low','medium','high'].includes(disease_risk_tag)) disease_risk_tag = 'low'
  if (!name || !category || !price || !quantity || !farm_id) return res.status(400).json({ error: 'All fields required' })
  const id = randomUUID()
  const image_url = req.file ? `/uploads/${req.file.filename}` : null
  db.prepare(`INSERT INTO products (id,name,category,price,quantity,farm_id,disease_risk_tag,disease_type,image_url,status) VALUES (?,?,?,?,?,?,?,?,?,'pending')`).run(id, name, category, parseFloat(price), parseInt(quantity), farm_id, disease_risk_tag, disease_type||'none', image_url)
  const farm = db.prepare('SELECT name FROM farms WHERE id=?').get(farm_id)
  db.prepare(`INSERT INTO products_fts (product_id,name,farm_name) VALUES (?,?,?)`).run(id, name, farm?.name||'')
  res.status(201).json(db.prepare(`SELECT p.*, f.name as farm_name, f.region, f.disease_safe, f.certified_clean, f.rating FROM products p JOIN farms f ON p.farm_id=f.id WHERE p.id=?`).get(id))
})

app.put('/api/products/:id', upload.single('image'), (req, res) => {
  const { name, category, price, quantity, farm_id, disease_risk_tag, disease_type } = req.body
  const ex = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id)
  if (!ex) return res.status(404).json({ error: 'Not found' })
  let normalizedRisk = disease_risk_tag || ex.disease_risk_tag || 'low'
  if (!['low','medium','high'].includes(normalizedRisk)) normalizedRisk = 'low'
  const image_url = req.file ? `/uploads/${req.file.filename}` : ex.image_url
  db.prepare(`UPDATE products SET name=?,category=?,price=?,quantity=?,farm_id=?,disease_risk_tag=?,disease_type=?,image_url=?,status='pending' WHERE id=?`).run(name||ex.name, category||ex.category, parseFloat(price)||ex.price, parseInt(quantity)||ex.quantity, farm_id||ex.farm_id, disease_risk_tag||ex.disease_risk_tag, disease_type||ex.disease_type||'none', image_url, req.params.id)
  db.prepare(`UPDATE products_fts SET name=? WHERE product_id=?`).run(name||ex.name, req.params.id)
  res.json(db.prepare(`SELECT p.*, f.name as farm_name, f.region, f.disease_safe, f.certified_clean, f.rating FROM products p JOIN farms f ON p.farm_id=f.id WHERE p.id=?`).get(req.params.id))
})

app.delete('/api/products/:id', (req, res) => {
  const ex = db.prepare('SELECT id FROM products WHERE id=?').get(req.params.id)
  if (!ex) return res.status(404).json({ error: 'Not found' })
  db.prepare('DELETE FROM products WHERE id=?').run(req.params.id)
  db.prepare('DELETE FROM products_fts WHERE product_id=?').run(req.params.id)
  res.json({ success: true })
})

app.patch('/api/products/:id/archive', (req, res) => { db.prepare(`UPDATE products SET status='archived' WHERE id=?`).run(req.params.id); res.json({ success: true }) })
app.patch('/api/products/:id/approve', (req, res) => { db.prepare(`UPDATE products SET status='approved' WHERE id=?`).run(req.params.id); res.json(db.prepare(`SELECT p.*, f.name as farm_name, f.region FROM products p JOIN farms f ON p.farm_id=f.id WHERE p.id=?`).get(req.params.id)) })
app.patch('/api/products/:id/reject', (req, res) => { db.prepare(`UPDATE products SET status='archived' WHERE id=?`).run(req.params.id); res.json({ success: true }) })
app.patch('/api/products/:id/quarantine', (req, res) => { db.prepare(`UPDATE products SET quarantined=1 WHERE id=?`).run(req.params.id); res.json({ success: true }) })
app.patch('/api/products/:id/unquarantine', (req, res) => { db.prepare(`UPDATE products SET quarantined=0 WHERE id=?`).run(req.params.id); res.json({ success: true }) })

// ── REVIEWS ──
app.get('/api/reviews', (req, res) => {
  const { product_id, farm_id, approved } = req.query
  let q = `SELECT r.*, p.name as product_name FROM reviews r JOIN products p ON p.id=r.product_id WHERE 1=1`
  const params = []
  if (product_id) { q += ' AND r.product_id=?'; params.push(product_id) }
  if (farm_id) { q += ' AND r.farm_id=?'; params.push(farm_id) }
  if (approved !== undefined) { q += ' AND r.approved=?'; params.push(parseInt(approved)) }
  q += ' ORDER BY r.created_at DESC'
  res.json(db.prepare(q).all(...params))
})

app.post('/api/reviews', (req, res) => {
  const { product_id, rating, comment, buyer_name } = req.body
  if (!product_id || !rating || !buyer_name) return res.status(400).json({ error: 'Missing fields' })
  const product = db.prepare('SELECT * FROM products WHERE id=?').get(product_id)
  if (!product) return res.status(404).json({ error: 'Product not found' })
  const id = randomUUID()
  db.prepare(`INSERT INTO reviews (id,product_id,farm_id,rating,comment,buyer_name) VALUES (?,?,?,?,?,?)`).run(id, product_id, product.farm_id, parseInt(rating), comment||null, buyer_name)
  const cnt = db.prepare(`SELECT COUNT(*) as cnt FROM reviews WHERE farm_id=? AND approved=1`).get(product.farm_id)
  const farmAvg = db.prepare(`SELECT AVG(rating) as avg FROM reviews WHERE farm_id=? AND approved=1`).get(product.farm_id)
  db.prepare(`UPDATE farms SET rating=?,rating_count=? WHERE id=?`).run(Math.round(farmAvg.avg*10)/10, cnt.cnt, product.farm_id)
  res.status(201).json(db.prepare('SELECT * FROM reviews WHERE id=?').get(id))
})

app.patch('/api/reviews/:id/approve', (req, res) => { db.prepare(`UPDATE reviews SET approved=1 WHERE id=?`).run(req.params.id); res.json({ success: true }) })
app.patch('/api/reviews/:id/reject', (req, res) => { db.prepare(`UPDATE reviews SET approved=0 WHERE id=?`).run(req.params.id); res.json({ success: true }) })
app.delete('/api/reviews/:id', (req, res) => { db.prepare(`DELETE FROM reviews WHERE id=?`).run(req.params.id); res.json({ success: true }) })

// ── CERTIFICATIONS & CHECKOUT ──
app.post('/api/checkout', async (req, res) => { 
  try {
    const { product_id, quantity = 1, payment_method, buyer_name, buyer_region, buyer_location, phone, email, card_last4 } = req.body
    const { buyer_lat, buyer_lng } = parseBuyerCoords(req.body)
    const qty = parseInt(quantity)
    const allowedMethods = ['paypal', 'card', 'mpesa']
    if (!product_id || !allowedMethods.includes(payment_method)) return res.status(400).json({ error: 'Product and payment method required' })
    if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: 'Quantity must be at least 1' })
    if (!buyer_name?.trim()) return res.status(400).json({ error: 'Buyer name required' })

    const product = db.prepare("SELECT * FROM products WHERE id=? AND status='approved' AND quarantined=0").get(product_id)
    if (!product) return res.status(404).json({ error: 'Product is not available for checkout' })
    if (product.quantity < qty) return res.status(409).json({ error: 'Not enough stock available' })
    if (payment_method === 'mpesa' && !phone?.trim()) return res.status(400).json({ error: 'M-Pesa phone number required' })
    if (payment_method === 'paypal' && !email?.trim()) return res.status(400).json({ error: 'PayPal email required' })
    if (payment_method === 'card' && !card_last4?.trim()) return res.status(400).json({ error: 'Card last four digits required' })

    await new Promise(resolve => setTimeout(resolve, 1500));

    const id = randomUUID()
    const referencePrefix = payment_method === 'mpesa' ? 'MPESA' : payment_method === 'paypal' ? 'PAYPAL' : 'CARD'
    const payment_reference = `${referencePrefix}-${id.slice(0, 8).toUpperCase()}`
    const revenue = Math.round(product.price * qty * 100) / 100

    const createSale = db.transaction(() => {
      db.prepare('UPDATE products SET quantity=quantity-? WHERE id=?').run(qty, product_id)
      db.prepare(`INSERT INTO sales (id,product_id,farm_id,quantity,revenue,buyer_region,buyer_lat,buyer_lng,buyer_location,buyer_name,payment_method,payment_reference,payment_status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'paid')`).run(id, product_id, product.farm_id, qty, revenue, buyer_region || null, buyer_lat, buyer_lng, buyer_location || null, buyer_name.trim(), payment_method, payment_reference)
    })
    createSale()

    res.status(201).json({ id, payment_reference, payment_status: 'paid', payment_method, quantity: qty, total: revenue })
  } catch (err) {
    console.error('Checkout error:', err)
    res.status(500).json({ error: 'Checkout failed' })
  }
})

app.post('/api/checkout-cart', async (req, res) => { 
  try {
    const { items = [], payment_method, buyer_name, buyer_region, buyer_location, phone, email, card_last4 } = req.body
    const { buyer_lat, buyer_lng } = parseBuyerCoords(req.body)
    const allowedMethods = ['paypal', 'card', 'mpesa']
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Cart is empty' })
    if (!allowedMethods.includes(payment_method)) return res.status(400).json({ error: 'Payment method required' })
    if (!buyer_name?.trim()) return res.status(400).json({ error: 'Buyer name required' })
    if (payment_method === 'mpesa' && !phone?.trim()) return res.status(400).json({ error: 'M-Pesa phone number required' })
    if (payment_method === 'paypal' && !email?.trim()) return res.status(400).json({ error: 'PayPal email required' })
    if (payment_method === 'card' && !card_last4?.trim()) return res.status(400).json({ error: 'Card last four digits required' })

    const normalized = items.map(item => ({ product_id: item.product_id, quantity: parseInt(item.quantity) }))
    if (normalized.some(item => !item.product_id || !Number.isInteger(item.quantity) || item.quantity < 1)) {
      return res.status(400).json({ error: 'Every cart item needs a product and quantity' })
    }

    const products = normalized.map(item => {
      const product = db.prepare("SELECT * FROM products WHERE id=? AND status='approved' AND quarantined=0").get(item.product_id)
      if (!product) throw Object.assign(new Error('Product is not available for checkout'), { status: 404 })
      if (product.quantity < item.quantity) throw Object.assign(new Error(`Not enough stock for ${product.name}`), { status: 409 })
      return { ...item, product }
    })

    await new Promise(resolve => setTimeout(resolve, 1500));

    const referencePrefix = payment_method === 'mpesa' ? 'MPESA' : payment_method === 'paypal' ? 'PAYPAL' : 'CARD'
    const payment_reference = `${referencePrefix}-${randomUUID().slice(0, 8).toUpperCase()}`
    const total = Math.round(products.reduce((sum, item) => sum + item.product.price * item.quantity, 0) * 100) / 100

    const createSales = db.transaction(() => {
      for (const item of products) {
        const saleId = randomUUID()
        const revenue = Math.round(item.product.price * item.quantity * 100) / 100
        db.prepare('UPDATE products SET quantity=quantity-? WHERE id=?').run(item.quantity, item.product_id)
        db.prepare(`INSERT INTO sales (id,product_id,farm_id,quantity,revenue,buyer_region,buyer_lat,buyer_lng,buyer_location,buyer_name,payment_method,payment_reference,payment_status)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'paid')`).run(saleId, item.product_id, item.product.farm_id, item.quantity, revenue, buyer_region || null, buyer_lat, buyer_lng, buyer_location || null, buyer_name.trim(), payment_method, payment_reference)
      }
    })
    createSales()

    res.status(201).json({ payment_reference, payment_status: 'paid', payment_method, item_count: products.length, total })
  } catch (err) {
    console.error('Cart checkout error:', err)
    res.status(err.status || 500).json({ error: err.message || 'Cart checkout failed' })
  }
})

app.get('/api/certifications', (req, res) => {
  const { farm_id } = req.query
  let q = `SELECT c.*, f.name as farm_name, f.region FROM certifications c JOIN farms f ON f.id=c.farm_id`
  const params = []
  if (farm_id) { q += ' WHERE c.farm_id=?'; params.push(farm_id) }
  q += ' ORDER BY c.created_at DESC'
  res.json(db.prepare(q).all(...params))
})

app.post('/api/farms/:id/certify', (req, res) => {
  const { reason } = req.body
  db.prepare(`UPDATE farms SET certified_clean=1,disease_safe=1 WHERE id=?`).run(req.params.id)
  db.prepare(`INSERT INTO certifications (id,farm_id,status,reason,blight_type) VALUES (?,?,'certified',?,'none')`).run(randomUUID(), req.params.id, reason||'AI scan passed — no Early or Late Blight detected')
  res.json({ success: true })
})

app.post('/api/farms/:id/revoke', (req, res) => {
  const { reason, blight_type } = req.body
  db.prepare(`UPDATE farms SET certified_clean=0,disease_safe=0 WHERE id=?`).run(req.params.id)
  db.prepare(`INSERT INTO certifications (id,farm_id,status,reason,blight_type) VALUES (?,?,'revoked',?,?)`).run(randomUUID(), req.params.id, reason||'Disease detected', blight_type||'early_blight')
  res.json({ success: true })
})

// ── DISEASE REGIONS ──
app.get('/api/regions/disease-risk', (req, res) => {
  syncRegionDetections() 
  res.json(db.prepare('SELECT * FROM region_disease_risk ORDER BY region').all())
})

app.put('/api/regions/disease-risk/:region', (req, res) => {
  const { risk_level, detection_count, blight_type } = req.body
  db.prepare(`INSERT INTO region_disease_risk (region,risk_level,detection_count,blight_type,updated_at) VALUES (?,?,?,?,datetime('now'))
    ON CONFLICT(region) DO UPDATE SET risk_level=excluded.risk_level,detection_count=excluded.detection_count,blight_type=excluded.blight_type,updated_at=excluded.updated_at`).run(req.params.region, risk_level, detection_count||0, blight_type||'none')
  if (risk_level === 'outbreak' || risk_level === 'watch') {
    const blightLabel = blight_type === 'late_blight' ? 'Late Blight' : 'Early Blight'
    const msg = risk_level === 'outbreak'
      ? `${blightLabel} outbreak in ${req.params.region} — ${detection_count} potato farms affected. Listings quarantined pending inspection.`
      : `${blightLabel} activity elevated in ${req.params.region} (${detection_count} detections). Sellers advised to inspect crops.`
    db.prepare(`INSERT INTO disease_alerts (id,region,message,severity,blight_type,created_at,simulated_email,simulated_sms) VALUES (?,?,?,?,?,datetime('now'),1,1)`).run(randomUUID(), req.params.region, msg, risk_level, blight_type||'early_blight')
    if (risk_level === 'outbreak') {
      db.prepare(`SELECT id FROM farms WHERE region=?`).all(req.params.region).forEach(f => db.prepare(`UPDATE products SET quarantined=1 WHERE farm_id=? AND status='approved'`).run(f.id))
    }
  }
  res.json({ success: true })
})

// ── ALERTS ──
app.get('/api/alerts', (req, res) => res.json(db.prepare('SELECT * FROM disease_alerts ORDER BY created_at DESC').all()))

// ── ANALYTICS ──
app.get('/api/seller/analytics', (req, res) => {
  const { farm_id } = req.query
  const where = farm_id ? 'WHERE s.farm_id=?' : 'WHERE 1=1'
  const params = farm_id ? [farm_id] : []
  const totalRevenue = db.prepare(`SELECT COALESCE(SUM(revenue),0) as total FROM sales s ${where}`).get(...params)
  const totalSales = db.prepare(`SELECT COALESCE(SUM(quantity),0) as total FROM sales s ${where}`).get(...params)
  const totalViews = farm_id ? db.prepare(`SELECT COALESCE(SUM(views),0) as total FROM products WHERE farm_id=?`).get(farm_id) : db.prepare(`SELECT COALESCE(SUM(views),0) as total FROM products`).get()
  const byProduct = db.prepare(`SELECT p.name,p.id,SUM(s.revenue) as revenue,SUM(s.quantity) as units,COUNT(s.id) as orders FROM sales s JOIN products p ON p.id=s.product_id ${where} GROUP BY s.product_id ORDER BY revenue DESC LIMIT 5`).all(...params)
  const byMonth = db.prepare(`SELECT strftime('%Y-%m',s.created_at) as month,SUM(s.revenue) as revenue,SUM(s.quantity) as units FROM sales s ${where} GROUP BY month ORDER BY month`).all(...params)
  const byRegion = db.prepare(`SELECT s.buyer_region,SUM(s.revenue) as revenue,SUM(s.quantity) as units FROM sales s ${where} GROUP BY s.buyer_region ORDER BY revenue DESC`).all(...params)
  const alertImpact = db.prepare(`SELECT a.created_at as alert_date,a.region,a.blight_type,a.severity FROM disease_alerts a ORDER BY a.created_at`).all()
  res.json({ totalRevenue: totalRevenue.total, totalSales: totalSales.total, totalViews: totalViews.total, byProduct, byMonth, byRegion, alertImpact })
})

// ── DELIVERY ESTIMATE ──
app.get('/api/delivery-estimate', (req, res) => {
  const { farm_id, buyer_lat, buyer_lng } = req.query
  if (!farm_id || !buyer_lat || !buyer_lng) return res.status(400).json({ error: 'farm_id, buyer_lat, buyer_lng required' })
  const farm = db.prepare('SELECT lat,lng FROM farms WHERE id=?').get(farm_id)
  if (!farm) return res.status(404).json({ error: 'Farm not found' })
  const dist = Math.round(haversine(parseFloat(buyer_lat), parseFloat(buyer_lng), farm.lat, farm.lng))
  const days = dist < 100 ? 1 : dist < 400 ? 2 : dist < 800 ? 3 : 5
  res.json({ distance_km: dist, estimated_days: days, label: `~${dist} km · est. ${days} day${days>1?'s':''}` })
})

// ── STATS ──
app.get('/api/stats', (req, res) => {
  const total = db.prepare(`SELECT COUNT(*) as count FROM products WHERE status='approved'`).get()
  const pending = db.prepare(`SELECT COUNT(*) as count FROM products WHERE status='pending'`).get()
  const archived = db.prepare(`SELECT COUNT(*) as count FROM products WHERE status='archived'`).get()
  const quarantined = db.prepare(`SELECT COUNT(*) as count FROM products WHERE quarantined=1`).get()
  const certified = db.prepare(`SELECT COUNT(*) as count FROM farms WHERE certified_clean=1`).get()
  const byCategory = db.prepare(`SELECT category,COUNT(*) as count FROM products WHERE status='approved' GROUP BY category`).all()
  const outbreaks = db.prepare(`SELECT COUNT(*) as count FROM region_disease_risk WHERE risk_level='outbreak'`).get()
  const scans = db.prepare(`SELECT COUNT(*) as count FROM disease_scans`).get()
  res.json({ total: total.count, pending: pending.count, archived: archived.count, quarantined: quarantined.count, certified: certified.count, byCategory, outbreaks: outbreaks.count, scans: scans.count })
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../client/dist')))
  app.get('*', (req, res) => res.sendFile(join(__dirname, '../client/dist/index.html')))
}

// ── ERROR HANDLING ──
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }))
app.use((err, req, res, next) => {
  console.error('API error:', err)
  if (req.path.startsWith('/api')) return res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
  next(err)
})

app.listen(PORT, '0.0.0.0', () => console.log(`FarmMarket API running on port ${PORT}`))