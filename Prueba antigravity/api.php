<?php
/**
 * JAVI HUB - Backend API en PHP para MySQL
 * Diseñado para funcionar directamente con XAMPP / Apache / MariaDB.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuración de conexión MySQL (estándar de XAMPP)
$host = 'localhost';
$dbname = 'javihub_db';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    // Si la BD aún no está creada, intentamos conectarnos sin especificar base de datos
    try {
        $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass);
    } catch (PDOException $e2) {
        $pdo = null;
    }
}

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true) ?? [];

if ($action === 'ping') {
    echo json_encode([
        'status' => 'ok',
        'mysql_connected' => ($pdo !== null)
    ]);
    exit;
}

if (!$pdo) {
    echo json_encode([
        'success' => false,
        'message' => 'No se pudo conectar con el servidor MySQL. Comprueba que MySQL está iniciado en XAMPP.'
    ]);
    exit;
}

// REGISTRO DE USUARIO
if ($action === 'register') {
    $username = trim($input['username'] ?? '');
    $password = trim($input['password'] ?? '');
    $altura = floatval($input['altura'] ?? 175);
    $peso = floatval($input['peso_inicial'] ?? 70);
    $ocupacion_tipo = in_array($input['ocupacion_tipo'] ?? '', ['estudio', 'trabajo']) ? $input['ocupacion_tipo'] : 'estudio';
    $ocupacion_nombre = trim($input['ocupacion_nombre'] ?? 'DAM');

    if (empty($username) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'El nombre y la contraseña son obligatorios.']);
        exit;
    }

    // Comprobar si ya existe
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Ese nombre de usuario ya está registrado.']);
        exit;
    }

    // Insertar usuario
    $insert = $pdo->prepare("
        INSERT INTO usuarios (username, password, altura, peso_inicial, ocupacion_tipo, ocupacion_nombre)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $insert->execute([$username, $password, $altura, $peso, $ocupacion_tipo, $ocupacion_nombre]);

    $newId = $pdo->lastInsertId();

    echo json_encode([
        'success' => true,
        'message' => 'Usuario registrado con éxito en MySQL',
        'user' => [
            'id' => $newId,
            'username' => $username,
            'altura' => $altura,
            'peso_inicial' => $peso,
            'ocupacion_tipo' => $ocupacion_tipo,
            'ocupacion_nombre' => $ocupacion_nombre
        ]
    ]);
    exit;
}

// INICIO DE SESIÓN
if ($action === 'login') {
    $username = trim($input['username'] ?? '');
    $password = trim($input['password'] ?? '');

    if (empty($username) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Debes rellenar todos los campos.']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id, username, password, altura, peso_inicial, ocupacion_tipo, ocupacion_nombre FROM usuarios WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && $user['password'] === $password) {
        unset($user['password']); // No enviar la contraseña al cliente
        echo json_encode([
            'success' => true,
            'message' => 'Inicio de sesión correcto',
            'user' => $user
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Usuario o contraseña incorrectos.'
        ]);
    }
    exit;
}

echo json_encode(['success' => false, 'message' => 'Acción no válida.']);
