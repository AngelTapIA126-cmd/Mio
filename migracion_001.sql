-- ============================================================
-- Migración 001: eliminar rol Repartidor + tipo de entrega
-- ------------------------------------------------------------
-- - pedidos.tipo_entrega: 'domicilio' | 'recoger'
-- - pedidos.direccion_envio pasa a ser opcional (NULL en recoger)
-- - pedidos.repartidor_asignado: el negocio marca "ya tengo repartidor"
-- - Se elimina pedidos.repartidor_id y la tabla repartidores
--
-- ⚠️  BORRA todos los repartidores registrados. Haz un respaldo antes
--     de correrla en producción.
-- Uso: mysql -u root drivergo < migracion_001.sql
-- ============================================================

USE drivergo;

-- 1) Nuevas columnas y dirección opcional
ALTER TABLE pedidos
  ADD COLUMN tipo_entrega ENUM('domicilio','recoger') NOT NULL DEFAULT 'domicilio' AFTER repartidor_id,
  MODIFY direccion_envio VARCHAR(255) NULL,
  ADD COLUMN repartidor_asignado TINYINT(1) NOT NULL DEFAULT 0 AFTER tipo_entrega,
  ADD COLUMN repartidor_asignado_at DATETIME NULL AFTER repartidor_asignado;

-- 2) Los pedidos que ya tenían repartidor quedan marcados como asignados
UPDATE pedidos SET repartidor_asignado = 1 WHERE repartidor_id IS NOT NULL;

-- 3) Quitar la llave foránea de repartidor_id (el nombre puede variar
--    entre servidores, así que se busca en information_schema)
SET @fk := (
  SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pedidos'
    AND COLUMN_NAME = 'repartidor_id' AND REFERENCED_TABLE_NAME = 'repartidores'
  LIMIT 1
);
SET @sql := IF(@fk IS NULL, 'SELECT 1', CONCAT('ALTER TABLE pedidos DROP FOREIGN KEY `', @fk, '`'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4) Quitar la columna y la tabla
ALTER TABLE pedidos DROP COLUMN repartidor_id;
DROP TABLE IF EXISTS repartidores;
