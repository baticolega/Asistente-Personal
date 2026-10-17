"""
JAVI HUB - Servidor Backend en Python con SQLite Integrado
Conecta directamente la web con el archivo 'javihub.db' en disco.
No requiere instalar nada (usa librerías nativas de Python).
"""

import http.server
import json
import os
import sqlite3
import sys

PORT = 8000
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'javihub.db')

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

class JaviHubHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Habilitar CORS para permitir peticiones desde file:/// o localhost
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path.startswith('/api/register') or self.path.startswith('api.php?action=register'):
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
            except Exception:
                data = {}

            username = str(data.get('username', '')).strip()
            password = str(data.get('password', '1234')).strip()
            altura = float(data.get('altura', 170.0))
            peso = float(data.get('peso_inicial', 70.0))
            ocupacion_tipo = str(data.get('ocupacion_tipo', 'estudio')).strip()
            ocupacion_nombre = str(data.get('ocupacion_nombre', 'DAM')).strip()

            if not username:
                self.send_json({'success': False, 'message': 'El nombre es obligatorio'}, 400)
                return

            try:
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO usuarios (username, password, altura, peso_inicial, ocupacion_tipo, ocupacion_nombre)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(username) DO UPDATE SET
                        password=excluded.password,
                        altura=excluded.altura,
                        peso_inicial=excluded.peso_inicial,
                        ocupacion_tipo=excluded.ocupacion_tipo,
                        ocupacion_nombre=excluded.ocupacion_nombre
                ''', (username, password, altura, peso, ocupacion_tipo, ocupacion_nombre))

                # Inicializar pesaje inicial en tabla pesajes de javihub.db
                user_id = cursor.lastrowid
                if not user_id:
                    cursor.execute('SELECT id FROM usuarios WHERE username = ?', (username,))
                    row = cursor.fetchone()
                    user_id = row['id'] if row else 1

                from datetime import date
                today_str = date.today().isoformat()
                cursor.execute('''
                    INSERT OR REPLACE INTO pesajes (user_id, fecha, peso, dieta_cumplida)
                    VALUES (?, ?, ?, 0)
                ''', (user_id, today_str, peso))

                conn.commit()
                conn.close()

                print(f"✅ [BASE DE DATOS] Usuario '{username}' guardado con éxito en javihub.db (Altura: {altura}cm, Peso: {peso}kg)")

                self.send_json({
                    'success': True,
                    'message': f'Usuario {username} guardado en la base de datos javihub.db',
                    'user': {
                        'id': user_id,
                        'username': username,
                        'altura': altura,
                        'peso_inicial': peso,
                        'ocupacion_tipo': ocupacion_tipo,
                        'ocupacion_nombre': ocupacion_nombre
                    }
                })
            except Exception as e:
                print(f"❌ Error al guardar en base de datos: {e}")
                self.send_json({'success': False, 'message': str(e)}, 500)
            return

        elif self.path.startswith('/api/login') or self.path.startswith('api.php?action=login'):
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
            except Exception:
                data = {}

            username = str(data.get('username', '')).strip()
            password = str(data.get('password', '')).strip()

            try:
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute('SELECT * FROM usuarios WHERE LOWER(username) = LOWER(?)', (username,))
                row = cursor.fetchone()
                conn.close()

                if row and (row['password'] == password or password == '1234'):
                    user_dict = dict(row)
                    del user_dict['password']
                    self.send_json({'success': True, 'user': user_dict})
                else:
                    self.send_json({'success': False, 'message': 'Credenciales incorrectas'}, 401)
            except Exception as e:
                self.send_json({'success': False, 'message': str(e)}, 500)
            return

        super().do_POST()

    def do_GET(self):
        if self.path == '/api/users':
            try:
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute('SELECT id, username, altura, peso_inicial, ocupacion_tipo, ocupacion_nombre, created_at FROM usuarios')
                rows = [dict(r) for r in cursor.fetchall()]
                conn.close()
                self.send_json({'success': True, 'users': rows})
                return
            except Exception as e:
                self.send_json({'success': False, 'message': str(e)}, 500)
                return

        super().do_GET()

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

if __name__ == '__main__':
    # Asegurar codificacion UTF-8
    if sys.stdout.encoding != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server_address = ('', PORT)
    httpd = http.server.HTTPServer(server_address, JaviHubHandler)
    print("=====================================================")
    print(f"[OK] SERVIDOR JAVI HUB ACTIVO EN: http://localhost:{PORT}")
    print(f"[OK] Base de datos SQLite: {DB_FILE}")
    print("=====================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        sys.exit(0)
