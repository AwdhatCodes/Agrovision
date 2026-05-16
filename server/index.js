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
  filename: (req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname)}`)
  }
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

app.get('/api/farms', (req, res) => {
  const farms = db.prepare('SELECT * FROM farms ORDER BY name').all()
  res.json(farms)
})

app.get('/api/farms/map', (req, res) => {
  const farms = db.prepare(`
    SELECT f.*, r.risk_level, r.detection_count,
      COUNT(p.id) as product_count
    FROM farms f
    LEFT JOIN region_disease_risk r ON r.region = f.region
    LEFT JOIN products p ON p.farm_id = f.id AND p.status = 'approved' AND p.quarantined = 0
    GROUP BY f.id
    ORDER BY f.name
  `).all()
  res.json(farms)
})

app.post('/api/farms', (req, res) => {
  const { name, region, lat, lng, owner_email, owner_phone, disease_safe } = req.body
  const id = randomUUID()
  db.prepare(`INSERT INTO farms (id, name, region, lat, lng, owner_email, owner_phone, disease_safe) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, name, region, lat || 0, lng || 0, owner_email || null, owner_phone || null, disease_safe ? 1 : 0)
  res.status(201).json(db.prepare('SELECT * FROM farms WHERE id = ?').get(id))
})

app.get('/api/products', (req, res) => {
  const { search, category, region, disease_safe, sort = 'newest', status = 'approved' } = req.query

  let query = `
    SELECT p.*, f.name as farm_name, f.region, f.disease_safe, f.rating, r.risk_level as region_risk
    FROM products p
    JOIN farms f ON p.farm_id = f.id
    LEFT JOIN region_disease_risk r ON r.region = f.region
    WHERE p.status = ?
  `
  const params = [status]

  if (search) {
    const ftsIds = db.prepare(`SELECT product_id FROM products_fts WHERE products_fts MATCH ?`).all(`${search}*`).map(r => r.product_id)
    if (ftsIds.length === 0) return res.json([])
    query += ` AND p.id IN (${ftsIds.map(() => '?').join(',')})`
    params.push(...ftsIds)
  }

  if (category) { query += ' AND p.category = ?'; params.push(category) }
  if (region) { query += ' AND f.region = ?'; params.push(region) }
  if (disease_safe === 'true') query += ' AND f.disease_safe = 1'

  if (sort === 'price_asc') query += ' ORDER BY p.price ASC'
  else if (sort === 'price_desc') query += ' ORDER BY p.price DESC'
  else if (sort === 'rating') query += ' ORDER BY f.rating DESC'
  else query += ' ORDER BY p.created_at DESC'

  res.json(db.prepare(query).all(...params))
})

app.get('/api/products/:id', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, f.name as farm_name, f.region, f.disease_safe, f.rating, r.risk_level as region_risk
    FROM products p JOIN farms f ON p.farm_id = f.id
    LEFT JOIN region_disease_risk r ON r.region = f.region
    WHERE p.id = ?
  `).get(req.params.id)
  if (!product) return res.status(404).json({ error: 'Not found' })
  res.json(product)
})

app.post('/api/products', upload.single('image'), (req, res) => {
  const { name, category, price, quantity, farm_id, disease_risk_tag } = req.body
  if (!name || !category || !price || !quantity || !farm_id || !disease_risk_tag)
    return res.status(400).json({ error: 'All fields are required' })
  const id = randomUUID()
  const image_url = req.file ? `/uploads/${req.file.filename}` : null
  db.prepare(`INSERT INTO products (id, name, category, price, quantity, farm_id, disease_risk_tag, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`).run(id, name, category, parseFloat(price), parseInt(quantity), farm_id, disease_risk_tag, image_url)
  const farm = db.prepare('SELECT name FROM farms WHERE id = ?').get(farm_id)
  db.prepare(`INSERT INTO products_fts (product_id, name, farm_name) VALUES (?, ?, ?)`).run(id, name, farm?.name || '')
  res.status(201).json(db.prepare(`SELECT p.*, f.name as farm_name, f.region, f.disease_safe, f.rating FROM products p JOIN farms f ON p.farm_id = f.id WHERE p.id = ?`).get(id))
})

app.put('/api/products/:id', upload.single('image'), (req, res) => {
  const { name, category, price, quantity, farm_id, disease_risk_tag } = req.body
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const image_url = req.file ? `/uploads/${req.file.filename}` : existing.image_url
  db.prepare(`UPDATE products SET name=?, category=?, price=?, quantity=?, farm_id=?, disease_risk_tag=?, image_url=?, status='pending' WHERE id=?`).run(
    name || existing.name, category || existing.category, parseFloat(price) || existing.price,
    parseInt(quantity) || existing.quantity, farm_id || existing.farm_id,
    disease_risk_tag || existing.disease_risk_tag, image_url, req.params.id)
  db.prepare(`UPDATE products_fts SET name=? WHERE product_id=?`).run(name || existing.name, req.params.id)
  res.json(db.prepare(`SELECT p.*, f.name as farm_name, f.region, f.disease_safe, f.rating FROM products p JOIN farms f ON p.farm_id = f.id WHERE p.id = ?`).get(req.params.id))
})

app.patch('/api/products/:id/archive', (req, res) => {
  if (!db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  db.prepare(`UPDATE products SET status='archived' WHERE id=?`).run(req.params.id)
  res.json({ success: true })
})

app.patch('/api/products/:id/approve', (req, res) => {
  if (!db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Not found' })
  db.prepare(`UPDATE products SET status='approved' WHERE id=?`).run(req.params.id)
  res.json(db.prepare(`SELECT p.*, f.name as farm_name, f.region, f.disease_safe, f.rating FROM products p JOIN farms f ON p.farm_id = f.id WHERE p.id = ?`).get(req.params.id))
})

app.patch('/api/products/:id/reject', (req, res) => {
  db.prepare(`UPDATE products SET status='archived' WHERE id=?`).run(req.params.id)
  res.json({ success: true })
})

app.patch('/api/products/:id/quarantine', (req, res) => {
  db.prepare(`UPDATE products SET quarantined=1 WHERE id=?`).run(req.params.id)
  res.json({ success: true })
})

app.patch('/api/products/:id/unquarantine', (req, res) => {
  db.prepare(`UPDATE products SET quarantined=0 WHERE id=?`).run(req.params.id)
  res.json({ success: true })
})

app.get('/api/regions/disease-risk', (req, res) => {
  res.json(db.prepare('SELECT * FROM region_disease_risk ORDER BY region').all())
})

app.put('/api/regions/disease-risk/:region', (req, res) => {
  const { risk_level, detection_count } = req.body
  db.prepare(`INSERT INTO region_disease_risk (region, risk_level, detection_count, updated_at) VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(region) DO UPDATE SET risk_level=excluded.risk_level, detection_count=excluded.detection_count, updated_at=excluded.updated_at`
  ).run(req.params.region, risk_level, detection_count || 0)

  if (risk_level === 'outbreak' || risk_level === 'watch') {
    const alertId = randomUUID()
    const msg = risk_level === 'outbreak'
      ? `Disease outbreak detected in ${req.params.region} — ${detection_count} cases reported. Products from affected farms flagged.`
      : `Disease activity elevated in ${req.params.region}. ${detection_count} detections recorded.`
    db.prepare(`INSERT INTO disease_alerts (id, region, message, severity, simulated_email, simulated_sms) VALUES (?, ?, ?, ?, 1, 1)`)
      .run(alertId, req.params.region, msg, risk_level)
    const affectedFarms = db.prepare('SELECT id FROM farms WHERE region = ?').all(req.params.region)
    affectedFarms.forEach(f => {
      if (risk_level === 'outbreak') db.prepare(`UPDATE products SET quarantined=1 WHERE farm_id=? AND status='approved'`).run(f.id)
    })
  }

  res.json({ success: true, region: req.params.region, risk_level })
})

app.get('/api/alerts', (req, res) => {
  res.json(db.prepare('SELECT * FROM disease_alerts ORDER BY created_at DESC').all())
})

app.get('/api/stats', (req, res) => {
  const total = db.prepare(`SELECT COUNT(*) as count FROM products WHERE status='approved'`).get()
  const pending = db.prepare(`SELECT COUNT(*) as count FROM products WHERE status='pending'`).get()
  const archived = db.prepare(`SELECT COUNT(*) as count FROM products WHERE status='archived'`).get()
  const quarantined = db.prepare(`SELECT COUNT(*) as count FROM products WHERE quarantined=1`).get()
  const byCategory = db.prepare(`SELECT category, COUNT(*) as count FROM products WHERE status='approved' GROUP BY category`).all()
  const outbreaks = db.prepare(`SELECT COUNT(*) as count FROM region_disease_risk WHERE risk_level='outbreak'`).get()
  res.json({ total: total.count, pending: pending.count, archived: archived.count, quarantined: quarantined.count, byCategory, outbreaks: outbreaks.count })
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../client/dist')))
  app.get('*', (req, res) => res.sendFile(join(__dirname, '../client/dist/index.html')))
}

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`))
