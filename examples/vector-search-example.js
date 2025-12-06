/**
 * LokiJS Vector Search Example
 *
 * This example demonstrates how to use the HNSW vector search plugin
 * for semantic search, similarity search, and hybrid queries.
 */

// Load modules
var loki = require('../src/lokijs.js');
var HNSWIndex = require('../src/loki-hnsw-index.js');
require('../src/loki-vector-plugin.js');

// ============================================================================
// Example 1: Basic Vector Search
// ============================================================================
console.log('\n=== Example 1: Basic Vector Search ===\n');

var db = new loki('vectors.db');

// Create a collection for documents with embeddings
var documents = db.addCollection('documents');

// Insert some documents with embedding vectors
// In real scenarios, these would come from an embedding model like OpenAI, Sentence-Transformers, etc.
var docs = [
  { title: 'JavaScript Basics', content: 'Learn JavaScript fundamentals', embedding: [0.8, 0.2, 0.1, 0.3] },
  { title: 'Python Tutorial', content: 'Python programming guide', embedding: [0.7, 0.3, 0.2, 0.4] },
  { title: 'React Guide', content: 'Building UIs with React', embedding: [0.85, 0.15, 0.1, 0.35] },
  { title: 'Machine Learning', content: 'Introduction to ML', embedding: [0.3, 0.8, 0.7, 0.2] },
  { title: 'Deep Learning', content: 'Neural networks guide', embedding: [0.25, 0.85, 0.75, 0.15] },
  { title: 'Data Science', content: 'Data analysis fundamentals', embedding: [0.4, 0.7, 0.6, 0.3] }
];

docs.forEach(function (doc) {
  documents.insert(doc);
});

// Create vector index on the embedding property
documents.ensureVectorIndex('embedding', {
  M: 16,                          // Max connections per node
  efConstruction: 100,            // Construction search size
  efSearch: 50,                   // Query search size
  distanceFunction: 'euclidean'   // Distance metric
});

// Search for documents similar to a query vector
// This simulates searching for "JavaScript frameworks"
var queryVector = [0.82, 0.18, 0.12, 0.32];

var results = documents.findNearest('embedding', queryVector, {
  k: 3,                // Return top 3 results
  includeDistance: true
});

console.log('Query: "JavaScript frameworks" (simulated vector)');
console.log('Top 3 nearest documents:');
results.forEach(function (doc, i) {
  console.log((i + 1) + '. ' + doc.title + ' (distance: ' + doc.$distance.toFixed(4) + ', similarity: ' + doc.$similarity.toFixed(4) + ')');
});

// ============================================================================
// Example 2: Find Similar Documents
// ============================================================================
console.log('\n=== Example 2: Find Similar Documents ===\n');

// Find documents similar to "Machine Learning"
var mlDoc = documents.findOne({ title: 'Machine Learning' });
var similar = documents.findSimilar('embedding', mlDoc, { k: 2 });

console.log('Documents similar to "Machine Learning":');
similar.forEach(function (doc, i) {
  console.log((i + 1) + '. ' + doc.title);
});

// ============================================================================
// Example 3: Filtered Vector Search
// ============================================================================
console.log('\n=== Example 3: Filtered Vector Search ===\n');

// Add category to documents
documents.findAndUpdate({}, function (doc) {
  if (doc.title.includes('JavaScript') || doc.title.includes('React')) {
    doc.category = 'frontend';
  } else if (doc.title.includes('Machine') || doc.title.includes('Deep') || doc.title.includes('Data')) {
    doc.category = 'ai';
  } else {
    doc.category = 'general';
  }
});

// Search only within 'ai' category
var aiQuery = [0.35, 0.75, 0.65, 0.25]; // Similar to AI topics
var aiResults = documents.findNearest('embedding', aiQuery, {
  k: 5,
  filter: { category: 'ai' }
});

console.log('AI-related documents nearest to query:');
aiResults.forEach(function (doc, i) {
  console.log((i + 1) + '. ' + doc.title + ' (' + doc.category + ')');
});

// ============================================================================
// Example 4: Hybrid Search
// ============================================================================
console.log('\n=== Example 4: Hybrid Search ===\n');

// Hybrid search combines vector similarity with traditional query matching
var hybridResults = documents.hybridSearch(
  'embedding',
  [0.5, 0.5, 0.4, 0.3],           // Query vector
  { category: 'ai' },              // Traditional query filter
  {
    k: 3,
    vectorWeight: 0.7              // 70% vector similarity, 30% query match
  }
);

console.log('Hybrid search results (vector + category filter):');
hybridResults.forEach(function (doc, i) {
  console.log((i + 1) + '. ' + doc.title +
    ' (score: ' + doc.$score.toFixed(3) +
    ', vectorScore: ' + doc.$vectorScore.toFixed(3) +
    ', queryMatch: ' + doc.$queryMatch + ')');
});

// ============================================================================
// Example 5: Using Different Distance Functions
// ============================================================================
console.log('\n=== Example 5: Distance Functions ===\n');

var db2 = new loki('cosine.db');
var items = db2.addCollection('items');

// Insert normalized vectors (for cosine similarity)
items.insert({ name: 'A', vec: normalize([1, 0, 0]) });
items.insert({ name: 'B', vec: normalize([1, 1, 0]) });
items.insert({ name: 'C', vec: normalize([0, 1, 0]) });
items.insert({ name: 'D', vec: normalize([0, 1, 1]) });
items.insert({ name: 'E', vec: normalize([0, 0, 1]) });

// Create index with cosine distance
items.ensureVectorIndex('vec', {
  distanceFunction: 'cosine'
});

// Search using cosine similarity
var cosineResults = items.findNearest('vec', normalize([1, 0.5, 0]), {
  k: 3,
  includeDistance: true
});

console.log('Cosine similarity search for [1, 0.5, 0]:');
cosineResults.forEach(function (item, i) {
  console.log((i + 1) + '. ' + item.name + ' (cosine distance: ' + item.$distance.toFixed(4) + ')');
});

// Helper function to normalize vectors
function normalize(vec) {
  var sum = 0;
  for (var i = 0; i < vec.length; i++) {
    sum += vec[i] * vec[i];
  }
  var norm = Math.sqrt(sum);
  return vec.map(function (v) { return v / norm; });
}

// ============================================================================
// Example 6: Persistence
// ============================================================================
console.log('\n=== Example 6: Persistence ===\n');

// Serialize database (including vector indices)
var serialized = db.serialize();
console.log('Database serialized (' + serialized.length + ' bytes)');

// Create new database and restore
var db3 = new loki('restored.db');
db3.loadJSON(serialized);

// Vector index is automatically restored
var restoredDocs = db3.getCollection('documents');
var restoredResults = restoredDocs.findNearest('embedding', queryVector, { k: 1 });

console.log('Search after restore: ' + restoredResults[0].title);

// ============================================================================
// Example 7: Index Statistics
// ============================================================================
console.log('\n=== Example 7: Index Statistics ===\n');

var stats = documents.getVectorIndexStats('embedding');
console.log('Vector Index Statistics:');
console.log('  - Node count: ' + stats.nodeCount);
console.log('  - Dimensions: ' + stats.dimensions);
console.log('  - Max level: ' + stats.maxLevel);
console.log('  - M (connections): ' + stats.M);
console.log('  - efConstruction: ' + stats.efConstruction);
console.log('  - efSearch: ' + stats.efSearch);
console.log('  - Distance function: ' + stats.distanceFunction);
console.log('  - Layers:');
stats.layers.forEach(function (layer) {
  console.log('    Level ' + layer.level + ': ' + layer.nodes + ' nodes, ' +
    layer.connections + ' connections (avg: ' + layer.avgConnections + ')');
});

// ============================================================================
// Example 8: Real-World Use Case - Product Recommendations
// ============================================================================
console.log('\n=== Example 8: Product Recommendations ===\n');

var shopDb = new loki('shop.db');
var products = shopDb.addCollection('products');

// Simulate product embeddings (in reality, these come from product descriptions/images)
var productList = [
  { name: 'Running Shoes', price: 99, category: 'sports', embedding: [0.9, 0.8, 0.1, 0.2] },
  { name: 'Tennis Racket', price: 150, category: 'sports', embedding: [0.85, 0.75, 0.15, 0.25] },
  { name: 'Yoga Mat', price: 30, category: 'fitness', embedding: [0.7, 0.9, 0.3, 0.1] },
  { name: 'Dumbbells', price: 50, category: 'fitness', embedding: [0.75, 0.85, 0.25, 0.15] },
  { name: 'Basketball', price: 25, category: 'sports', embedding: [0.88, 0.78, 0.12, 0.22] },
  { name: 'Resistance Bands', price: 15, category: 'fitness', embedding: [0.72, 0.88, 0.28, 0.12] },
  { name: 'Football', price: 20, category: 'sports', embedding: [0.87, 0.77, 0.13, 0.23] },
  { name: 'Protein Powder', price: 45, category: 'nutrition', embedding: [0.5, 0.6, 0.8, 0.4] }
];

productList.forEach(function (p) {
  products.insert(p);
});

products.ensureVectorIndex('embedding');

// User viewed "Running Shoes" - find similar products
var viewedProduct = products.findOne({ name: 'Running Shoes' });
var recommendations = products.findSimilar('embedding', viewedProduct, {
  k: 3,
  includeDistance: true
});

console.log('You viewed: ' + viewedProduct.name + ' ($' + viewedProduct.price + ')');
console.log('You might also like:');
recommendations.forEach(function (p, i) {
  console.log('  ' + (i + 1) + '. ' + p.name + ' ($' + p.price + ') - ' + p.category);
});

// Find products similar to user's interests (combined vector of viewed items)
console.log('\nPersonalized recommendations based on fitness interest:');
var fitnessQuery = [0.73, 0.87, 0.27, 0.13]; // Fitness-oriented query
var personalRecs = products.findNearest('embedding', fitnessQuery, {
  k: 3,
  filter: { price: { $lte: 50 } } // Budget filter
});

personalRecs.forEach(function (p, i) {
  console.log('  ' + (i + 1) + '. ' + p.name + ' ($' + p.price + ')');
});

console.log('\n=== All Examples Complete ===\n');
