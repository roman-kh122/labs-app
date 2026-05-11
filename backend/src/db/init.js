const pool = require('./index');

const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS regions (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pollution (
      id SERIAL PRIMARY KEY,
      region_id INTEGER REFERENCES regions(id) ON DELETE CASCADE,
      aqi INTEGER NOT NULL,
      co DOUBLE PRECISION,
      no DOUBLE PRECISION,
      no2 DOUBLE PRECISION,
      o3 DOUBLE PRECISION,
      so2 DOUBLE PRECISION,
      pm2_5 DOUBLE PRECISION,
      pm10 DOUBLE PRECISION,
      nh3 DOUBLE PRECISION,
      recorded_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Seed default regions (Ukrainian cities) if empty
  const { rows } = await pool.query('SELECT COUNT(*) FROM regions');
  if (parseInt(rows[0].count) === 0) {
    const defaultRegions = [
      { name: 'Київ', lat: 50.4501, lon: 30.5234, description: 'Столиця України' },
      { name: 'Львів', lat: 49.8397, lon: 24.0297, description: 'Західна Україна' },
      { name: 'Одеса', lat: 46.4825, lon: 30.7233, description: 'Південна Україна' },
      { name: 'Харків', lat: 49.9935, lon: 36.2304, description: 'Східна Україна' },
      { name: 'Дніпро', lat: 48.4647, lon: 35.0462, description: 'Центральна Україна' },
      { name: 'Запоріжжя', lat: 47.8388, lon: 35.1396, description: 'Південно-Східна Україна' },
      { name: 'Вінниця', lat: 49.2331, lon: 28.4682, description: 'Центральна Україна' },
      { name: 'Івано-Франківськ', lat: 48.9226, lon: 24.7111, description: 'Західна Україна' },
    ];
    for (const r of defaultRegions) {
      await pool.query(
        'INSERT INTO regions (name, latitude, longitude, description) VALUES ($1, $2, $3, $4)',
        [r.name, r.lat, r.lon, r.description]
      );
    }
    console.log('Default regions seeded');
  }

  console.log('Database tables initialized');
};

module.exports = initDB;
