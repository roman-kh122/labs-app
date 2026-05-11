const pool = require('../db');

const OWM_API_KEY = process.env.OWM_API_KEY || 'demo';
const OWM_BASE = 'https://api.openweathermap.org/data/2.5/air_pollution';

// Helper to fetch from OpenWeatherMap
async function fetchFromOWM(lat, lon) {
  const url = `${OWM_BASE}?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OpenWeatherMap API error: ${response.status}`);
  }
  return response.json();
}

// ЛР1: Get current pollution level from OpenWeatherMap for given coordinates
exports.getCurrent = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Параметри lat та lon обов\'язкові' });
    }
    const data = await fetchFromOWM(parseFloat(lat), parseFloat(lon));
    res.json(data);
  } catch (err) {
    console.error('Get current pollution error:', err);
    res.status(500).json({ error: 'Помилка отримання даних з OpenWeatherMap' });
  }
};

// Search city and get its pollution
exports.searchCity = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Вкажіть місто для пошуку' });
    }

    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=1&appid=${OWM_API_KEY}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData || geoData.length === 0) {
      return res.status(404).json({ error: 'Місто не знайдено' });
    }

    const { lat, lon, name, country, state } = geoData[0];
    const pollutionData = await fetchFromOWM(lat, lon);

    res.json({
      name,
      country,
      state,
      lat,
      lon,
      pollution: pollutionData
    });
  } catch (err) {
    console.error('Search city error:', err);
    res.status(500).json({ error: 'Помилка пошуку міста' });
  }
};

// Get 7-day history for given lat/lon
// Tries OWM history API first, falls back to DB (nearest region)
exports.getHistoryByCoords = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Параметри lat та lon обов\'язкові' });
    }

    // First try OWM history API
    const end = Math.floor(Date.now() / 1000);
    const start = end - 7 * 24 * 60 * 60;
    const url = `${OWM_BASE}/history?lat=${lat}&lon=${lon}&start=${start}&end=${end}&appid=${OWM_API_KEY}`;

    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const items = data.list || [];
        if (items.length > 0) {
          const aggregated = [];
          const step = 4;
          for (let i = 0; i < items.length; i += step) {
            const chunk = items.slice(i, i + step);
            const avg = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0) / arr.length;
            aggregated.push({
              dt: chunk[0].dt,
              aqi: Math.round(avg(chunk, x => x.main.aqi)),
              pm2_5: parseFloat(avg(chunk, x => x.components.pm2_5).toFixed(2)),
              pm10: parseFloat(avg(chunk, x => x.components.pm10).toFixed(2)),
              no2: parseFloat(avg(chunk, x => x.components.no2).toFixed(2)),
              o3: parseFloat(avg(chunk, x => x.components.o3).toFixed(2)),
              co: parseFloat(avg(chunk, x => x.components.co).toFixed(2)),
            });
          }
          return res.json({ source: 'owm', data: aggregated });
        }
      }
    } catch (owmErr) {
      console.log('OWM history not available, falling back to DB:', owmErr.message);
    }

    // Fallback: find nearest region in DB and return its history
    const dbResult = await pool.query(`
      SELECT p.aqi, p.pm2_5, p.pm10, p.no2, p.o3, p.co,
             EXTRACT(EPOCH FROM p.recorded_at)::int as dt,
             r.name as region_name
      FROM pollution p
      JOIN regions r ON p.region_id = r.id
      WHERE p.recorded_at > NOW() - INTERVAL '7 days'
      ORDER BY (r.latitude - $1)^2 + (r.longitude - $2)^2 ASC,
               p.recorded_at ASC
      LIMIT 200
    `, [parseFloat(lat), parseFloat(lon)]);

    const rows = dbResult.rows;
    if (rows.length === 0) {
      return res.json({ source: 'db', data: [], message: 'Немає історичних даних' });
    }

    const formatted = rows.map(r => ({
      dt: r.dt,
      aqi: r.aqi,
      pm2_5: parseFloat(r.pm2_5),
      pm10: parseFloat(r.pm10),
      no2: parseFloat(r.no2),
      o3: parseFloat(r.o3),
      co: parseFloat(r.co),
    }));

    res.json({ source: 'db', regionName: rows[0].region_name, data: formatted });
  } catch (err) {
    console.error('Get history by coords error:', err);
    res.status(500).json({ error: 'Помилка отримання історичних даних' });
  }
};

// Get forecast from OWM for any lat/lon
exports.getForecast = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Параметри lat та lon обов\'язкові' });
    }

    const url = `${OWM_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errBody = await response.text();
      console.error('OWM forecast error:', response.status, errBody);
      return res.status(502).json({ error: `API повернув помилку: ${response.status}` });
    }

    const data = await response.json();
    const items = data.list || [];

    if (items.length === 0) {
      return res.json([]);
    }

    // Aggregate hourly forecast into ~4h blocks
    const aggregated = [];
    const step = 4;
    for (let i = 0; i < items.length; i += step) {
      const chunk = items.slice(i, i + step);
      const avg = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0) / arr.length;
      aggregated.push({
        dt: chunk[0].dt,
        aqi: Math.round(avg(chunk, x => x.main.aqi)),
        pm2_5: parseFloat(avg(chunk, x => x.components.pm2_5).toFixed(2)),
        pm10: parseFloat(avg(chunk, x => x.components.pm10).toFixed(2)),
        no2: parseFloat(avg(chunk, x => x.components.no2).toFixed(2)),
        o3: parseFloat(avg(chunk, x => x.components.o3).toFixed(2)),
        co: parseFloat(avg(chunk, x => x.components.co).toFixed(2)),
      });
    }

    res.json(aggregated);
  } catch (err) {
    console.error('Get forecast error:', err);
    res.status(500).json({ error: 'Помилка отримання прогнозу' });
  }
};

// Fetch and store pollution data for a specific region
exports.fetchAndStore = async (req, res) => {
  try {
    const { regionId } = req.params;
    const region = await pool.query('SELECT * FROM regions WHERE id = $1', [regionId]);
    if (region.rows.length === 0) {
      return res.status(404).json({ error: 'Регіон не знайдено' });
    }

    const { latitude: lat, longitude: lon } = region.rows[0];
    const data = await fetchFromOWM(lat, lon);

    if (!data.list || data.list.length === 0) {
      return res.status(502).json({ error: 'Немає даних від OpenWeatherMap' });
    }

    const item = data.list[0];
    const components = item.components;

    const result = await pool.query(
      `INSERT INTO pollution (region_id, aqi, co, no, no2, o3, so2, pm2_5, pm10, nh3, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, to_timestamp($11))
       RETURNING *`,
      [
        regionId,
        item.main.aqi,
        components.co,
        components.no,
        components.no2,
        components.o3,
        components.so2,
        components.pm2_5,
        components.pm10,
        components.nh3,
        item.dt,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Fetch and store error:', err);
    res.status(500).json({ error: 'Помилка збереження даних' });
  }
};

// Fetch and store for ALL regions
exports.fetchAll = async (req, res) => {
  try {
    const regions = await pool.query('SELECT * FROM regions');
    const results = [];

    for (const region of regions.rows) {
      try {
        const data = await fetchFromOWM(region.latitude, region.longitude);
        if (data.list && data.list.length > 0) {
          const item = data.list[0];
          const c = item.components;
          const result = await pool.query(
            `INSERT INTO pollution (region_id, aqi, co, no, no2, o3, so2, pm2_5, pm10, nh3, recorded_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, to_timestamp($11))
             RETURNING *`,
            [region.id, item.main.aqi, c.co, c.no, c.no2, c.o3, c.so2, c.pm2_5, c.pm10, c.nh3, item.dt]
          );
          results.push({ region: region.name, data: result.rows[0] });
        }
      } catch (err) {
        results.push({ region: region.name, error: err.message });
      }
    }

    res.json({ message: 'Дані оновлено', results });
  } catch (err) {
    console.error('Fetch all error:', err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
};

// Get pollution history from DB (optionally filter by region)
exports.getHistory = async (req, res) => {
  try {
    const { regionId, limit } = req.query;
    let query = `
      SELECT p.*, r.name as region_name, r.latitude as lat, r.longitude as lon
      FROM pollution p
      JOIN regions r ON p.region_id = r.id
    `;
    const params = [];

    if (regionId) {
      params.push(regionId);
      query += ` WHERE p.region_id = $${params.length}`;
    }

    query += ' ORDER BY p.recorded_at DESC';

    if (limit) {
      params.push(parseInt(limit));
      query += ` LIMIT $${params.length}`;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
};

// ЛР2: Get average pollution indicators per region
exports.getAverages = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id as region_id,
        r.name as region_name,
        r.latitude as lat,
        r.longitude as lon,
        ROUND(AVG(p.aqi)::numeric, 2) as avg_aqi,
        ROUND(AVG(p.co)::numeric, 2) as avg_co,
        ROUND(AVG(p.no2)::numeric, 2) as avg_no2,
        ROUND(AVG(p.o3)::numeric, 2) as avg_o3,
        ROUND(AVG(p.so2)::numeric, 2) as avg_so2,
        ROUND(AVG(p.pm2_5)::numeric, 2) as avg_pm2_5,
        ROUND(AVG(p.pm10)::numeric, 2) as avg_pm10,
        COUNT(p.id) as measurements_count,
        MAX(p.recorded_at) as last_measured
      FROM regions r
      LEFT JOIN pollution p ON r.id = p.region_id
      GROUP BY r.id, r.name, r.latitude, r.longitude
      ORDER BY r.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get averages error:', err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
};

// Get latest pollution for each region (for map markers)
exports.getLatest = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (r.id)
        r.id as region_id,
        r.name as region_name,
        r.latitude as lat,
        r.longitude as lon,
        r.description,
        p.aqi,
        p.co,
        p.no2,
        p.o3,
        p.so2,
        p.pm2_5,
        p.pm10,
        p.nh3,
        p.recorded_at as measured_at
      FROM regions r
      LEFT JOIN pollution p ON r.id = p.region_id
      ORDER BY r.id, p.recorded_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get latest error:', err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
};
