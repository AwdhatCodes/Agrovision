import db from '../db.js'

export function diseasesTrendHandler(req, res) {
  try {
    const rows = db.prepare(`
      SELECT
        strftime('%Y-%m', created_at) as yearMonth,
        disease_result,
        COUNT(*) as count
      FROM disease_scans
      WHERE disease_result IN ('healthy', 'early_blight', 'late_blight')
      GROUP BY yearMonth, disease_result
      ORDER BY yearMonth ASC
    `).all()

    const monthMap = new Map()
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    rows.forEach(row => {
      const [year, month] = row.yearMonth.split('-')
      const monthIndex = parseInt(month) - 1
      const monthLabel = months[monthIndex]
      const key = `${year}-${monthLabel}`

      if (!monthMap.has(key)) {
        monthMap.set(key, { month: monthLabel, year: parseInt(year), lateBlight: 0, earlyBlight: 0, healthy: 0 })
      }

      const data = monthMap.get(key)
      if (row.disease_result === 'late_blight') data.lateBlight = row.count
      else if (row.disease_result === 'early_blight') data.earlyBlight = row.count
      else if (row.disease_result === 'healthy') data.healthy = row.count
    })

    const trends = Array.from(monthMap.values())
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return months.indexOf(a.month) - months.indexOf(b.month)
      })
      .map(({ year, ...rest }) => rest)

    res.json(trends)
  } catch (error) {
    console.error('Disease trends error:', error)
    res.status(500).json({ error: 'Failed to fetch disease trends' })
  }
}

export function farmerDiseasesTrendHandler(req, res) {
  try {
    const { farmId } = req.params
    if (!farmId) return res.status(400).json({ error: 'Farm ID required' })

    const rows = db.prepare(`
      SELECT
        strftime('%Y-%m', created_at) as yearMonth,
        disease_result,
        COUNT(*) as count
      FROM disease_scans
      WHERE farm_id = ? AND disease_result IN ('healthy', 'early_blight', 'late_blight')
      GROUP BY yearMonth, disease_result
      ORDER BY yearMonth ASC
    `).all(farmId)

    const monthMap = new Map()
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    rows.forEach(row => {
      const [year, month] = row.yearMonth.split('-')
      const monthIndex = parseInt(month) - 1
      const monthLabel = months[monthIndex]
      const key = `${year}-${monthLabel}`

      if (!monthMap.has(key)) {
        monthMap.set(key, { month: monthLabel, year: parseInt(year), lateBlight: 0, earlyBlight: 0, healthy: 0 })
      }

      const data = monthMap.get(key)
      if (row.disease_result === 'late_blight') data.lateBlight = row.count
      else if (row.disease_result === 'early_blight') data.earlyBlight = row.count
      else if (row.disease_result === 'healthy') data.healthy = row.count
    })

    const trends = Array.from(monthMap.values())
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return months.indexOf(a.month) - months.indexOf(b.month)
      })
      .map(({ year, ...rest }) => rest)

    res.json(trends)
  } catch (error) {
    console.error('Farmer disease trends error:', error)
    res.status(500).json({ error: 'Failed to fetch farm disease trends' })
  }
}
