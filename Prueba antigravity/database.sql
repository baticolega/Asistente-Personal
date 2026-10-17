-- ===================================================================
-- JAVI HUB - Script de Base de Datos MySQL Completa
-- Base de datos personalizada con usuarios, tareas, gimnasio y hobbies
-- ===================================================================

CREATE DATABASE IF NOT EXISTS `javihub_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `javihub_db`;

-- 1. TABLA DE USUARIOS
DROP TABLE IF EXISTS `hobbies`;
DROP TABLE IF EXISTS `pesajes`;
DROP TABLE IF EXISTS `tareas`;
DROP TABLE IF EXISTS `usuarios`;

CREATE TABLE `usuarios` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `altura` DECIMAL(5,2) NOT NULL,              -- Altura en cm (ej: 168.0)
    `peso_inicial` DECIMAL(5,2) NOT NULL,        -- Peso inicial en kg (ej: 63.5)
    `ocupacion_tipo` ENUM('estudio', 'trabajo') NOT NULL DEFAULT 'estudio',
    `ocupacion_nombre` VARCHAR(100) NOT NULL,    -- Nombre del estudio o empleo
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. TABLA DE TAREAS Y RECORDATORIOS
CREATE TABLE `tareas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `categoria` ENUM('ocupacion', 'general') NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `tipo` VARCHAR(50) NOT NULL,                 -- Examen, Entrega, Recordatorio, Evento
    `fecha_limite` DATE NOT NULL,
    `completada` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. TABLA DE PESAJE Y DIETA
CREATE TABLE `pesajes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `fecha` DATE NOT NULL,
    `peso` DECIMAL(5,2) NOT NULL,
    `dieta_cumplida` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `user_fecha` (`user_id`, `fecha`),
    FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. TABLA DE HOBBIES (CINE, JUEGOS, LIBROS)
CREATE TABLE `hobbies` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `categoria` ENUM('pelicula', 'videojuego', 'libro') NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `detalle` VARCHAR(255) NULL,
    `completado` BOOLEAN DEFAULT FALSE,
    `rating` TINYINT DEFAULT 0,
    `prioridad` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===================================================================
-- POBLADO DE PRUEBA: MÚLTIPLES USUARIOS CON CARACTERÍSTICAS DIVERSAS
-- ===================================================================

-- 1. Usuario ANAYA (Estudiante de 2º DAM, peso 63.5kg, altura 168cm)
INSERT INTO `usuarios` (`id`, `username`, `password`, `altura`, `peso_inicial`, `ocupacion_tipo`, `ocupacion_nombre`)
VALUES (1, 'anaya', '1234', 168.0, 63.5, 'estudio', '2º DAM - Desarrollo Multiplataforma');

-- 2. Usuario JAVI (Estudiante de 1º DAM, peso 75kg, altura 178cm)
INSERT INTO `usuarios` (`id`, `username`, `password`, `altura`, `peso_inicial`, `ocupacion_tipo`, `ocupacion_nombre`)
VALUES (2, 'javi', '1234', 178.0, 75.0, 'estudio', '1º DAM');

-- 3. Usuario CARLOS (Trabajador Backend en TechCorp, peso 88kg, altura 185cm)
INSERT INTO `usuarios` (`id`, `username`, `password`, `altura`, `peso_inicial`, `ocupacion_tipo`, `ocupacion_nombre`)
VALUES (3, 'carlos', '1234', 185.0, 88.0, 'trabajo', 'Desarrollador Backend Senior en TechCorp');

-- 4. Usuario LAURA (Estudiante de Diseño UI/UX, peso 55kg, altura 162cm)
INSERT INTO `usuarios` (`id`, `username`, `password`, `altura`, `peso_inicial`, `ocupacion_tipo`, `ocupacion_nombre`)
VALUES (4, 'laura', '1234', 162.0, 55.0, 'estudio', 'Grado Diseño UI/UX y Multimedia');

-- 5. Usuario MARCOS (Trabajador Entrenador Deportivo, peso 71.5kg, altura 174cm)
INSERT INTO `usuarios` (`id`, `username`, `password`, `altura`, `peso_inicial`, `ocupacion_tipo`, `ocupacion_nombre`)
VALUES (5, 'marcos', '1234', 174.0, 71.5, 'trabajo', 'Entrenador Personal & Nutricionista');


-- TAREAS PARA CADA USUARIO
-- Para Anaya (Exámenes y Entregas de 2º DAM)
INSERT INTO `tareas` (`user_id`, `categoria`, `titulo`, `tipo`, `fecha_limite`, `completada`) VALUES
(1, 'ocupacion', 'Examen de Acceso a Datos (Hibernate/JPA)', 'Examen', DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), FALSE),
(1, 'ocupacion', 'Entrega Proyecto Android Studio (Kotlin)', 'Entrega', DATE_ADD(CURRENT_DATE, INTERVAL 6 DAY), FALSE),
(1, 'general', 'Cita con la gestoría del coche', 'Evento', DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), FALSE);

-- Para Javi (1º DAM)
INSERT INTO `tareas` (`user_id`, `categoria`, `titulo`, `tipo`, `fecha_limite`, `completada`) VALUES
(2, 'ocupacion', 'Práctica Lenguaje de Marcas (HTML/CSS)', 'Entrega', DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY), FALSE),
(2, 'ocupacion', 'Examen Programación Java (POO)', 'Examen', DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), FALSE),
(2, 'general', 'Renovar abono mensual de transporte', 'Recordatorio', DATE_ADD(CURRENT_DATE, INTERVAL 8 DAY), FALSE);

-- Para Carlos (Trabajo Backend)
INSERT INTO `tareas` (`user_id`, `categoria`, `titulo`, `tipo`, `fecha_limite`, `completada`) VALUES
(3, 'ocupacion', 'Despliegue de microservicios en Kubernetes AWS', 'Entrega', DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), FALSE),
(3, 'ocupacion', 'Reunión de arquitectura con cliente alemán', 'Evento', DATE_ADD(CURRENT_DATE, INTERVAL 4 DAY), FALSE),
(3, 'general', 'Comprar recambio silla ergonómica de oficina', 'Recordatorio', DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY), FALSE);

-- Para Laura (Diseño UI/UX)
INSERT INTO `tareas` (`user_id`, `categoria`, `titulo`, `tipo`, `fecha_limite`, `completada`) VALUES
(4, 'ocupacion', 'Entrega prototipo interactivo en Figma', 'Entrega', DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), FALSE),
(4, 'ocupacion', 'Examen de Historia del Diseño y Tipografía', 'Examen', DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), FALSE);

-- Para Marcos (Entrenador Personal)
INSERT INTO `tareas` (`user_id`, `categoria`, `titulo`, `tipo`, `fecha_limite`, `completada`) VALUES
(5, 'ocupacion', 'Actualizar dietas y planes de fuerza de clientes', 'Entrega', DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), FALSE),
(5, 'ocupacion', 'Seminario de Biomecánica y Halterofilia', 'Evento', DATE_ADD(CURRENT_DATE, INTERVAL 9 DAY), FALSE);


-- PISAJES Y DIETAS HISTÓRICAS PARA CADA USUARIO
-- Anaya (Progresión: 64.2kg -> 63.8kg -> 63.5kg)
INSERT INTO `pesajes` (`user_id`, `fecha`, `peso`, `dieta_cumplida`) VALUES
(1, DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY), 64.2, TRUE),
(1, DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY), 63.8, TRUE),
(1, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), 63.6, TRUE),
(1, CURRENT_DATE, 63.5, TRUE);

-- Javi (Progresión: 76.5kg -> 75.8kg -> 75.0kg)
INSERT INTO `pesajes` (`user_id`, `fecha`, `peso`, `dieta_cumplida`) VALUES
(2, DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY), 76.5, TRUE),
(2, DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY), 75.8, TRUE),
(2, CURRENT_DATE, 75.0, TRUE);

-- Carlos (Progresión: 91.0kg -> 89.5kg -> 88.0kg)
INSERT INTO `pesajes` (`user_id`, `fecha`, `peso`, `dieta_cumplida`) VALUES
(3, DATE_SUB(CURRENT_DATE, INTERVAL 21 DAY), 91.0, TRUE),
(3, DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY), 89.5, TRUE),
(3, CURRENT_DATE, 88.0, TRUE);

-- Laura (Progresión: 56.5kg -> 55.0kg)
INSERT INTO `pesajes` (`user_id`, `fecha`, `peso`, `dieta_cumplida`) VALUES
(4, DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY), 56.5, TRUE),
(4, CURRENT_DATE, 55.0, TRUE);

-- Marcos (Progresión: 72.5kg -> 71.5kg)
INSERT INTO `pesajes` (`user_id`, `fecha`, `peso`, `dieta_cumplida`) VALUES
(5, DATE_SUB(CURRENT_DATE, INTERVAL 12 DAY), 72.5, TRUE),
(5, CURRENT_DATE, 71.5, TRUE);


-- HOBBIES POR USUARIO
-- Anaya
INSERT INTO `hobbies` (`user_id`, `categoria`, `titulo`, `detalle`, `completado`, `rating`, `prioridad`) VALUES
(1, 'pelicula', 'Interstellar', 'Película favorita de Sci-Fi', TRUE, 5, 1),
(1, 'videojuego', 'Hollow Knight: Silksong', 'Esperando lanzamiento en PC', FALSE, 0, 2),
(1, 'libro', 'El Problema de los Tres Cuerpos', 'Trilogía de Cixin Liu', TRUE, 5, 3),
(1, 'pelicula', 'Dune: Parte 2', 'Cine IMAX', TRUE, 5, 4);

-- Javi
INSERT INTO `hobbies` (`user_id`, `categoria`, `titulo`, `detalle`, `completado`, `rating`, `prioridad`) VALUES
(2, 'pelicula', 'Blade Runner 2049', 'Denis Villeneuve', TRUE, 5, 1),
(2, 'videojuego', 'Elden Ring', 'Steam', TRUE, 5, 2),
(2, 'libro', 'Hábitos Atómicos', 'James Clear', FALSE, 0, 3);

-- Carlos
INSERT INTO `hobbies` (`user_id`, `categoria`, `titulo`, `detalle`, `completado`, `rating`, `prioridad`) VALUES
(3, 'pelicula', 'Oppenheimer', 'Christopher Nolan', TRUE, 5, 1),
(3, 'videojuego', 'Cyberpunk 2077: Phantom Liberty', 'PC RayTracing', TRUE, 5, 2),
(3, 'libro', 'Clean Code', 'Robert C. Martin', TRUE, 4, 3);
