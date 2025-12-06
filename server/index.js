const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const loki = require('../src/lokijs.js');
const HNSWIndex = require('../src/loki-hnsw-index.js');
require('../src/loki-vector-plugin.js');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increase limit for large vector payloads

// Initialize Database
const db = new loki('loki-vector-server.db', {
  autosave: true,
  autosaveInterval: 4000,
  autoload: true,
  autoloadCallback: databaseInitialize
});

function databaseInitialize() {
  console.log('Database loaded/initialized');
}

// Routes

// 1. Get Server Status
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    engine: 'LokiJS + HNSW',
    collections: db.listCollections().map(c => c.name)
  });
});

// 2. Create Collection
app.post('/collections', (req, res) => {
  const { name, options } = req.body;
  if (!name) return res.status(400).json({ error: 'Collection name required' });
  
  let coll = db.getCollection(name);
  if (coll) return res.status(409).json({ error: 'Collection already exists' });
  
  coll = db.addCollection(name, options);
  res.json({ message: `Collection '${name}' created` });
});

// 3. Create Vector Index
app.post('/collections/:name/index', (req, res) => {
  const { name } = req.params;
  const { field, options } = req.body;
  
  const coll = db.getCollection(name);
  if (!coll) return res.status(404).json({ error: 'Collection not found' });
  
  try {
    coll.ensureVectorIndex(field, options);
    res.json({ message: `Vector index created on field '${field}'` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Insert Document(s)
app.post('/collections/:name/insert', (req, res) => {
  const { name } = req.params;
  const docs = req.body; // Can be object or array
  
  const coll = db.getCollection(name);
  if (!coll) return res.status(404).json({ error: 'Collection not found' });
  
  try {
    const result = coll.insert(docs);
    res.json({ 
      message: 'Inserted successfully', 
      count: Array.isArray(result) ? result.length : 1 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Search (Vector or Hybrid)
app.post('/collections/:name/search', (req, res) => {
  const { name } = req.params;
  const { vector, field, limit, filter } = req.body;
  
  const coll = db.getCollection(name);
  if (!coll) return res.status(404).json({ error: 'Collection not found' });
  
  try {
    let results;
    if (filter) {
      // Hybrid search
      // Signature: hybridSearch(property, queryVector, query, options)
      results = coll.hybridSearch(field, vector, filter, { k: limit || 10 });
    } else {
      // Pure vector search
      results = coll.findNearest(field, vector, limit || 10);
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`LokiVector Server running on http://localhost:${PORT}`);
});
