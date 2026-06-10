import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, 'store.db'))

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
    buyer_lat REAL,
    buyer_lng REAL,
    buyer_region TEXT,
    buyer_location TEXT,
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
    buyer_lat REAL,
    buyer_lng REAL,
    buyer_location TEXT,
    buyer_name TEXT,
    payment_method TEXT DEFAULT 'card',
    payment_reference TEXT,
    payment_status TEXT DEFAULT 'paid',
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
addCol('users', 'buyer_lat', 'REAL')
addCol('users', 'buyer_lng', 'REAL')
addCol('users', 'buyer_region', 'TEXT')
addCol('users', 'buyer_location', 'TEXT')
addCol('products', 'quarantined', 'INTEGER DEFAULT 0')
addCol('products', 'disease_type', 'TEXT DEFAULT "none"')
addCol('products', 'views', 'INTEGER DEFAULT 0')
addCol('products', 'description', 'TEXT DEFAULT ""')
addCol('region_disease_risk', 'blight_type', 'TEXT DEFAULT "none"')
addCol('disease_alerts', 'blight_type', 'TEXT DEFAULT "early_blight"')
addCol('sales', 'buyer_name', 'TEXT')
addCol('sales', 'buyer_lat', 'REAL')
addCol('sales', 'buyer_lng', 'REAL')
addCol('sales', 'buyer_location', 'TEXT')
addCol('sales', 'payment_method', 'TEXT DEFAULT "card"')
addCol('sales', 'payment_reference', 'TEXT')
addCol('sales', 'payment_status', 'TEXT DEFAULT "paid"')
addCol('disease_scans', 'heatmap', 'TEXT')

const seedData = db.transaction(() => {
  const insertFarm = db.prepare(`INSERT OR IGNORE INTO farms (id, name, region, disease_safe, certified_clean, rating, rating_count, lat, lng, owner_email, owner_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const farms = [
    ['farm-1', 'Kinangop Potato Farm', 'Nyandarua County', 1, 1, 4.8, 120, -0.65, 36.55, 'info@kinangopfarm.co.ke', '+254-722-100-001'],
    ['farm-2', 'Meru Highlands Agro', 'Meru County', 1, 1, 4.9, 210, 0.05, 37.65, 'sales@meruagro.co.ke', '+254-733-200-002'],
    ['farm-3', 'Rift Valley Seeds Ltd', 'Nakuru County', 0, 0, 4.2, 85, -0.30, 36.07, 'orders@riftvalleyseeds.co.ke', '+254-711-300-003'],
    ['farm-4', 'Eldoret Highland Farm', 'Uasin Gishu', 0, 0, 3.9, 44, 0.52, 35.27, 'farm@eldorethighland.co.ke', '+254-700-400-004'],
    ['farm-5', 'Timau Seed Centre', 'Meru County', 1, 1, 4.6, 97, 0.17, 37.26, 'timau@seedcentre.co.ke', '+254-720-500-005'],
    ['farm-6', 'Ol Joro Orok Cooperative', 'Nyandarua County', 0, 0, 4.0, 53, -0.02, 36.60, 'coop@oljoroorok.co.ke', '+254-714-600-006'],
  ]
  farms.forEach(f => insertFarm.run(...f))

  const insertProduct = db.prepare(`INSERT OR IGNORE INTO products (id, name, category, price, quantity, farm_id, disease_risk_tag, disease_type, image_url, status, views) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const insertFts = db.prepare(`INSERT OR IGNORE INTO products_fts (product_id, name, farm_name) VALUES (?, ?, ?)`)
  const products = [
    ['prod-1', 'Certified Kenya Mpya Seed (1kg)', 'seed', 350.00, 500, 'farm-1', 'low', 'none', null, 'approved', 340],
    ['prod-2', 'CAN Potato Fertiliser 50kg', 'fertiliser', 3200.00, 200, 'farm-3', 'low', 'none', null, 'approved', 210],
    ['prod-3', 'Fresh Shangi Potatoes (5kg)', 'produce', 280.00, 150, 'farm-2', 'low', 'none', null, 'approved', 520],
    ['prod-4', 'Dutch Robyjn Seed Potato 500g', 'seed', 180.00, 800, 'farm-2', 'low', 'none', null, 'approved', 180],
    ['prod-5', 'Blight-Control Dithane 1kg', 'fertiliser', 650.00, 300, 'farm-1', 'low', 'none', null, 'approved', 145],
    ['prod-6', 'Early Blight Resistant Markies Seed', 'seed', 420.00, 90, 'farm-4', 'medium', 'early_blight', null, 'approved', 62],
    ['prod-7', 'Ridomil Gold Fungicide 1kg', 'fertiliser', 1800.00, 400, 'farm-3', 'medium', 'late_blight', null, 'pending', 0],
    ['prod-8', 'Certified Tigoni Seed Potato 2kg', 'seed', 580.00, 300, 'farm-5', 'low', 'none', null, 'approved', 95],
    ['prod-9', 'Organic Potato Compost 25kg', 'fertiliser', 900.00, 120, 'farm-6', 'low', 'none', null, 'approved', 67],
    ['prod-10', 'Fresh Rosetta Potatoes 10kg', 'produce', 520.00, 200, 'farm-1', 'low', 'none', null, 'approved', 310],
  ]
  products.forEach(([id, name, cat, price, qty, fid, risk, dtype, img, status, views]) => {
    insertProduct.run(id, name, cat, price, qty, fid, risk, dtype, img, status, views)
    const farm = farms.find(f => f[0] === fid)
    insertFts.run(id, name, farm ? farm[1] : '')
  })

  const upsertRegion = db.prepare(`INSERT INTO region_disease_risk (region, risk_level, detection_count, blight_type) VALUES (?, ?, ?, ?)
    ON CONFLICT(region) DO UPDATE SET risk_level=excluded.risk_level, detection_count=excluded.detection_count, blight_type=excluded.blight_type`)
  upsertRegion.run('Nyandarua County', 'safe', 1, 'none')
  upsertRegion.run('Meru County', 'safe', 2, 'none')
  upsertRegion.run('Nakuru County', 'watch', 7, 'late_blight')
  upsertRegion.run('Uasin Gishu', 'outbreak', 18, 'early_blight')

  const insertAlert = db.prepare(`INSERT OR IGNORE INTO disease_alerts (id, region, message, severity, blight_type, simulated_email, simulated_sms) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  insertAlert.run('alert-1', 'Uasin Gishu', 'Early Blight outbreak in Uasin Gishu — 18 farms affected around Eldoret. Listings quarantined pending KEPHIS inspection.', 'outbreak', 'early_blight', 1, 1)
  insertAlert.run('alert-2', 'Nakuru County', 'Late Blight activity rising in Nakuru County (7 detections). Farmers advised to apply Ridomil Gold and inspect before listing.', 'watch', 'late_blight', 1, 0)

  const insertCert = db.prepare(`INSERT OR IGNORE INTO certifications (id, farm_id, status, reason, blight_type) VALUES (?, ?, ?, ?, ?)`)
  insertCert.run('cert-1', 'farm-1', 'certified', 'KEPHIS AI scan passed — no Early or Late Blight detected', 'none')
  insertCert.run('cert-2', 'farm-2', 'certified', 'KEPHIS AI scan passed — no Early or Late Blight detected', 'none')
  insertCert.run('cert-3', 'farm-5', 'certified', 'KEPHIS AI scan passed — certified disease-free seed stock', 'none')
  insertCert.run('cert-4', 'farm-4', 'revoked', 'Early Blight detected by AgroVision AI diagnosis — pending re-inspection', 'early_blight')

  const insertReview = db.prepare(`INSERT OR IGNORE INTO reviews (id, product_id, farm_id, rating, comment, buyer_name, approved) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  insertReview.run('rev-1', 'prod-1', 'farm-1', 5, 'Excellent certified Mpya seeds, germination was nearly 100%. Disease-free as labelled — from Nairobi.', 'James K.', 1)
  insertReview.run('rev-2', 'prod-1', 'farm-1', 4, 'Good quality seed potatoes, delivered to Nakuru in 2 days. Highly recommend Kinangop Farm.', 'Wanjiru M.', 1)
  insertReview.run('rev-3', 'prod-3', 'farm-2', 5, 'Fresh Shangi potatoes, great size and no blight signs. Will reorder from Meru Highlands.', 'David O.', 1)
  insertReview.run('rev-4', 'prod-3', 'farm-2', 4, 'Quality produce. Arrived well-packed from Meru. Very fresh.', 'Achieng F.', 1)
  insertReview.run('rev-5', 'prod-2', 'farm-3', 3, 'CAN fertiliser works well, but delivery from Nakuru took longer than expected.', 'Mutua A.', 1)
  insertReview.run('rev-6', 'prod-5', 'farm-1', 5, 'Best blight-control product on the market. Dithane saved my entire Kinangop crop!', 'Kamau B.', 1)
  insertReview.run('rev-7', 'prod-8', 'farm-5', 5, 'Timau Tigoni seeds are exceptional. Certified and healthy — germination perfect.', 'Njeri W.', 1)
  insertReview.run('rev-8', 'prod-10', 'farm-1', 4, 'Great Rosetta potatoes from Kinangop. Perfect for the Nairobi market.', 'Omondi P.', 1)

  const insertSale = db.prepare(`INSERT OR IGNORE INTO sales (id, product_id, farm_id, quantity, revenue, buyer_region, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
  const salesData = [
    ['sale-1', 'prod-1', 'farm-1', 20, 7000.00, 'Nakuru County', '2026-01-10'],
    ['sale-2', 'prod-1', 'farm-1', 35, 12250.00, 'Meru County', '2026-02-05'],
    ['sale-3', 'prod-1', 'farm-1', 10, 3500.00, 'Nyandarua County', '2026-03-14'],
    ['sale-4', 'prod-1', 'farm-1',  5, 1750.00, 'Uasin Gishu', '2026-04-20'],
    ['sale-5', 'prod-3', 'farm-2', 30, 8400.00, 'Nakuru County', '2026-01-15'],
    ['sale-6', 'prod-3', 'farm-2', 25, 7000.00, 'Nyandarua County', '2026-02-22'],
    ['sale-7', 'prod-3', 'farm-2', 40, 11200.00, 'Meru County', '2026-03-30'],
    ['sale-8', 'prod-5', 'farm-1', 15, 9750.00, 'Nakuru County', '2026-02-12'],
    ['sale-9', 'prod-5', 'farm-1', 20, 13000.00, 'Meru County', '2026-04-01'],
    ['sale-10','prod-2', 'farm-3', 10, 32000.00, 'Nyandarua County', '2026-01-28'],
    ['sale-11','prod-2', 'farm-3',  8, 25600.00, 'Uasin Gishu', '2026-03-08'],
    ['sale-12','prod-4', 'farm-2', 50, 9000.00, 'Nakuru County', '2026-04-15'],
    ['sale-13','prod-8', 'farm-5', 25, 14500.00, 'Nyandarua County', '2026-03-20'],
    ['sale-14','prod-10','farm-1', 30, 15600.00, 'Nakuru County', '2026-04-10'],
  ]
  salesData.forEach(s => insertSale.run(...s))
})

seedData()

export default db
