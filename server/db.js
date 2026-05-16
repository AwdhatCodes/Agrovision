import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, 'marketplace.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS farms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    disease_safe INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('seed', 'fertiliser', 'produce')),
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    farm_id TEXT NOT NULL,
    disease_risk_tag TEXT NOT NULL CHECK(disease_risk_tag IN ('low', 'medium', 'high')),
    image_url TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'archived')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (farm_id) REFERENCES farms(id)
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
    product_id UNINDEXED,
    name,
    farm_name
  );
`)

const seedFarms = db.prepare(`INSERT OR IGNORE INTO farms (id, name, region, disease_safe, rating, rating_count) VALUES (?, ?, ?, ?, ?, ?)`)
const seedProduct = db.prepare(`INSERT OR IGNORE INTO products (id, name, category, price, quantity, farm_id, disease_risk_tag, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
const seedFts = db.prepare(`INSERT OR IGNORE INTO products_fts (product_id, name, farm_name) VALUES (?, ?, ?)`)

const seedData = db.transaction(() => {
  const farms = [
    ['farm-1', 'Green Valley Farms', 'Northern Region', 1, 4.8, 120],
    ['farm-2', 'Sunrise Agricultural', 'Southern Region', 0, 4.2, 85],
    ['farm-3', 'Heritage Seeds Co.', 'Eastern Region', 1, 4.9, 210],
    ['farm-4', 'Golden Fields Farm', 'Western Region', 0, 3.9, 44],
  ]
  farms.forEach(f => seedFarms.run(...f))

  const products = [
    ['prod-1', 'Organic Maize Seeds', 'seed', 12.50, 500, 'farm-1', 'low', null, 'approved'],
    ['prod-2', 'NPK Fertiliser 20kg', 'fertiliser', 45.00, 200, 'farm-2', 'low', null, 'approved'],
    ['prod-3', 'Heirloom Tomatoes (1kg)', 'produce', 8.75, 150, 'farm-3', 'low', null, 'approved'],
    ['prod-4', 'Sunflower Seeds 500g', 'seed', 6.00, 800, 'farm-3', 'low', null, 'approved'],
    ['prod-5', 'Compost Fertiliser 10kg', 'fertiliser', 22.00, 300, 'farm-1', 'low', null, 'approved'],
    ['prod-6', 'Sweet Pepper Pack', 'produce', 5.50, 90, 'farm-4', 'medium', null, 'approved'],
    ['prod-7', 'Wheat Seeds 1kg', 'seed', 9.00, 1000, 'farm-2', 'medium', null, 'pending'],
  ]
  products.forEach(p => {
    seedProduct.run(...p)
    const farm = farms.find(f => f[0] === p[4])
    seedFts.run(p[0], p[1], farm ? farm[1] : '')
  })
})

seedData()

export default db
