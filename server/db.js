import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, 'marketplace.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'buyer' CHECK(role IN ('buyer', 'farmer', 'admin')),
    avatar_color TEXT DEFAULT '#4ade80',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS farms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    disease_safe INTEGER DEFAULT 0,
    certified_clean INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    lat REAL DEFAULT 0,
    lng REAL DEFAULT 0,
    owner_email TEXT,
    owner_phone TEXT,
    user_id TEXT,
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
    disease_type TEXT DEFAULT 'none',
    image_url TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'archived')),
    quarantined INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
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
    blight_type TEXT DEFAULT 'none',
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS disease_alerts (
    id TEXT PRIMARY KEY,
    region TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'watch' CHECK(severity IN ('watch', 'outbreak')),
    blight_type TEXT DEFAULT 'early_blight',
    simulated_email INTEGER DEFAULT 0,
    simulated_sms INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    farm_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    buyer_name TEXT NOT NULL,
    approved INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (farm_id) REFERENCES farms(id)
  );

  CREATE TABLE IF NOT EXISTS certifications (
    id TEXT PRIMARY KEY,
    farm_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('certified', 'revoked')),
    reason TEXT,
    blight_type TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (farm_id) REFERENCES farms(id)
  );

  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    farm_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    revenue REAL NOT NULL,
    buyer_region TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (farm_id) REFERENCES farms(id)
  );

  CREATE TABLE IF NOT EXISTS disease_scans (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    farm_id TEXT,
    image_url TEXT,
    disease_result TEXT NOT NULL,
    confidence REAL NOT NULL,
    severity TEXT NOT NULL,
    affected_area_pct REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`)

const addCol = (table, col, def) => {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name)
  if (!cols.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`)
}
addCol('farms', 'lat', 'REAL DEFAULT 0')
addCol('farms', 'lng', 'REAL DEFAULT 0')
addCol('farms', 'owner_email', 'TEXT')
addCol('farms', 'owner_phone', 'TEXT')
addCol('farms', 'certified_clean', 'INTEGER DEFAULT 0')
addCol('farms', 'user_id', 'TEXT')
addCol('products', 'quarantined', 'INTEGER DEFAULT 0')
addCol('products', 'disease_type', 'TEXT DEFAULT "none"')
addCol('products', 'views', 'INTEGER DEFAULT 0')
addCol('region_disease_risk', 'blight_type', 'TEXT DEFAULT "none"')
addCol('disease_alerts', 'blight_type', 'TEXT DEFAULT "early_blight"')

const seedData = db.transaction(() => {
  const insertFarm = db.prepare(`INSERT OR IGNORE INTO farms (id, name, region, disease_safe, certified_clean, rating, rating_count, lat, lng, owner_email, owner_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const farms = [
    ['farm-1', 'Green Valley Potato Farm', 'Northern Region', 1, 1, 4.8, 120, 11.8, 8.5, 'seller@greenvalley.farm', '+234-801-000-001'],
    ['farm-2', 'Sunrise Agricultural', 'Southern Region', 0, 0, 4.2, 85, 5.6, 7.2, 'info@sunriseag.farm', '+234-802-000-002'],
    ['farm-3', 'Heritage Potato Co.', 'Eastern Region', 1, 1, 4.9, 210, 6.8, 11.4, 'contact@heritageseeds.farm', '+234-803-000-003'],
    ['farm-4', 'Golden Fields Farm', 'Western Region', 0, 0, 3.9, 44, 7.4, 3.9, 'admin@goldenfields.farm', '+234-804-000-004'],
  ]
  farms.forEach(f => insertFarm.run(...f))
  db.prepare(`UPDATE farms SET lat=11.8, lng=8.5, certified_clean=1 WHERE id='farm-1'`).run()
  db.prepare(`UPDATE farms SET lat=5.6, lng=7.2, certified_clean=0 WHERE id='farm-2'`).run()
  db.prepare(`UPDATE farms SET lat=6.8, lng=11.4, certified_clean=1 WHERE id='farm-3'`).run()
  db.prepare(`UPDATE farms SET lat=7.4, lng=3.9, certified_clean=0 WHERE id='farm-4'`).run()

  const insertProduct = db.prepare(`INSERT OR IGNORE INTO products (id, name, category, price, quantity, farm_id, disease_risk_tag, disease_type, image_url, status, views) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const insertFts = db.prepare(`INSERT OR IGNORE INTO products_fts (product_id, name, farm_name) VALUES (?, ?, ?)`)
  const products = [
    ['prod-1', 'Certified Potato Seed (1kg)', 'seed', 12.50, 500, 'farm-1', 'low', 'none', null, 'approved', 340],
    ['prod-2', 'NPK Potato Fertiliser 20kg', 'fertiliser', 45.00, 200, 'farm-2', 'low', 'none', null, 'approved', 210],
    ['prod-3', 'Fresh Potatoes (5kg)', 'produce', 8.75, 150, 'farm-3', 'low', 'none', null, 'approved', 520],
    ['prod-4', 'Highland Potato Seeds 500g', 'seed', 6.00, 800, 'farm-3', 'low', 'none', null, 'approved', 180],
    ['prod-5', 'Blight-Control Fertiliser 10kg', 'fertiliser', 22.00, 300, 'farm-1', 'low', 'none', null, 'approved', 145],
    ['prod-6', 'Early Blight Resistant Seeds', 'seed', 9.50, 90, 'farm-4', 'medium', 'early_blight', null, 'approved', 62],
    ['prod-7', 'Potato Fungicide Spray 2L', 'fertiliser', 18.00, 400, 'farm-2', 'medium', 'late_blight', null, 'pending', 0],
  ]
  products.forEach(([id, name, cat, price, qty, fid, risk, dtype, img, status, views]) => {
    insertProduct.run(id, name, cat, price, qty, fid, risk, dtype, img, status, views)
    const farm = farms.find(f => f[0] === fid)
    insertFts.run(id, name, farm ? farm[1] : '')
  })

  const upsertRegion = db.prepare(`INSERT INTO region_disease_risk (region, risk_level, detection_count, blight_type) VALUES (?, ?, ?, ?)
    ON CONFLICT(region) DO UPDATE SET risk_level=excluded.risk_level, detection_count=excluded.detection_count, blight_type=excluded.blight_type`)
  upsertRegion.run('Northern Region', 'safe', 2, 'none')
  upsertRegion.run('Southern Region', 'watch', 8, 'late_blight')
  upsertRegion.run('Eastern Region', 'safe', 1, 'none')
  upsertRegion.run('Western Region', 'outbreak', 19, 'early_blight')

  const insertAlert = db.prepare(`INSERT OR IGNORE INTO disease_alerts (id, region, message, severity, blight_type, simulated_email, simulated_sms) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  insertAlert.run('alert-1', 'Western Region', 'Early Blight outbreak in Western Region — 19 potato farms affected. Listings quarantined pending inspection.', 'outbreak', 'early_blight', 1, 1)
  insertAlert.run('alert-2', 'Southern Region', 'Late Blight activity elevated in Southern Region (8 detections). Sellers advised to inspect crops before listing.', 'watch', 'late_blight', 1, 0)

  const insertCert = db.prepare(`INSERT OR IGNORE INTO certifications (id, farm_id, status, reason, blight_type) VALUES (?, ?, ?, ?, ?)`)
  insertCert.run('cert-1', 'farm-1', 'certified', 'AI scan passed — no Early or Late Blight detected', 'none')
  insertCert.run('cert-2', 'farm-3', 'certified', 'AI scan passed — no Early or Late Blight detected', 'none')
  insertCert.run('cert-3', 'farm-4', 'revoked', 'Early Blight detected by AI diagnosis module', 'early_blight')

  const insertReview = db.prepare(`INSERT OR IGNORE INTO reviews (id, product_id, farm_id, rating, comment, buyer_name, approved) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  insertReview.run('rev-1', 'prod-1', 'farm-1', 5, 'Excellent certified seeds, germination rate was outstanding. Disease-free as advertised!', 'Emeka O.', 1)
  insertReview.run('rev-2', 'prod-1', 'farm-1', 4, 'Good quality potato seeds, delivered in 3 days from Northern Region.', 'Aisha M.', 1)
  insertReview.run('rev-3', 'prod-3', 'farm-3', 5, 'Fresh potatoes, great weight and no blight signs. Will reorder.', 'Chidi N.', 1)
  insertReview.run('rev-4', 'prod-3', 'farm-3', 4, 'Quality produce from Heritage Potato Co. Arrived well-packed.', 'Fatima B.', 1)
  insertReview.run('rev-5', 'prod-2', 'farm-2', 3, 'Fertiliser works but delivery took longer than expected.', 'Taiwo A.', 1)
  insertReview.run('rev-6', 'prod-5', 'farm-1', 5, 'Best blight-control fertiliser on the market. Saved my entire crop!', 'Bayo K.', 1)

  const insertSale = db.prepare(`INSERT OR IGNORE INTO sales (id, product_id, farm_id, quantity, revenue, buyer_region, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  const salesData = [
    ['sale-1','prod-1','farm-1',20,250.00,'Southern Region','2026-01-10'],
    ['sale-2','prod-1','farm-1',35,437.50,'Eastern Region','2026-02-05'],
    ['sale-3','prod-1','farm-1',10,125.00,'Northern Region','2026-03-14'],
    ['sale-4','prod-1','farm-1', 5, 62.50,'Western Region','2026-04-20'],
    ['sale-5','prod-3','farm-3',30,262.50,'Southern Region','2026-01-15'],
    ['sale-6','prod-3','farm-3',25,218.75,'Northern Region','2026-02-22'],
    ['sale-7','prod-3','farm-3',40,350.00,'Eastern Region','2026-03-30'],
    ['sale-8','prod-5','farm-1',15,330.00,'Southern Region','2026-02-12'],
    ['sale-9','prod-5','farm-1',20,440.00,'Eastern Region','2026-04-01'],
    ['sale-10','prod-2','farm-2',10,450.00,'Northern Region','2026-01-28'],
    ['sale-11','prod-2','farm-2', 8,360.00,'Western Region','2026-03-08'],
    ['sale-12','prod-4','farm-3',50,300.00,'Southern Region','2026-04-15'],
  ]
  salesData.forEach(s => insertSale.run(...s))
})

seedData()

export default db
