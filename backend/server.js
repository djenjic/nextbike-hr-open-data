const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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

// POMOCNE FUNKCIJE

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

// Response wrapper
function createResponse(status, message, data = null) {
  return {
    status: status,
    message: message,
    response: data
  };
}

// Error handler middleware
function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json(createResponse('Error', message, null));
}







// OPENAPI SPECIFICATION ENDPOINT

app.get('/api/specification', (req, res) => {
  try {
    const specPath = path.join(__dirname, '..', 'openapi.json');
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    res.json(spec);
  } catch (error) {
    res.status(500).json(createResponse('Error', 'Cannot load OpenAPI specification', null));
  }
});

// STANICE ENDPOINTS
//------------------------------------------


// GET /api/stanice - Dohvaćanje svih stanica
app.get('/api/stanice', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT id, naziv, adresa, kapacitet, geo_lat, geo_lon, aktivna, datum_posljednje_aktivnosti
      FROM stanice
      ORDER BY id
    `);
    
    const stanice = formatData(result.rows);
    res.json(createResponse('OK', 'Successfully fetched all stations', stanice));
  } catch (error) {
    next(error);
  }
});

// GET /api/stanice/:id - Dohvaćanje pojedinačne stanice
app.get('/api/stanice/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json(createResponse('Bad Request', 'Invalid station ID', null));
    }
    
    const result = await pool.query(
      'SELECT * FROM stanice WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json(createResponse('Not Found', 'Station with the provided ID does not exist', null));
    }
    
    const stanica = formatData(result.rows)[0];
    
    // Dohvati bicikle za tu stanicu
    const bicikliResult = await pool.query(
      'SELECT id, status, tip, zadnje_koristenje FROM bicikli WHERE stanica_id = $1',
      [id]
    );
    
    stanica.bicikli = formatData(bicikliResult.rows);
    
    res.json(createResponse('OK', 'Successfully fetched station', stanica));
  } catch (error) {
    next(error);
  }
});

// GET /api/stanice/:id/bicikli - Dohvaćanje bicikala na stanici
app.get('/api/stanice/:id/bicikli', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Provjeri postoji li stanica
    const stanicaCheck = await pool.query('SELECT id FROM stanice WHERE id = $1', [id]);
    if (stanicaCheck.rows.length === 0) {
      return res.status(404).json(createResponse('Not Found', 'Station not found', null));
    }
    
    const result = await pool.query(
      'SELECT * FROM bicikli WHERE stanica_id = $1 ORDER BY id',
      [id]
    );
    
    const bicikli = formatData(result.rows);
    res.json(createResponse('OK', `Successfully fetched bikes for station ${id}`, bicikli));
  } catch (error) {
    next(error);
  }
});

// GET /api/stanice/aktivne/:status - Dohvaćanje stanica po statusu aktivnosti
app.get('/api/stanice/aktivne/:status', async (req, res, next) => {
  try {
    const { status } = req.params;
    const isActive = status === 'true' || status === '1';
    
    const result = await pool.query(
      'SELECT * FROM stanice WHERE aktivna = $1 ORDER BY id',
      [isActive]
    );
    
    const stanice = formatData(result.rows);
    res.json(createResponse('OK', `Successfully fetched ${isActive ? 'active' : 'inactive'} stations`, stanice));
  } catch (error) {
    next(error);
  }
});

// GET /api/stanice/lokacija/:lokacija - Pretraga stanica po lokaciji
app.get('/api/stanice/lokacija/:lokacija', async (req, res, next) => {
  try {
    const { lokacija } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM stanice WHERE adresa ILIKE $1 OR naziv ILIKE $1 ORDER BY id',
      [`%${lokacija}%`]
    );
    
    const stanice = formatData(result.rows);
    res.json(createResponse('OK', `Successfully searched stations by location: ${lokacija}`, stanice));
  } catch (error) {
    next(error);
  }
});

// POST /api/stanice - Kreiranje nove stanice
app.post('/api/stanice', async (req, res, next) => {
  try {
    const { naziv, adresa, kapacitet, geo_lat, geo_lon, aktivna, datum_posljednje_aktivnosti } = req.body;
    
    // Validacija
    if (!naziv || !adresa || !kapacitet || geo_lat === undefined || geo_lon === undefined) {
      return res.status(400).json(createResponse('Bad Request', 'Missing required fields', null));
    }
    
    // Generiraj novi ID
    const maxIdResult = await pool.query('SELECT MAX(id) as max_id FROM stanice');
    const newId = (maxIdResult.rows[0].max_id || 0) + 1;
    
    const result = await pool.query(
      `INSERT INTO stanice (id, naziv, adresa, kapacitet, geo_lat, geo_lon, aktivna, datum_posljednje_aktivnosti)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [newId, naziv, adresa, kapacitet, geo_lat, geo_lon, aktivna !== false, datum_posljednje_aktivnosti || new Date().toISOString().split('T')[0]]
    );
    
    const novaStanica = formatData(result.rows)[0];
    res.status(201).json(createResponse('Created', 'Station successfully created', novaStanica));
  } catch (error) {
    next(error);
  }
});

// PUT /api/stanice/:id - Ažuriranje stanice
app.put('/api/stanice/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { naziv, adresa, kapacitet, geo_lat, geo_lon, aktivna, datum_posljednje_aktivnosti } = req.body;
    
    // Provjeri postoji li stanica
    const checkResult = await pool.query('SELECT id FROM stanice WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json(createResponse('Not Found', 'Station with the provided ID does not exist', null));
    }
    
    // Ažuriraj
    const result = await pool.query(
      `UPDATE stanice 
       SET naziv = COALESCE($1, naziv),
           adresa = COALESCE($2, adresa),
           kapacitet = COALESCE($3, kapacitet),
           geo_lat = COALESCE($4, geo_lat),
           geo_lon = COALESCE($5, geo_lon),
           aktivna = COALESCE($6, aktivna),
           datum_posljednje_aktivnosti = COALESCE($7, datum_posljednje_aktivnosti)
       WHERE id = $8
       RETURNING *`,
      [naziv, adresa, kapacitet, geo_lat, geo_lon, aktivna, datum_posljednje_aktivnosti, id]
    );
    
    const azuriranaStanica = formatData(result.rows)[0];
    res.json(createResponse('OK', 'Station successfully updated', azuriranaStanica));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/stanice/:id - Brisanje stanice
app.delete('/api/stanice/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Provjeri postoji li stanica
    const checkResult = await pool.query('SELECT id FROM stanice WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json(createResponse('Not Found', 'Station with the provided ID does not exist', null));
    }
    
    // Obriši prvo bicikle (foreign key constraint)
    await pool.query('DELETE FROM bicikli WHERE stanica_id = $1', [id]);
    
    // Obriši stanicu
    await pool.query('DELETE FROM stanice WHERE id = $1', [id]);
    
    res.json(createResponse('OK', 'Station successfully deleted', { deleted_id: parseInt(id) }));
  } catch (error) {
    next(error);
  }
});






// BICIKLI ENDPOINTS
//------------------------------------------

// GET /api/bicikli - Dohvaćanje svih bicikala
app.get('/api/bicikli', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM bicikli ORDER BY id');
    const bicikli = formatData(result.rows);
    res.json(createResponse('OK', 'Successfully fetched all bikes', bicikli));
  } catch (error) {
    next(error);
  }
});

// GET /api/bicikli/:id - Dohvaćanje pojedinog bicikla
app.get('/api/bicikli/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM bicikli WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json(createResponse('Not Found', 'Bike with the provided ID does not exist', null));
    }
    
    const bicikl = formatData(result.rows)[0];
    res.json(createResponse('OK', 'Successfully fetched bike', bicikl));
  } catch (error) {
    next(error);
  }
});

// POST /api/bicikli - Dodavanje novog bicikla
app.post('/api/bicikli', async (req, res, next) => {
  try {
    const { status, tip, zadnje_koristenje, stanica_id } = req.body;
    
    if (!status || !tip || !stanica_id) {
      return res.status(400).json(createResponse('Bad Request', 'Missing required fields', null));
    }
    
    // Provjeri postoji li stanica
    const stanicaCheck = await pool.query('SELECT id FROM stanice WHERE id = $1', [stanica_id]);
    if (stanicaCheck.rows.length === 0) {
      return res.status(400).json(createResponse('Bad Request', 'Station with provided ID does not exist', null));
    }
    
    // Generiraj novi ID
    const maxIdResult = await pool.query('SELECT MAX(id) as max_id FROM bicikli');
    const newId = (maxIdResult.rows[0].max_id || 800000) + 1;
    
    const result = await pool.query(
      `INSERT INTO bicikli (id, status, tip, zadnje_koristenje, stanica_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [newId, status, tip, zadnje_koristenje || new Date().toISOString().split('T')[0], stanica_id]
    );
    
    const noviBicikl = formatData(result.rows)[0];
    res.status(201).json(createResponse('Created', 'Bike successfully created', noviBicikl));
  } catch (error) {
    next(error);
  }
});

// PUT /api/bicikli/:id - Ažuriranje bicikla
app.put('/api/bicikli/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, tip, zadnje_koristenje, stanica_id } = req.body;
    
    // Provjeri postoji li bicikl
    const checkResult = await pool.query('SELECT id FROM bicikli WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json(createResponse('Not Found', 'Bike with the provided ID does not exist', null));
    }
    
    // Ažuriraj
    const result = await pool.query(
      `UPDATE bicikli 
       SET status = COALESCE($1, status),
           tip = COALESCE($2, tip),
           zadnje_koristenje = COALESCE($3, zadnje_koristenje),
           stanica_id = COALESCE($4, stanica_id)
       WHERE id = $5
       RETURNING *`,
      [status, tip, zadnje_koristenje, stanica_id, id]
    );
    
    const azuriranBicikl = formatData(result.rows)[0];
    res.json(createResponse('OK', 'Bike successfully updated', azuriranBicikl));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/bicikli/:id - Brisanje bicikla
app.delete('/api/bicikli/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Provjeri postoji li bicikl
    const checkResult = await pool.query('SELECT id FROM bicikli WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json(createResponse('Not Found', 'Bike with the provided ID does not exist', null));
    }
    
    await pool.query('DELETE FROM bicikli WHERE id = $1', [id]);
    
    res.json(createResponse('OK', 'Bike successfully deleted', { deleted_id: parseInt(id) }));
  } catch (error) {
    next(error);
  }
});






// LEGACY ENDPOINTS (za Lab 2)
//------------------------------------------

app.get('/api/data', async (req, res, next) => {
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
    
    res.json({
      success: true,
      count: formattedData.length,
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/export/csv', async (req, res, next) => {
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
          s.adresa ILIKE $1
        `;
        params.push(`%${search}%`);
      }
    }
    
    query += ' ORDER BY s.id, b.id';
    
    const result = await pool.query(query, params);
    const formattedData = formatData(result.rows);
    
    const headers = Object.keys(formattedData[0] || {});
    let csv = headers.join(',') + '\n';
    
    formattedData.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
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
    next(error);
  }
});

app.get('/api/export/json', async (req, res, next) => {
  try {
    const { search, attribute } = req.query;
    
    let query = 'SELECT * FROM stanice s';
    const params = [];
    
    if (search && search.trim() !== '') {
      if (attribute && attribute !== 'all') {
        query += ` WHERE CAST(s.${attribute} AS TEXT) ILIKE $1`;
        params.push(`%${search}%`);
      } else {
        query += ` WHERE 
          CAST(s.id AS TEXT) ILIKE $1 OR
          s.naziv ILIKE $1 OR
          s.adresa ILIKE $1
        `;
        params.push(`%${search}%`);
      }
    }
    
    query += ' ORDER BY s.id';
    
    const staniceResult = await pool.query(query, params);
    const stanice = formatData(staniceResult.rows);
    
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
        bicikli: bicikli
      });
    }
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=nextbike-filtered.json');
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json(createResponse('OK', 'Server is running', { uptime: process.uptime() }));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json(createResponse('Not Found', 'Endpoint not found', null));
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📘 OpenAPI spec: http://localhost:${PORT}/api/specification`);
});