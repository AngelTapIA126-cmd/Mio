-- DriverGo - esquema MySQL/MariaDB reconstruido a partir de server.js y el frontend
-- Uso: mysql -u root < schema.sql   (o importarlo desde phpMyAdmin)

CREATE DATABASE IF NOT EXISTS drivergo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE drivergo;

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  telefono VARCHAR(20) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS negocios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  direccion VARCHAR(255) NOT NULL,
  telefono VARCHAR(20) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  imagen VARCHAR(500),
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS repartidores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  telefono VARCHAR(20) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  tipo_vehiculo VARCHAR(50) NOT NULL,
  licencia_frente VARCHAR(500),
  licencia_trasera VARCHAR(500),
  disponible TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  negocio_id INT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  descripcion TEXT,
  unidades INT DEFAULT 0,
  imagen VARCHAR(500),
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (negocio_id) REFERENCES negocios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  negocio_id INT NOT NULL,
  repartidor_id INT NULL,
  direccion_envio VARCHAR(255) NOT NULL,
  tipo_pago VARCHAR(20) DEFAULT 'efectivo',
  subtotal DECIMAL(10,2) NOT NULL,
  costo_envio DECIMAL(10,2) DEFAULT 30,
  impuestos DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  estado VARCHAR(30) DEFAULT 'pendiente',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (negocio_id) REFERENCES negocios(id),
  FOREIGN KEY (repartidor_id) REFERENCES repartidores(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pedido_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
  FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(150),
  imagen VARCHAR(500) NOT NULL,
  negocio_id INT NULL,
  orden INT DEFAULT 0,
  activo TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (negocio_id) REFERENCES negocios(id)
) ENGINE=InnoDB;

-- Admin inicial: usuario "admin", contraseña "admin123" (cámbiala después)
INSERT IGNORE INTO admins (usuario, password, nombre)
VALUES ('admin', '$2b$10$PZWrtuyVoQaZVmQbMykou.9HkAZ1KB.5bjR.55x.gAd6OdnoZRVDS', 'Administrador');
