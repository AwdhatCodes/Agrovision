import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'
import { randomUUID } from 'crypto'
import db from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(join(__dirname, 'uploads')))

const storage = multer.diskStorage({
  destination: join(__dirname, 'uploads'),
  filename: (req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`)
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

// Haversine formula (km)
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ── FARMS ──
app.get('/api/farms', (req, res) => res.json(db.prepare('SELECT * FROM farms ORDER BY name').all()))

app.get('/api/farms/map', (req, res) => {
  const farms = db.prepare(`
    SELECT f.*, r.risk_level, r.detection_count, r.blight_type as region_blight,
      COUNT(p.id) as product_count
    FROM farms f
    LEFT JOIN region_disease_risk r ON r.region = f.region
    LEFT JOIN products p ON p.farm_id = f.id AND p.status = 'approved' AND p.quarantined = 0
    GROUP BY f.id ORDER BY f.name
  `).all()
  res.json(farms)
})

app.post('/api/farms', (req, res) => {
  const { name, region, lat, lng, owner_email, owner_phone, disease_safe } = req.body
  const id = randomUUID()
  db.prepare(`INSERT INTO farms (id, name, region, lat, lng, owner_email, owner_phone, disease_safe) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, name, region, lat||0, lng||0, owner_email||null, owner_phone||null, disease_safe?1:0)
  res.status(201).json(db.prepare('SELECT * FROM farms WHERE id = ?').get(id))
})

// ── PRODUCTS ──
app.get('/api/products', (req, res) => {
  const { search, category, region, disease_safe, certified, sort = 'newest', status = 'approved', buyer_lat, buyer_lng } = req.query

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
    query += ` AND p.id IN (${ids.map(()=>'?').join(',')})`
    params.push(...ids)
  }
  if (category) { query += ' AND p.category = ?'; params.push(category) }
  if (region) { query += ' AND f.region = ?'; params.push(region) }
  if (disease_safe === 'true') query += ' AND f.disease_safe = 1'
  if (certified === 'true') query += ' AND f.certified_clean = 1'

  if (sort === 'price_asc') query += ' ORDER BY p.price ASC'
  else if (sort === 'price_desc') query += ' ORDER BY p.price DESC'
  else if (sort === 'rating') query += ' ORDER BY product_rating DESC'
  else query += ' ORDER BY p.created_at DESC'

  let products = db.prepare(query).all(...params)

  if (buyer_lat && buyer_lng) {
    const blat = parseFloat(buyer_lat), blng = parseFloat(buyer_lng)
    products = products.map(p => ({
      ...p,
      distance_km: Math.round(haversine(blat, blng, p.farm_lat, p.farm_lng))
    }))
    if (sort === 'proximity') products.sort((a, b) => a.distance_km - b.distance_km)
  }

  res.json(products)
})

app.get('/api/products/:id', (req, res) => {
  db.prepare(`UPDATE products SET views = views + 1 WHERE id = ?`).run(req.params.id)
  const product = db.prepare(`
    SELECT p.*, f.name as farm_name, f.region, f.disease_safe, f.certified_clean, f.rating, f.lat as farm_lat, f.lng as farm_lng,
      r.risk_level as region_risk, r.blight_type as region_blight
    FROM products p JOIN farms f ON p.farm_id = f.id
    LEFT JOIN region_disease_risk r ON r.region = f.region WHERE p.id = ?
  `).get(req.params.id)
  if (!product) return res.status(404).json({ error: 'Not found' })
  res.json(product)
})

app.post('/api/products', upload.single('image'), (req, res) => {
  const { name, category, price, quantity, farm_id, disease_risk_tag, disease_type } = req.body
  if (!name || !category || !price || !quantity || !farm_id || !disease_risk_tag) return res.status(400).json({ error: 'All fields required' })
  const id = randomUUID()
  const image_url = req.file ? `/uploads/${req.file.filename}` : null
  db.prepare(`INSERT INTO products (id, name, category, price, quantity, farm_id, disease_risk_tag, disease_type, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`).run(id, name, category, parseFloat(price), parseInt(quantity), farm_id, disease_risk_tag, disease_type||'none', image_url)
  const farm = db.prepare('SELECT name FROM farms WHERE id = ?').get(farm_id)
  db.prepare(`INSERT INTO products_fts (product_id, name, farm_name) VALUES (?, ?, ?)`).run(id, name, farm?.name||'')
  res.status(201).json(db.prepare(`SELECT p.*, f.name as farm_name, f.region, f.disease_safe, f.certified_clean, f.rating FROM products p JOIN farms f ON p.farm_id=f.id WHERE p.id=?`).get(id))
})

app.put('/api/products/:id', upload.single('image'), (req, res) => {
  const { name, category, price, quantity, farm_id, disease_risk_tag, disease_type } = req.body
  const ex = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!ex) return res.status(404).json({ error: 'Not found' })
  const image_url = req.file ? `/uploads/${req.file.filename}` : ex.image_url
  db.prepare(`UPDATE products SET name=?,category=?,price=?,quantity=?,farm_id=?,disease_risk_tag=?,disease_type=?,image_url=?,status='pending' WHERE id=?`).run(
    name||ex.name, category||ex.category, parseFloat(price)||ex.price, parseInt(quantity)||ex.quantity,
    farm_id||ex.farm_id, disease_risk_tag||ex.disease_risk_tag, disease_type||ex.disease_type||'none', image_url, req.params.id)
  db.prepare(`UPDATE products_fts SET name=? WHERE product_id=?`).run(name||ex.name, req.params.id)
  res.json(db.prepare(`SELECT p.*, f.name as farm_name, f.region, f.disease_safe, f.certified_clean, f.rating FROM products p JOIN farms f ON p.farm_id=f.id WHERE p.id=?`).get(req.params.id))
})

app.patch('/api/products/:id/archive', (req, res) => {
  db.prepare(`UPDATE products SET status='archived' WHERE id=?`).run(req.params.id); res.json({ success: true })
})
app.patch('/api/products/:id/approve', (req, res) => {
  db.prepare(`UPDATE products SET status='approved' WHERE id=?`).run(req.params.id)
  res.json(db.prepare(`SELECT p.*, f.name as farm_name, f.region FROM products p JOIN farms f ON p.farm_id=f.id WHERE p.id=?`).get(req.params.id))
})
app.patch('/api/products/:id/reject', (req, res) => {
  db.prepare(`UPDATE products SET status='archived' WHERE id=?`).run(req.params.id); res.json({ success: true })
})
app.patch('/api/products/:id/quarantine', (req, res) => {
  db.prepare(`UPDATE products SET quarantined=1 WHERE id=?`).run(req.params.id); res.json({ success: true })
})
app.patch('/api/products/:id/unquarantine', (req, res) => {
  db.prepare(`UPDATE products SET quarantined=0 WHERE id=?`).run(req.params.id); res.json({ success: true })
})

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
  db.prepare(`INSERT INTO reviews (id, product_id, farm_id, rating, comment, buyer_name) VALUES (?, ?, ?, ?, ?, ?)`).run(id, product_id, product.farm_id, parseInt(rating), comment||null, buyer_name)
  const avg = db.prepare(`SELECT AVG(rating) as avg FROM reviews WHERE product_id=? AND approved=1`).get(product_id)
  const cnt = db.prepare(`SELECT COUNT(*) as cnt FROM reviews WHERE farm_id=? AND approved=1`).get(product.farm_id)
  const farmAvg = db.prepare(`SELECT AVG(rating) as avg FROM reviews WHERE farm_id=? AND approved=1`).get(product.farm_id)
  db.prepare(`UPDATE farms SET rating=?, rating_count=? WHERE id=?`).run(Math.round(farmAvg.avg*10)/10, cnt.cnt, product.farm_id)
  res.status(201).json(db.prepare('SELECT * FROM reviews WHERE id=?').get(id))
})

app.patch('/api/reviews/:id/approve', (req, res) => {
  db.prepare(`UPDATE reviews SET approved=1 WHERE id=?`).run(req.params.id); res.json({ success: true })
})
app.patch('/api/reviews/:id/reject', (req, res) => {
  db.prepare(`UPDATE reviews SET approved=0 WHERE id=?`).run(req.params.id); res.json({ success: true })
})
app.delete('/api/reviews/:id', (req, res) => {
  db.prepare(`DELETE FROM reviews WHERE id=?`).run(req.params.id); res.json({ success: true })
})

// ── CERTIFICATIONS ──
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
  db.prepare(`UPDATE farms SET certified_clean=1, disease_safe=1 WHERE id=?`).run(req.params.id)
  db.prepare(`INSERT INTO certifications (id, farm_id, status, reason, blight_type) VALUES (?, ?, 'certified', ?, 'none')`).run(randomUUID(), req.params.id, reason||'AI scan passed — no Early or Late Blight detected')
  res.json({ success: true })
})

app.post('/api/farms/:id/revoke', (req, res) => {
  const { reason, blight_type } = req.body
  db.prepare(`UPDATE farms SET certified_clean=0, disease_safe=0 WHERE id=?`).run(req.params.id)
  db.prepare(`INSERT INTO certifications (id, farm_id, status, reason, blight_type) VALUES (?, ?, 'revoked', ?, ?)`).run(randomUUID(), req.params.id, reason||'Disease detected', blight_type||'early_blight')
  res.json({ success: true })
})

// ── DISEASE REGIONS ──
app.get('/api/regions/disease-risk', (req, res) => res.json(db.prepare('SELECT * FROM region_disease_risk ORDER BY region').all()))

app.put('/api/regions/disease-risk/:region', (req, res) => {
  const { risk_level, detection_count, blight_type } = req.body
  db.prepare(`INSERT INTO region_disease_risk (region, risk_level, detection_count, blight_type, updated_at) VALUES (?,?,?,?,datetime('now'))
    ON CONFLICT(region) DO UPDATE SET risk_level=excluded.risk_level, detection_count=excluded.detection_count, blight_type=excluded.blight_type, updated_at=excluded.updated_at`
  ).run(req.params.region, risk_level, detection_count||0, blight_type||'none')

  if (risk_level === 'outbreak' || risk_level === 'watch') {
    const blightLabel = blight_type === 'late_blight' ? 'Late Blight' : 'Early Blight'
    const msg = risk_level === 'outbreak'
      ? `${blightLabel} outbreak in ${req.params.region} — ${detection_count} potato farms affected. Listings quarantined pending inspection.`
      : `${blightLabel} activity elevated in ${req.params.region} (${detection_count} detections). Sellers advised to inspect crops.`
    db.prepare(`INSERT INTO disease_alerts (id, region, message, severity, blight_type, simulated_email, simulated_sms) VALUES (?,?,?,?,?,1,1)`)
      .run(randomUUID(), req.params.region, msg, risk_level, blight_type||'early_blight')
    if (risk_level === 'outbreak') {
      db.prepare(`SELECT id FROM farms WHERE region=?`).all(req.params.region)
        .forEach(f => db.prepare(`UPDATE products SET quarantined=1 WHERE farm_id=? AND status='approved'`).run(f.id))
    }
  }
  res.json({ success: true })
})

// ── ALERTS ──
app.get('/api/alerts', (req, res) => res.json(db.prepare('SELECT * FROM disease_alerts ORDER BY created_at DESC').all()))

// ── ANALYTICS ──
app.get('/api/seller/analytics', (req, res) => {
  const { farm_id } = req.query
  let where = farm_id ? 'WHERE s.farm_id=?' : 'WHERE 1=1'
  const params = farm_id ? [farm_id] : []

  const totalRevenue = db.prepare(`SELECT COALESCE(SUM(revenue),0) as total FROM sales s ${where}`).get(...params)
  const totalSales = db.prepare(`SELECT COALESCE(SUM(quantity),0) as total FROM sales s ${where}`).get(...params)
  const totalViews = farm_id
    ? db.prepare(`SELECT COALESCE(SUM(views),0) as total FROM products WHERE farm_id=?`).get(farm_id)
    : db.prepare(`SELECT COALESCE(SUM(views),0) as total FROM products`).get()

  const byProduct = db.prepare(`
    SELECT p.name, p.id, SUM(s.revenue) as revenue, SUM(s.quantity) as units, COUNT(s.id) as orders
    FROM sales s JOIN products p ON p.id=s.product_id
    ${where} GROUP BY s.product_id ORDER BY revenue DESC LIMIT 5
  `).all(...params)

  const byMonth = db.prepare(`
    SELECT strftime('%Y-%m', s.created_at) as month, SUM(s.revenue) as revenue, SUM(s.quantity) as units
    FROM sales s ${where} GROUP BY month ORDER BY month
  `).all(...params)

  const byRegion = db.prepare(`
    SELECT s.buyer_region, SUM(s.revenue) as revenue, SUM(s.quantity) as units
    FROM sales s ${where} GROUP BY s.buyer_region ORDER BY revenue DESC
  `).all(...params)

  const alertImpact = db.prepare(`
    SELECT a.created_at as alert_date, a.region, a.blight_type, a.severity
    FROM disease_alerts a ORDER BY a.created_at
  `).all()

  res.json({ totalRevenue: totalRevenue.total, totalSales: totalSales.total, totalViews: totalViews.total, byProduct, byMonth, byRegion, alertImpact })
})

// ── DELIVERY ESTIMATE ──
app.get('/api/delivery-estimate', (req, res) => {
  const { farm_id, buyer_lat, buyer_lng } = req.query
  if (!farm_id || !buyer_lat || !buyer_lng) return res.status(400).json({ error: 'farm_id, buyer_lat, buyer_lng required' })
  const farm = db.prepare('SELECT lat, lng FROM farms WHERE id=?').get(farm_id)
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
  const byCategory = db.prepare(`SELECT category, COUNT(*) as count FROM products WHERE status='approved' GROUP BY category`).all()
  const outbreaks = db.prepare(`SELECT COUNT(*) as count FROM region_disease_risk WHERE risk_level='outbreak'`).get()
  res.json({ total: total.count, pending: pending.count, archived: archived.count, quarantined: quarantined.count, certified: certified.count, byCategory, outbreaks: outbreaks.count })
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../client/dist')))
  app.get('*', (req, res) => res.sendFile(join(__dirname, '../client/dist/index.html')))
}

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`))
