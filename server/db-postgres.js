/**
 * PostgreSQL database module for FarmMarket
 *
 * SETUP: Add these environment variables in your deployment environment:
 *   DATABASE_URL   — full connection string (e.g. postgresql://user:pass@host/dbname)
 *   OR individually:
 *   PGHOST         — database host
 *   PGPORT         — database port (default 5432)
 *   PGDATABASE     — database name
 *   PGUSER         — database user
 *   PGPASSWORD     — database password
 *
 * Once DATABASE_URL (or PG* vars) are set, restart the API server.
 * The app will automatically switch from SQLite to PostgreSQL.
 */

import pg from 'pg'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'

const { Pool } = pg

let pool = null

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || '5432'),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl: process.env.DATABASE_URL?.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
    })
  }
  return pool
}

export async function initPostgres() {
  const client = await getPool().connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'buyer' CHECK(role IN ('buyer','farmer','admin')),
        avatar_color TEXT DEFAULT '#4ade80',
        buyer_lat REAL,
        buyer_lng REAL,
        buyer_region TEXT,
        buyer_location TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
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
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('seed','fertiliser','produce')),
        price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        farm_id TEXT NOT NULL REFERENCES farms(id),
        disease_risk_tag TEXT NOT NULL CHECK(disease_risk_tag IN ('low','medium','high')),
        disease_type TEXT DEFAULT 'none',
        image_url TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','archived')),
        quarantined INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS region_disease_risk (
        region TEXT PRIMARY KEY,
        risk_level TEXT DEFAULT 'safe' CHECK(risk_level IN ('safe','watch','outbreak')),
        detection_count INTEGER DEFAULT 0,
        blight_type TEXT DEFAULT 'none',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS disease_alerts (
        id TEXT PRIMARY KEY,
        region TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT DEFAULT 'watch' CHECK(severity IN ('watch','outbreak')),
        blight_type TEXT DEFAULT 'early_blight',
        simulated_email INTEGER DEFAULT 0,
        simulated_sms INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id),
        farm_id TEXT NOT NULL REFERENCES farms(id),
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        comment TEXT,
        buyer_name TEXT NOT NULL,
        approved INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS certifications (
        id TEXT PRIMARY KEY,
        farm_id TEXT NOT NULL REFERENCES farms(id),
        status TEXT NOT NULL CHECK(status IN ('certified','revoked')),
        reason TEXT,
        blight_type TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id),
        farm_id TEXT NOT NULL REFERENCES farms(id),
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
        created_at TIMESTAMPTZ DEFAULT NOW()
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
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)

    // Seed initial data (idempotent)
    await seedPostgresData(client)
    console.log('PostgreSQL schema initialized successfully')
  } finally {
    client.release()
  }
}

async function seedPostgresData(client) {
  const farmCount = await client.query('SELECT COUNT(*) FROM farms')
  if (parseInt(farmCount.rows[0].count) > 0) return // already seeded

  const farms = [
    ['farm-1','Green Valley Potato Farm','Northern Region',1,1,4.8,120,11.8,8.5,'seller@greenvalley.farm','+234-801-000-001'],
    ['farm-2','Sunrise Agricultural','Southern Region',0,0,4.2,85,5.6,7.2,'info@sunriseag.farm','+234-802-000-002'],
    ['farm-3','Heritage Potato Co.','Eastern Region',1,1,4.9,210,6.8,11.4,'contact@heritageseeds.farm','+234-803-000-003'],
    ['farm-4','Golden Fields Farm','Western Region',0,0,3.9,44,7.4,3.9,'admin@goldenfields.farm','+234-804-000-004'],
  ]
  for (const f of farms) {
    await client.query('INSERT INTO farms (id,name,region,disease_safe,certified_clean,rating,rating_count,lat,lng,owner_email,owner_phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING', f)
  }

  const products = [
    ['prod-1','Certified Potato Seed (1kg)','seed',12.50,500,'farm-1','low','none',null,'approved',340],
    ['prod-2','NPK Potato Fertiliser 20kg','fertiliser',45.00,200,'farm-2','low','none',null,'approved',210],
    ['prod-3','Fresh Potatoes (5kg)','produce',8.75,150,'farm-3','low','none',null,'approved',520],
    ['prod-4','Highland Potato Seeds 500g','seed',6.00,800,'farm-3','low','none',null,'approved',180],
    ['prod-5','Blight-Control Fertiliser 10kg','fertiliser',22.00,300,'farm-1','low','none',null,'approved',145],
    ['prod-6','Early Blight Resistant Seeds','seed',9.50,90,'farm-4','medium','early_blight',null,'approved',62],
    ['prod-7','Potato Fungicide Spray 2L','fertiliser',18.00,400,'farm-2','medium','late_blight',null,'pending',0],
  ]
  for (const p of products) {
    await client.query('INSERT INTO products (id,name,category,price,quantity,farm_id,disease_risk_tag,disease_type,image_url,status,views) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING', p)
  }

  const regions = [
    ['Northern Region','safe',2,'none'],['Southern Region','watch',8,'late_blight'],
    ['Eastern Region','safe',1,'none'],['Western Region','outbreak',19,'early_blight'],
  ]
  for (const r of regions) {
    await client.query('INSERT INTO region_disease_risk (region,risk_level,detection_count,blight_type) VALUES ($1,$2,$3,$4) ON CONFLICT(region) DO UPDATE SET risk_level=$2,detection_count=$3,blight_type=$4', r)
  }

  await client.query(`INSERT INTO disease_alerts (id,region,message,severity,blight_type,simulated_email,simulated_sms) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
    ['alert-1','Western Region','Early Blight outbreak in Western Region — 19 potato farms affected.','outbreak','early_blight',1,1])
  await client.query(`INSERT INTO disease_alerts (id,region,message,severity,blight_type,simulated_email,simulated_sms) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
    ['alert-2','Southern Region','Late Blight activity elevated in Southern Region (8 detections).','watch','late_blight',1,0])

  await client.query(`INSERT INTO certifications (id,farm_id,status,reason,blight_type) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
    ['cert-1','farm-1','certified','AI scan passed — no Early or Late Blight detected','none'])
  await client.query(`INSERT INTO certifications (id,farm_id,status,reason,blight_type) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
    ['cert-2','farm-3','certified','AI scan passed — no Early or Late Blight detected','none'])
}

export default { getPool, initPostgres }
