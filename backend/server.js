const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

console.log("ENV:", {
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD
});

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Middleware
app.use(cors());
app.use(express.json());

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err);
  } else {
    console.log('✅ Database connected successfully');
  }
});

// Helper function za pretvaranje boolean i date
function formatData(rows) {
  return rows.map(row => ({
    ...row,
    aktivna: row.aktivna === true || row.aktivna === 't',
    datum_posljednje_aktivnosti: row.datum_posljednje_aktivnosti ? 
      new Date(row.datum_posljednje_aktivnosti).toISOString().split('T')[0] : null,
    zadnje_koristenje: row.zadnje_koristenje ? 
      new Date(row.zadnje_koristenje).toISOString().split('T')[0] : null
  }));
}

// API endpoint za dohvaćanje svih podataka s filtrom
app.get('/api/data', async (req, res) => {
  try {
    const { search, attribute } = req.query;
    
    let query = `
      SELECT 
        s.id as stanica_id,
        s.naziv,
        s.adresa,
        s.kapacitet,
        s.geo_lat,
        s.geo_lon,
        s.aktivna,
        s.datum_posljednje_aktivnosti,
        b.id as bicikl_id,
        b.status,
        b.tip,
        b.zadnje_koristenje
      FROM stanice s
      LEFT JOIN bicikli b ON s.id = b.stanica_id
    `;
    
    const params = [];
    
    // Dodavanje filtera ako postoji
    if (search && search.trim() !== '') {
      if (attribute && attribute !== 'all') {
        // Pretraga po specifičnom atributu
        query += ` WHERE CAST(s.${attribute} AS TEXT) ILIKE $1`;
        params.push(`%${search}%`);
      } else {
        // Wildcard pretraga po svim atributima
        query += ` WHERE 
          CAST(s.id AS TEXT) ILIKE $1 OR
          s.naziv ILIKE $1 OR
          s.adresa ILIKE $1 OR
          CAST(s.kapacitet AS TEXT) ILIKE $1 OR
          CAST(s.geo_lat AS TEXT) ILIKE $1 OR
          CAST(s.geo_lon AS TEXT) ILIKE $1 OR
          CAST(b.id AS TEXT) ILIKE $1 OR
          b.status ILIKE $1 OR
          b.tip ILIKE $1
        `;
        params.push(`%${search}%`);
      }
    }
    
    query += ' ORDER BY s.id, b.id';
    
    const result = await pool.query(query, params);
    const formattedData = formatData(result.rows);
    
    res.json({
      success: true,
      count: formattedData.length,
      data: formattedData
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri dohvaćanju podataka',
      message: error.message
    });
  }
});

// Endpoint za generiranje CSV-a
app.get('/api/export/csv', async (req, res) => {
  try {
    const { search, attribute } = req.query;
    
    let query = `
      SELECT 
        s.id as stanica_id,
        s.naziv,
        s.adresa,
        s.kapacitet,
        s.geo_lat,
        s.geo_lon,
        s.aktivna,
        s.datum_posljednje_aktivnosti,
        b.id as bicikl_id,
        b.status,
        b.tip,
        b.zadnje_koristenje
      FROM stanice s
      LEFT JOIN bicikli b ON s.id = b.stanica_id
    `;
    
    const params = [];
    
    if (search && search.trim() !== '') {
      if (attribute && attribute !== 'all') {
        query += ` WHERE CAST(s.${attribute} AS TEXT) ILIKE $1`;
        params.push(`%${search}%`);
      } else {
        query += ` WHERE 
          CAST(s.id AS TEXT) ILIKE $1 OR
          s.naziv ILIKE $1 OR
          s.adresa ILIKE $1 OR
          CAST(s.kapacitet AS TEXT) ILIKE $1 OR
          CAST(b.id AS TEXT) ILIKE $1 OR
          b.status ILIKE $1 OR
          b.tip ILIKE $1
        `;
        params.push(`%${search}%`);
      }
    }
    
    query += ' ORDER BY s.id, b.id';
    
    const result = await pool.query(query, params);
    const formattedData = formatData(result.rows);
    
    // Generiranje CSV-a
    const headers = Object.keys(formattedData[0] || {});
    let csv = headers.join(',') + '\n';
    
    formattedData.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Escape comma i quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csv += values.join(',') + '\n';
    });
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=nextbike-filtered.csv');
    res.send(csv);
    
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri generiranju CSV-a'
    });
  }
});

// Endpoint za generiranje JSON-a
app.get('/api/export/json', async (req, res) => {
  try {
    const { search, attribute } = req.query;
    
    let query = `
      SELECT 
        s.id,
        s.naziv,
        s.adresa,
        s.kapacitet,
        s.geo_lat,
        s.geo_lon,
        s.aktivna,
        s.datum_posljednje_aktivnosti
      FROM stanice s
    `;
    
    const params = [];
    
    if (search && search.trim() !== '') {
      if (attribute && attribute !== 'all') {
        query += ` WHERE CAST(s.${attribute} AS TEXT) ILIKE $1`;
        params.push(`%${search}%`);
      } else {
        query += ` WHERE 
          CAST(s.id AS TEXT) ILIKE $1 OR
          s.naziv ILIKE $1 OR
          s.adresa ILIKE $1 OR
          CAST(s.kapacitet AS TEXT) ILIKE $1
        `;
        params.push(`%${search}%`);
      }
    }
    
    query += ' ORDER BY s.id';
    
    const staniceResult = await pool.query(query, params);
    const stanice = formatData(staniceResult.rows);
    
    // Dohvaćanje bicikala za svaku stanicu
    const result = [];
    for (const stanica of stanice) {
      const bicikliResult = await pool.query(
        'SELECT id, status, tip, zadnje_koristenje FROM bicikli WHERE stanica_id = $1',
        [stanica.id]
      );
      
      const bicikli = formatData(bicikliResult.rows);
      
      result.push({
        id: stanica.id,
        naziv: stanica.naziv,
        adresa: stanica.adresa,
        kapacitet: stanica.kapacitet,
        geo_lat: stanica.geo_lat,
        geo_lon: stanica.geo_lon,
        aktivna: stanica.aktivna,
        datum_posljednje_aktivnosti: stanica.datum_posljednje_aktivnosti,
        bicikli: bicikli.map(b => ({
          id: b.id,
          status: b.status,
          tip: b.tip,
          zadnje_koristenje: b.zadnje_koristenje
        }))
      });
    }
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=nextbike-filtered.json');
    res.json(result);
    
  } catch (error) {
    console.error('JSON export error:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri generiranju JSON-a'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});