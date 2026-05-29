const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = 'drivergo_secret_2024';

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

// Función para subir imagen a Supabase
async function subirImagen(file) {
  if (!file) return null;
  const filename = Date.now() + path.extname(file.originalname);
  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });
  if (error) throw error;
  const { data: urlData } = supabase.storage
    .from('uploads')
    .getPublicUrl(filename);
  return urlData.publicUrl;
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Conexión MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'drivergo',
  port: process.env.DB_PORT || 3306
});

db.connect(err => {
  if (err) { console.error('❌ Error BD:', err); return; }
  console.log('✅ Base de datos MySQL conectada');
});

// Multer config - memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware auth
function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// Helper query
function query(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

// ==================== CLIENTES ====================

app.post('/api/clientes/registro', async (req, res) => {
  const { nombres, apellidos, telefono, password } = req.body;
  if (!nombres || !apellidos || !telefono || !password)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO clientes (nombres, apellidos, telefono, password) VALUES (?,?,?,?)',
      [nombres, apellidos, telefono, hash]
    );
    const token = jwt.sign({ id: result.insertId, tipo: 'cliente' }, SECRET);
    res.json({ ok: true, token, id: result.insertId, nombres });
  } catch (err) {
    res.status(400).json({ error: 'El teléfono ya está registrado' });
  }
});

app.post('/api/clientes/login', async (req, res) => {
  const { telefono, password } = req.body;
  try {
    const rows = await query('SELECT * FROM clientes WHERE telefono = ?', [telefono]);
    if (!rows.length) return res.status(400).json({ error: 'Teléfono o contraseña incorrectos' });
    const ok = await bcrypt.compare(password, rows[0].password);
    if (!ok) return res.status(400).json({ error: 'Teléfono o contraseña incorrectos' });
    const token = jwt.sign({ id: rows[0].id, tipo: 'cliente' }, SECRET);
    res.json({ ok: true, token, id: rows[0].id, nombres: rows[0].nombres });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/clientes/perfil', authMiddleware, async (req, res) => {
  try {
    const rows = await query('SELECT id, nombres, apellidos, telefono, created_at FROM clientes WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    const pedidos = await query('SELECT COUNT(*) as total FROM pedidos WHERE cliente_id = ?', [req.user.id]);
    res.json({ ...rows[0], total_pedidos: pedidos[0].total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== NEGOCIOS ====================

app.post('/api/negocios/registro', upload.single('imagen'), async (req, res) => {
  const { nombre, tipo, direccion, telefono, password } = req.body;
  if (!nombre || !tipo || !direccion || !telefono || !password)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const imagen = await subirImagen(req.file);
    const result = await query(
      'INSERT INTO negocios (nombre, tipo, direccion, telefono, password, imagen) VALUES (?,?,?,?,?,?)',
      [nombre, tipo, direccion, telefono, hash, imagen]
    );
    const token = jwt.sign({ id: result.insertId, tipo: 'negocio' }, SECRET);
    res.json({ ok: true, token, id: result.insertId, nombre });
  } catch (err) {
    res.status(400).json({ error: 'El teléfono ya está registrado' });
  }
});

app.post('/api/negocios/login', async (req, res) => {
  const { telefono, password } = req.body;
  try {
    const rows = await query('SELECT * FROM negocios WHERE telefono = ?', [telefono]);
    if (!rows.length) return res.status(400).json({ error: 'Teléfono o contraseña incorrectos' });
    const ok = await bcrypt.compare(password, rows[0].password);
    if (!ok) return res.status(400).json({ error: 'Teléfono o contraseña incorrectos' });
    const token = jwt.sign({ id: rows[0].id, tipo: 'negocio' }, SECRET);
    res.json({ ok: true, token, id: rows[0].id, nombre: rows[0].nombre });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/negocios/perfil', authMiddleware, async (req, res) => {
  try {
    const rows = await query('SELECT id, nombre, tipo, direccion, telefono, imagen, created_at FROM negocios WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Negocio no encontrado' });
    const productos = await query('SELECT COUNT(*) as total FROM productos WHERE negocio_id = ? AND activo = 1', [req.user.id]);
    const pedidos = await query('SELECT COUNT(*) as total FROM pedidos WHERE negocio_id = ?', [req.user.id]);
    res.json({ ...rows[0], total_productos: productos[0].total, total_pedidos: pedidos[0].total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/negocios', async (req, res) => {
  try {
    const rows = await query('SELECT id, nombre, tipo, direccion, imagen FROM negocios WHERE activo = 1', []);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/negocios/tipo/:tipo', async (req, res) => {
  try {
    const rows = await query('SELECT id, nombre, tipo, direccion, imagen FROM negocios WHERE tipo = ? AND activo = 1', [req.params.tipo]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== PRODUCTOS ====================

app.get('/api/productos/:negocio_id', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM productos WHERE negocio_id = ? AND activo = 1', [req.params.negocio_id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/productos', authMiddleware, upload.single('imagen'), async (req, res) => {
  const { nombre, precio, descripcion, unidades } = req.body;
  const negocio_id = req.user.id;
  try {
    const imagen = await subirImagen(req.file);
    const result = await query(
      'INSERT INTO productos (negocio_id, nombre, precio, descripcion, unidades, imagen) VALUES (?,?,?,?,?,?)',
      [negocio_id, nombre, precio, descripcion, unidades, imagen]
    );
    res.json({ ok: true, id: result.insertId });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/productos/:id', authMiddleware, upload.single('imagen'), async (req, res) => {
  const { nombre, precio, descripcion, unidades, imagen_actual } = req.body;
  try {
    const imagen = req.file ? await subirImagen(req.file) : imagen_actual;
    await query(
      'UPDATE productos SET nombre=?, precio=?, descripcion=?, unidades=?, imagen=? WHERE id=?',
      [nombre, precio, descripcion, unidades, imagen, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/productos/:id', authMiddleware, async (req, res) => {
  try {
    await query('UPDATE productos SET activo = 0 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ==================== REPARTIDORES ====================

app.post('/api/repartidores/registro', upload.fields([
  { name: 'licencia_frente', maxCount: 1 },
  { name: 'licencia_trasera', maxCount: 1 }
]), async (req, res) => {
  const { nombres, apellidos, telefono, password, tipo_vehiculo } = req.body;
  if (!nombres || !apellidos || !telefono || !password || !tipo_vehiculo)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const licencia_frente = await subirImagen(req.files?.licencia_frente?.[0]);
    const licencia_trasera = await subirImagen(req.files?.licencia_trasera?.[0]);
    const result = await query(
      'INSERT INTO repartidores (nombres, apellidos, telefono, password, tipo_vehiculo, licencia_frente, licencia_trasera) VALUES (?,?,?,?,?,?,?)',
      [nombres, apellidos, telefono, hash, tipo_vehiculo, licencia_frente, licencia_trasera]
    );
    const token = jwt.sign({ id: result.insertId, tipo: 'repartidor' }, SECRET);
    res.json({ ok: true, token, id: result.insertId, nombres });
  } catch (err) {
    res.status(400).json({ error: 'El teléfono ya está registrado' });
  }
});

app.post('/api/repartidores/login', async (req, res) => {
  const { telefono, password } = req.body;
  try {
    const rows = await query('SELECT * FROM repartidores WHERE telefono = ?', [telefono]);
    if (!rows.length) return res.status(400).json({ error: 'Teléfono o contraseña incorrectos' });
    const ok = await bcrypt.compare(password, rows[0].password);
    if (!ok) return res.status(400).json({ error: 'Teléfono o contraseña incorrectos' });
    const token = jwt.sign({ id: rows[0].id, tipo: 'repartidor' }, SECRET);
    res.json({ ok: true, token, id: rows[0].id, nombres: rows[0].nombres });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/repartidores/disponibles', authMiddleware, async (req, res) => {
  try {
    const rows = await query('SELECT id, nombres, apellidos, tipo_vehiculo, disponible FROM repartidores WHERE disponible = 1', []);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/repartidores/perfil', authMiddleware, async (req, res) => {
  try {
    const rows = await query('SELECT id, nombres, apellidos, telefono, tipo_vehiculo, created_at FROM repartidores WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Repartidor no encontrado' });
    const pedidos = await query('SELECT COUNT(*) as total FROM pedidos WHERE repartidor_id = ?', [req.user.id]);
    const entregados = await query('SELECT COUNT(*) as total FROM pedidos WHERE repartidor_id = ? AND estado = "entregado"', [req.user.id]);
    res.json({ ...rows[0], total_pedidos: pedidos[0].total, total_entregados: entregados[0].total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/repartidores/disponibilidad', authMiddleware, async (req, res) => {
  const { disponible } = req.body;
  try {
    await query('UPDATE repartidores SET disponible = ? WHERE id = ?', [disponible, req.user.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== PEDIDOS ====================

app.post('/api/pedidos', authMiddleware, async (req, res) => {
  const { negocio_id, direccion_envio, items, subtotal, total } = req.body;
  const cliente_id = req.user.id;
  const costo_envio = 30;
  const impuestos = parseFloat((subtotal * 0.02).toFixed(2));
  try {
    const result = await query(
      'INSERT INTO pedidos (cliente_id, negocio_id, direccion_envio, subtotal, costo_envio, impuestos, total) VALUES (?,?,?,?,?,?,?)',
      [cliente_id, negocio_id, direccion_envio, subtotal, costo_envio, impuestos, total]
    );
    const pedido_id = result.insertId;
    for (const item of items) {
      await query(
        'INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?,?,?,?)',
        [pedido_id, item.producto_id, item.cantidad, item.precio]
      );
    }
    res.json({ ok: true, pedido_id });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/pedidos/cliente', authMiddleware, async (req, res) => {
  try {
    const rows = await query(
      'SELECT p.*, n.nombre as negocio_nombre FROM pedidos p JOIN negocios n ON p.negocio_id = n.id WHERE p.cliente_id = ? ORDER BY p.created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/pedidos/negocio', authMiddleware, async (req, res) => {
  try {
    const rows = await query(
      'SELECT p.*, c.nombres as cliente_nombre, c.apellidos as cliente_apellidos FROM pedidos p JOIN clientes c ON p.cliente_id = c.id WHERE p.negocio_id = ? ORDER BY p.created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/pedidos/disponibles', authMiddleware, async (req, res) => {
  try {
    const rows = await query(
      'SELECT p.*, c.nombres as cliente_nombre, n.nombre as negocio_nombre FROM pedidos p JOIN clientes c ON p.cliente_id = c.id JOIN negocios n ON p.negocio_id = n.id WHERE p.estado = ? AND p.repartidor_id IS NULL ORDER BY p.created_at DESC',
      ['buscando_repartidor']
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/pedidos/repartidor', authMiddleware, async (req, res) => {
  try {
    const rows = await query(
      'SELECT p.*, c.nombres as cliente_nombre, n.nombre as negocio_nombre FROM pedidos p JOIN clientes c ON p.cliente_id = c.id JOIN negocios n ON p.negocio_id = n.id WHERE p.repartidor_id = ? ORDER BY p.created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/pedidos/:id', authMiddleware, async (req, res) => {
  try {
    const rows = await query(
      'SELECT p.*, c.nombres as cliente_nombre, c.apellidos as cliente_apellidos, n.nombre as negocio_nombre FROM pedidos p JOIN clientes c ON p.cliente_id = c.id JOIN negocios n ON p.negocio_id = n.id WHERE p.id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Pedido no encontrado' });
    const items = await query(
      'SELECT pi.*, prod.nombre, prod.imagen FROM pedido_items pi JOIN productos prod ON pi.producto_id = prod.id WHERE pi.pedido_id = ?',
      [req.params.id]
    );
    res.json({ ...rows[0], items });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/pedidos/:id/estado', authMiddleware, async (req, res) => {
  const { estado, repartidor_id } = req.body;
  try {
    if (repartidor_id) {
      await query('UPDATE pedidos SET estado = ?, repartidor_id = ? WHERE id = ?', [estado, repartidor_id, req.params.id]);
    } else {
      await query('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, req.params.id]);
    }
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ==================== ADMIN ====================

app.post('/api/admin/login', async (req, res) => {
  const { usuario, password } = req.body;
  try {
    const rows = await query('SELECT * FROM admins WHERE usuario = ?', [usuario]);
    if (!rows.length) return res.status(400).json({ error: 'Usuario o contraseña incorrectos' });
    const ok = await bcrypt.compare(password, rows[0].password);
    if (!ok) return res.status(400).json({ error: 'Usuario o contraseña incorrectos' });
    const token = jwt.sign({ id: rows[0].id, tipo: 'admin' }, SECRET);
    res.json({ ok: true, token, id: rows[0].id, nombre: rows[0].nombre });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/negocios', authMiddleware, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM negocios', []);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/negocios/:id', authMiddleware, async (req, res) => {
  const { activo } = req.body;
  try {
    await query('UPDATE negocios SET activo = ? WHERE id = ?', [activo, req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/clientes', authMiddleware, async (req, res) => {
  try {
    const rows = await query('SELECT id, nombres, apellidos, telefono, created_at FROM clientes', []);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/repartidores', authMiddleware, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM repartidores', []);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/repartidores/:id', authMiddleware, async (req, res) => {
  const { disponible } = req.body;
  try {
    await query('UPDATE repartidores SET disponible = ? WHERE id = ?', [disponible, req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/pedidos', authMiddleware, async (req, res) => {
  try {
    const rows = await query(
      `SELECT p.*, c.nombres as cliente_nombre, n.nombre as negocio_nombre 
       FROM pedidos p 
       JOIN clientes c ON p.cliente_id = c.id 
       JOIN negocios n ON p.negocio_id = n.id 
       ORDER BY p.created_at DESC`, []
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/banners', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM banners WHERE activo = 1 ORDER BY orden ASC', []);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/banners', authMiddleware, upload.single('imagen'), async (req, res) => {
  const { titulo, negocio_id, orden } = req.body;
  try {
    const imagen = await subirImagen(req.file);
    if (!imagen) return res.status(400).json({ error: 'La imagen es requerida' });
    const result = await query(
      'INSERT INTO banners (titulo, imagen, negocio_id, orden) VALUES (?,?,?,?)',
      [titulo, imagen, negocio_id || null, orden || 0]
    );
    res.json({ ok: true, id: result.insertId });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/admin/banners/:id', authMiddleware, async (req, res) => {
  try {
    await query('UPDATE banners SET activo = 0 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/stats', authMiddleware, async (req, res) => {
  try {
    const clientes = await query('SELECT COUNT(*) as total FROM clientes', []);
    const negocios = await query('SELECT COUNT(*) as total FROM negocios', []);
    const repartidores = await query('SELECT COUNT(*) as total FROM repartidores', []);
    const pedidos = await query('SELECT COUNT(*) as total FROM pedidos', []);
    const ingresos = await query('SELECT SUM(total) as total FROM pedidos WHERE estado = "entregado"', []);
    res.json({
      clientes: clientes[0].total,
      negocios: negocios[0].total,
      repartidores: repartidores[0].total,
      pedidos: pedidos[0].total,
      ingresos: ingresos[0].total || 0
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 DriverGo servidor corriendo en puerto ${PORT}`);
});