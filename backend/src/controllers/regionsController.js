const pool = require('../db');

exports.getAll = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM regions ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Get regions error:', err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM regions WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Регіон не знайдено' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get region error:', err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, lat, lon, description } = req.body;
    if (!name || lat == null || lon == null) {
      return res.status(400).json({ error: 'Назва, широта та довгота обов\'язкові' });
    }
    const result = await pool.query(
      'INSERT INTO regions (name, latitude, longitude, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, lat, lon, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create region error:', err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, lat, lon, description } = req.body;
    const result = await pool.query(
      'UPDATE regions SET name = COALESCE($1, name), latitude = COALESCE($2, latitude), longitude = COALESCE($3, longitude), description = COALESCE($4, description) WHERE id = $5 RETURNING *',
      [name, lat, lon, description, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Регіон не знайдено' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update region error:', err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM regions WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Регіон не знайдено' });
    }
    res.json({ message: 'Регіон видалено', region: result.rows[0] });
  } catch (err) {
    console.error('Delete region error:', err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
};
