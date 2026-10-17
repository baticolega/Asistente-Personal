-- ===================================================================
-- JAVI HUB - CONSULTAS SQL PARA REVISAR DATOS Y USUARIOS
-- Abre este archivo en Visual Studio para consultar lo que necesites
-- ===================================================================

USE javihub_db;

-- 1. VER TODOS LOS USUARIOS Y SUS CARACTERÍSTICAS FÍSICAS Y LABORALES
SELECT id, username, altura, peso_inicial, ocupacion_tipo, ocupacion_nombre, created_at 
FROM usuarios;

-- 2. CALCULAR EL IMC DE PARTIDA DE CADA PERSONA
SELECT 
    username AS 'Usuario',
    altura AS 'Altura (cm)',
    peso_inicial AS 'Peso Inicial (kg)',
    ROUND(peso_inicial / POWER(altura / 100, 2), 2) AS 'IMC',
    CASE 
        WHEN ROUND(peso_inicial / POWER(altura / 100, 2), 2) < 18.5 THEN 'Bajo peso'
        WHEN ROUND(peso_inicial / POWER(altura / 100, 2), 2) < 25.0 THEN 'Normopeso'
        WHEN ROUND(peso_inicial / POWER(altura / 100, 2), 2) < 30.0 THEN 'Sobrepeso ligero'
        ELSE 'Sobrepeso / Obesidad'
    END AS 'Categoría'
FROM usuarios;

-- 3. VER LAS TAREAS PENDIENTES DE CADA USUARIO
SELECT 
    u.username AS 'Usuario',
    t.tipo AS 'Tipo',
    t.titulo AS 'Tarea / Examen',
    t.fecha_limite AS 'Fecha Límite',
    CASE WHEN t.completada = 1 THEN 'Completada ✅' ELSE 'Pendiente ⏳' END AS 'Estado'
FROM tareas t
JOIN usuarios u ON t.user_id = u.id
ORDER BY u.username, t.fecha_limite ASC;

-- 4. VER EL HISTORIAL DE PESAJE Y DIETA
SELECT 
    u.username AS 'Usuario',
    p.fecha AS 'Fecha',
    p.peso AS 'Peso (kg)',
    CASE WHEN p.dieta_cumplida = 1 THEN 'Sí cumplió 🥗' ELSE 'No registrada ❌' END AS 'Dieta'
FROM pesajes p
JOIN usuarios u ON p.user_id = u.id
ORDER BY u.username, p.fecha DESC;

-- 5. VER LOS HOBBIES (PELÍCULAS, JUEGOS Y LIBROS) DE CADA UNO
SELECT 
    u.username AS 'Usuario',
    h.categoria AS 'Categoría',
    h.titulo AS 'Título',
    h.detalle AS 'Detalle',
    CONCAT(h.rating, ' ⭐') AS 'Puntuación',
    CASE WHEN h.completado = 1 THEN 'Terminado ✓' ELSE 'Pendiente' END AS 'Estado'
FROM hobbies h
JOIN usuarios u ON h.user_id = u.id
ORDER BY u.username, h.categoria;
