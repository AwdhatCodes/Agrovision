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

app.get('/api/products', (req, res) => {
  const { search, category, region, disease_safe, sort = 'newest', status = 'approved' } = req.query

  let query = `
    SELECT p.*, f.name as farm_name, f.region, f.disease_safe, f.rating
    FROM products p
    JOIN farms f ON p.farm_id = f.id
    WHERE p.status = ?
  `
  const params = [status]

  if (search) {
    const ftsIds = db.prepare(`
      SELECT product_id FROM products_fts WHERE products_fts MATCH ?
    `).all(`${search}*`).map(r => r.product_id)

    if (ftsIds.length === 0) {
      return res.json([])
    }
    query += ` AND p.id IN (${ftsIds.map(() => '?').join(',')})`
    params.push(...ftsIds)
  }

  if (category) {
    query += ' AND p.category = ?'
    params.push(category)
  }

  if (region) {
    query += ' AND f.region = ?'
    params.push(region)
  }

  if (disease_safe === 'true') {
    query += ' AND f.disease_safe = 1'
  }

  if (sort === 'price_asc') query += ' ORDER BY p.price ASC'
  else if (sort === 'price_desc') query += ' ORDER BY p.price DESC'
  else if (sort === 'rating') query += ' ORDER BY f.rating DESC'
  else query += ' ORDER BY p.created_at DESC'

  const products = db.prepare(query).all(...params)
  res.json(products)
})

app.get('/api/products/:id', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, f.name as farm_name, f.region, f.disease_safe, f.rating
    FROM products p JOIN farms f ON p.farm_id = f.id
    WHERE p.id = ?
  `).get(req.params.id)
  if (!product) return res.status(404).json({ error: 'Not found' })
  res.json(product)
})

app.post('/api/products', upload.single('image'), (req, res) => {
  const { name, category, price, quantity, farm_id, disease_risk_tag } = req.body
  if (!name || !category || !price || !quantity || !farm_id || !disease_risk_tag) {
    return res.status(400).json({ error: 'All fields are required' })
  }
  const id = randomUUID()
  const image_url = req.file ? `/uploads/${req.file.filename}` : null

  db.prepare(`
    INSERT INTO products (id, name, category, price, quantity, farm_id, disease_risk_tag, image_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(id, name, category, parseFloat(price), parseInt(quantity), farm_id, disease_risk_tag, image_url)

  const farm = db.prepare('SELECT name FROM farms WHERE id = ?').get(farm_id)
  db.prepare(`INSERT INTO products_fts (product_id, name, farm_name) VALUES (?, ?, ?)`).run(id, name, farm?.name || '')

  const product = db.prepare(`
    SELECT p.*, f.name as farm_name, f.region, f.disease_safe, f.rating
    FROM products p JOIN farms f ON p.farm_id = f.id WHERE p.id = ?
  `).get(id)
  res.status(201).json(product)
})

app.put('/api/products/:id', upload.single('image'), (req, res) => {
  const { name, category, price, quantity, farm_id, disease_risk_tag } = req.body
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })

  const image_url = req.file ? `/uploads/${req.file.filename}` : existing.image_url

  db.prepare(`
    UPDATE products SET name=?, category=?, price=?, quantity=?, farm_id=?, disease_risk_tag=?, image_url=?, status='pending'
    WHERE id=?
  `).run(name || existing.name, category || existing.category, parseFloat(price) || existing.price,
    parseInt(quantity) || existing.quantity, farm_id || existing.farm_id,
    disease_risk_tag || existing.disease_risk_tag, image_url, req.params.id)

  db.prepare(`UPDATE products_fts SET name=? WHERE product_id=?`).run(name || existing.name, req.params.id)

  const product = db.prepare(`
    SELECT p.*, f.name as farm_name, f.region, f.disease_safe, f.rating
    FROM products p JOIN farms f ON p.farm_id = f.id WHERE p.id = ?
  `).get(req.params.id)
  res.json(product)
})

app.patch('/api/products/:id/archive', (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  db.prepare(`UPDATE products SET status='archived' WHERE id=?`).run(req.params.id)
  res.json({ success: true })
})

app.patch('/api/products/:id/approve', (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  db.prepare(`UPDATE products SET status='approved' WHERE id=?`).run(req.params.id)
  const product = db.prepare(`
    SELECT p.*, f.name as farm_name, f.region, f.disease_safe, f.rating
    FROM products p JOIN farms f ON p.farm_id = f.id WHERE p.id = ?
  `).get(req.params.id)
  res.json(product)
})

app.patch('/api/products/:id/reject', (req, res) => {
  db.prepare(`UPDATE products SET status='archived' WHERE id=?`).run(req.params.id)
  res.json({ success: true })
})

app.get('/api/stats', (req, res) => {
  const total = db.prepare(`SELECT COUNT(*) as count FROM products WHERE status='approved'`).get()
  const pending = db.prepare(`SELECT COUNT(*) as count FROM products WHERE status='pending'`).get()
  const archived = db.prepare(`SELECT COUNT(*) as count FROM products WHERE status='archived'`).get()
  const byCategory = db.prepare(`SELECT category, COUNT(*) as count FROM products WHERE status='approved' GROUP BY category`).all()
  res.json({ total: total.count, pending: pending.count, archived: archived.count, byCategory })
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../client/dist')))
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../client/dist/index.html'))
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})
