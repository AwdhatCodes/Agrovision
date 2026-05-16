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
    lat REAL DEFAULT 0,
    lng REAL DEFAULT 0,
    owner_email TEXT,
    owner_phone TEXT,
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
    quarantined INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (farm_id) REFERENCES farms(id)
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
    product_id UNINDEXED,
    name,
    farm_name
  );

  CREATE TABLE IF NOT EXISTS region_disease_risk (
    region TEXT PRIMARY KEY,
    risk_level TEXT DEFAULT 'safe' CHECK(risk_level IN ('safe', 'watch', 'outbreak')),
    detection_count INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS disease_alerts (
    id TEXT PRIMARY KEY,
    region TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'watch' CHECK(severity IN ('watch', 'outbreak')),
    simulated_email INTEGER DEFAULT 0,
    simulated_sms INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`)

const cols = db.prepare("PRAGMA table_info(farms)").all().map(c => c.name)
if (!cols.includes('lat')) db.exec(`ALTER TABLE farms ADD COLUMN lat REAL DEFAULT 0`)
if (!cols.includes('lng')) db.exec(`ALTER TABLE farms ADD COLUMN lng REAL DEFAULT 0`)
if (!cols.includes('owner_email')) db.exec(`ALTER TABLE farms ADD COLUMN owner_email TEXT`)
if (!cols.includes('owner_phone')) db.exec(`ALTER TABLE farms ADD COLUMN owner_phone TEXT`)

const prodCols = db.prepare("PRAGMA table_info(products)").all().map(c => c.name)
if (!prodCols.includes('quarantined')) db.exec(`ALTER TABLE products ADD COLUMN quarantined INTEGER DEFAULT 0`)

const seedFarms = db.prepare(`INSERT OR IGNORE INTO farms (id, name, region, disease_safe, rating, rating_count, lat, lng, owner_email, owner_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
const seedProduct = db.prepare(`INSERT OR IGNORE INTO products (id, name, category, price, quantity, farm_id, disease_risk_tag, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
const seedFts = db.prepare(`INSERT OR IGNORE INTO products_fts (product_id, name, farm_name) VALUES (?, ?, ?)`)
const seedRegion = db.prepare(`INSERT OR IGNORE INTO region_disease_risk (region, risk_level, detection_count) VALUES (?, ?, ?)`)
const seedAlert = db.prepare(`INSERT OR IGNORE INTO disease_alerts (id, region, message, severity, simulated_email, simulated_sms) VALUES (?, ?, ?, ?, ?, ?)`)

const seedData = db.transaction(() => {
  const farms = [
    ['farm-1', 'Green Valley Farms', 'Northern Region', 1, 4.8, 120, 11.8, 8.5, 'seller@greenvalley.farm', '+234-801-000-001'],
    ['farm-2', 'Sunrise Agricultural', 'Southern Region', 0, 4.2, 85, 5.6, 7.2, 'info@sunriseag.farm', '+234-802-000-002'],
    ['farm-3', 'Heritage Seeds Co.', 'Eastern Region', 1, 4.9, 210, 6.8, 11.4, 'contact@heritageseeds.farm', '+234-803-000-003'],
    ['farm-4', 'Golden Fields Farm', 'Western Region', 0, 3.9, 44, 7.4, 3.9, 'admin@goldenfields.farm', '+234-804-000-004'],
  ]
  farms.forEach(f => seedFarms.run(...f))

  db.prepare(`UPDATE farms SET lat=?, lng=?, owner_email=?, owner_phone=? WHERE id=?`).run(11.8, 8.5, 'seller@greenvalley.farm', '+234-801-000-001', 'farm-1')
  db.prepare(`UPDATE farms SET lat=?, lng=?, owner_email=?, owner_phone=? WHERE id=?`).run(5.6, 7.2, 'info@sunriseag.farm', '+234-802-000-002', 'farm-2')
  db.prepare(`UPDATE farms SET lat=?, lng=?, owner_email=?, owner_phone=? WHERE id=?`).run(6.8, 11.4, 'contact@heritageseeds.farm', '+234-803-000-003', 'farm-3')
  db.prepare(`UPDATE farms SET lat=?, lng=?, owner_email=?, owner_phone=? WHERE id=?`).run(7.4, 3.9, 'admin@goldenfields.farm', '+234-804-000-004', 'farm-4')

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

  const regions = [
    ['Northern Region', 'safe', 2],
    ['Southern Region', 'watch', 8],
    ['Eastern Region', 'safe', 1],
    ['Western Region', 'outbreak', 19],
  ]
  regions.forEach(r => seedRegion.run(...r))

  seedAlert.run('alert-1', 'Western Region', 'High disease detections in Western Region — 19 cases of blight reported. Products from affected farms flagged for review.', 'outbreak', 1, 1)
  seedAlert.run('alert-2', 'Southern Region', 'Disease activity elevated in Southern Region. Sellers advised to inspect crops before listing.', 'watch', 1, 0)
})

seedData()

export default db
