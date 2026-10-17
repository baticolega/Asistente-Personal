/**
 * JAVI HUB - Script Compartido
 * Gestión de autenticación, aislamiento por usuario, personalización de interfaz y persistencia.
 */

function getFutureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

function getPastDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// 1. GESTOR DE ALMACENAMIENTO ESTRICTAMENTE AISLADO POR USUARIO
const Storage = {
  // Obtiene el prefijo del usuario activo para que ningún dato se filtre entre cuentas
  getUserPrefix: () => {
    try {
      const rawUser = localStorage.getItem('javihub_current_user') || sessionStorage.getItem('javihub_current_user');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u && u.username) return `u_${u.username.toLowerCase().replace(/[^a-z0-9]/g, '')}_`;
      }
    } catch (e) {}
    return '';
  },

  get: (key, defaultVal = null) => {
    try {
      const uPrefix = Storage.getUserPrefix();
      // 1. Si hay un usuario activo, consultar ÚNICAMENTE sus datos aislados
      if (uPrefix) {
        const userSpecific = localStorage.getItem('javihub_' + uPrefix + key);
        if (userSpecific !== null) return JSON.parse(userSpecific);
        return defaultVal; // Nunca caer en la clave global de otros usuarios
      }
      // 2. Si no hay usuario activo, usar la clave global
      const globalData = localStorage.getItem('javihub_' + key);
      return globalData !== null ? JSON.parse(globalData) : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  },

  set: (key, val) => {
    try {
      const json = JSON.stringify(val);
      const uPrefix = Storage.getUserPrefix();
      if (uPrefix) {
        localStorage.setItem('javihub_' + uPrefix + key, json);
      } else {
        localStorage.setItem('javihub_' + key, json);
      }
    } catch (e) {
      console.warn('Storage.set error:', e);
    }
  }
};

window.Storage = Storage;

// 2. SISTEMA DE AUTENTICACIÓN Y MOLDURA DE USUARIOS
const Auth = {
  KEY: 'javihub_current_user',

  getUser: () => {
    try {
      // 1. Prioridad: Si viene por parámetro URL (?u=nombre), forzar la carga de ese usuario
      const urlParams = new URLSearchParams(window.location.search);
      const urlUser = urlParams.get('u');
      if (urlUser) {
        const localUsers = Storage.get('local_users_db', []);
        const found = localUsers.find(u => u.username && u.username.toLowerCase() === urlUser.toLowerCase());
        if (found) {
          Auth.setUser(found);
          return found;
        }
      }

      // 2. Intentar desde sesión guardada en localStorage o sessionStorage
      let raw = localStorage.getItem(Auth.KEY) || sessionStorage.getItem(Auth.KEY);
      if (raw) return JSON.parse(raw);

      // 3. Fallback: anaya por defecto si no hay sesión
      const localUsers = Storage.get('local_users_db', []);
      if (localUsers.length > 0) {
        Auth.setUser(localUsers[0]);
        return localUsers[0];
      }

      return null;
    } catch (e) {
      return null;
    }
  },

  setUser: (user) => {
    try {
      const json = JSON.stringify(user);
      localStorage.setItem(Auth.KEY, json);
      sessionStorage.setItem(Auth.KEY, json);
    } catch (e) {}
  },

  logout: () => {
    try {
      localStorage.removeItem(Auth.KEY);
      sessionStorage.removeItem(Auth.KEY);
    } catch (e) {}
    window.location.href = 'login.html';
  },

  // Inicializa datos personalizados del usuario con SUS VALORES EXACTOS
  initUserData: (user) => {
    const uPrefix = `u_${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}_`;
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Pesaje: Inicializar con el peso EXACTO que el usuario introdujo al registrarse
    const weightVal = parseFloat(user.peso_inicial) || 70.0;
    const initialWeights = [
      { id: Date.now(), date: todayStr, weight: weightVal }
    ];
    localStorage.setItem('javihub_' + uPrefix + 'gym_weights', JSON.stringify(initialWeights));

    // 2. Dieta fresca
    localStorage.setItem('javihub_' + uPrefix + 'gym_diet_logs', JSON.stringify({}));

    // 3. Tareas adaptadas a su tipo de ocupación y su nombre real
    let starterTasks = [];
    if (user.ocupacion_tipo === 'trabajo') {
      starterTasks = [
        { id: 101, title: `Reunión de coordinación en ${user.ocupacion_nombre}`, type: 'Evento', date: getFutureDate(1), completed: false },
        { id: 102, title: `Entrega de avances y planificación`, type: 'Entrega', date: getFutureDate(4), completed: false }
      ];
    } else {
      starterTasks = [
        { id: 101, title: `Examen de ${user.ocupacion_nombre}`, type: 'Examen', date: getFutureDate(2), completed: false },
        { id: 102, title: `Práctica y entregas de ${user.ocupacion_nombre}`, type: 'Entrega', date: getFutureDate(6), completed: false }
      ];
    }
    localStorage.setItem('javihub_' + uPrefix + 'tasks_school', JSON.stringify(starterTasks));

    // 4. Tareas generales
    const generalTasks = [
      { id: 201, title: 'Configurar mis metas personales en Javi Hub', type: 'Recordatorio', date: getFutureDate(1), completed: false }
    ];
    localStorage.setItem('javihub_' + uPrefix + 'tasks_general', JSON.stringify(generalTasks));

    // 5. Hobbies limpios para el nuevo usuario
    localStorage.setItem('javihub_' + uPrefix + 'hobbies_list', JSON.stringify([]));
  },

  // Registro de nuevo usuario (Guardado real en javihub.db y local)
  async register(userData) {
    const userToSave = {
      id: Date.now(),
      username: (userData.username || 'Usuario').trim(),
      password: (userData.password || '1234').trim(),
      altura: parseFloat(userData.altura),
      peso_inicial: parseFloat(userData.peso_inicial),
      ocupacion_tipo: userData.ocupacion_tipo === 'trabajo' ? 'trabajo' : 'estudio',
      ocupacion_nombre: (userData.ocupacion_nombre || '').trim() || (userData.ocupacion_tipo === 'trabajo' ? 'Empresa' : 'DAM')
    };

    // 1. Guardar directamente en la base de datos SQLite javihub.db
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const endpoint = window.location.origin.includes(':8000') 
        ? '/api/register' 
        : 'http://localhost:8000/api/register';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userToSave),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        console.log('✅ Usuario insertado en javihub.db');
      }
    } catch (e) {
      console.warn('Backend SQLite:', e);
    }

    // 2. Guardar en la base de datos de usuarios locales
    let localUsers = Storage.get('local_users_db', []);
    if (!Array.isArray(localUsers)) localUsers = [];

    const idx = localUsers.findIndex(u => u.username && u.username.toLowerCase() === userToSave.username.toLowerCase());
    if (idx >= 0) {
      localUsers[idx] = { ...localUsers[idx], ...userToSave };
    } else {
      localUsers.push(userToSave);
    }
    localStorage.setItem('javihub_local_users_db', JSON.stringify(localUsers));

    // Establecer como usuario activo e inicializar SUS datos
    Auth.setUser(userToSave);
    Auth.initUserData(userToSave);

    return { success: true, mode: 'db_and_local', user: userToSave };
  },

  // Inicio de sesión
  async login(username, password) {
    const uName = (username || '').trim();
    const uPass = (password || '').trim();

    let localUsers = Storage.get('local_users_db', []);
    if (!Array.isArray(localUsers)) localUsers = [];

    let found = localUsers.find(u => u.username && u.username.toLowerCase() === uName.toLowerCase());

    if (found) {
      Auth.setUser(found);
      return { success: true, user: found };
    }

    // Si no existía, registrarlo con los datos estándar
    const newUser = {
      id: Date.now(),
      username: uName,
      password: uPass || '1234',
      altura: 175.0,
      peso_inicial: 70.0,
      ocupacion_tipo: 'estudio',
      ocupacion_nombre: 'DAM'
    };
    localUsers.push(newUser);
    localStorage.setItem('javihub_local_users_db', JSON.stringify(localUsers));

    Auth.setUser(newUser);
    Auth.initUserData(newUser);

    return { success: true, user: newUser };
  }
};

window.Auth = Auth;

// 3. SEMBRADO DE USUARIOS DE PRUEBA (ANAYA, JAVI, CARLOS, LAURA, MARCOS)
function seedTestUsersIfEmpty() {
  const usersRaw = localStorage.getItem('javihub_local_users_db');
  if (!usersRaw) {
    const initialTestUsers = [
      {
        id: 1,
        username: 'anaya',
        password: '1234',
        altura: 168.0,
        peso_inicial: 63.5,
        ocupacion_tipo: 'estudio',
        ocupacion_nombre: '2º DAM - Desarrollo Multiplataforma'
      },
      {
        id: 2,
        username: 'javi',
        password: '1234',
        altura: 178.0,
        peso_inicial: 75.0,
        ocupacion_tipo: 'estudio',
        ocupacion_nombre: '1º DAM'
      },
      {
        id: 3,
        username: 'carlos',
        password: '1234',
        altura: 185.0,
        peso_inicial: 88.0,
        ocupacion_tipo: 'trabajo',
        ocupacion_nombre: 'Desarrollador Backend Senior en TechCorp'
      },
      {
        id: 4,
        username: 'laura',
        password: '1234',
        altura: 162.0,
        peso_inicial: 55.0,
        ocupacion_tipo: 'estudio',
        ocupacion_nombre: 'Diseño Gráfico & UI/UX'
      },
      {
        id: 5,
        username: 'marcos',
        password: '1234',
        altura: 174.0,
        peso_inicial: 71.5,
        ocupacion_tipo: 'trabajo',
        ocupacion_nombre: 'Entrenador Deportivo & Nutricionista'
      }
    ];

    localStorage.setItem('javihub_local_users_db', JSON.stringify(initialTestUsers));

    // Sembrado para ANAYA
    localStorage.setItem('javihub_u_anaya_gym_weights', JSON.stringify([
      { id: 1, date: getPastDate(14), weight: 64.2 },
      { id: 2, date: getPastDate(7), weight: 63.8 },
      { id: 3, date: getPastDate(1), weight: 63.5 }
    ]));
    localStorage.setItem('javihub_u_anaya_tasks_school', JSON.stringify([
      { id: 1, title: 'Examen de Acceso a Datos (Hibernate/JPA)', type: 'Examen', date: getFutureDate(2), completed: false },
      { id: 2, title: 'Entrega Proyecto Android Studio (Kotlin)', type: 'Entrega', date: getFutureDate(5), completed: false }
    ]));
    localStorage.setItem('javihub_u_anaya_tasks_general', JSON.stringify([
      { id: 3, title: 'Cita con la gestoría del coche', type: 'Evento', date: getFutureDate(1), completed: false }
    ]));
    localStorage.setItem('javihub_u_anaya_hobbies_list', JSON.stringify([
      { id: 1, title: 'Interstellar', category: 'pelicula', detail: 'Cine Sci-Fi', completed: true, rating: 5, order: 1 },
      { id: 2, title: 'Hollow Knight: Silksong', category: 'videojuego', detail: 'Metroidvania', completed: false, rating: 0, order: 2 },
      { id: 3, title: 'El Problema de los 3 Cuerpos', category: 'libro', detail: 'Novela Cixin Liu', completed: true, rating: 5, order: 3 }
    ]));
    const anayaDiet = {};
    for (let i = 1; i <= 4; i++) anayaDiet[getPastDate(i)] = true;
    localStorage.setItem('javihub_u_anaya_gym_diet_logs', JSON.stringify(anayaDiet));

    // Sembrado para CARLOS
    localStorage.setItem('javihub_u_carlos_gym_weights', JSON.stringify([
      { id: 10, date: getPastDate(21), weight: 91.0 },
      { id: 11, date: getPastDate(10), weight: 89.5 },
      { id: 12, date: getPastDate(1), weight: 88.0 }
    ]));
    localStorage.setItem('javihub_u_carlos_tasks_school', JSON.stringify([
      { id: 21, title: 'Despliegue de microservicios en Kubernetes AWS', type: 'Entrega', date: getFutureDate(1), completed: false },
      { id: 22, title: 'Reunión de arquitectura con cliente alemán', type: 'Evento', date: getFutureDate(4), completed: false }
    ]));
    localStorage.setItem('javihub_u_carlos_hobbies_list', JSON.stringify([
      { id: 31, title: 'Oppenheimer', category: 'pelicula', detail: 'Christopher Nolan', completed: true, rating: 5, order: 1 },
      { id: 32, title: 'Cyberpunk 2077', category: 'videojuego', detail: 'PC', completed: true, rating: 5, order: 2 }
    ]));
  }
}

// 4. INICIALIZACIÓN Y MOLDURA DINÁMICA DE LA WEB
document.addEventListener('DOMContentLoaded', () => {
  seedTestUsersIfEmpty();
  initTheme();
  initClock();
  initUserSession();
});

function initTheme() {
  const savedTheme = localStorage.getItem('javihub_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) {
    themeSelect.value = savedTheme;
    themeSelect.addEventListener('change', (e) => {
      const newTheme = e.target.value;
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('javihub_theme', newTheme);
    });
  }
}

function initClock() {
  const clockEl = document.getElementById('liveClock');
  function update() {
    if (clockEl) {
      const now = new Date();
      const options = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
      clockEl.textContent = now.toLocaleDateString('es-ES', options);
    }
  }
  update();
  setInterval(update, 30000);
}

// MOLDURA AUTOMÁTICA SEGÚN EL USUARIO REAL
function initUserSession() {
  const currentPath = window.location.pathname.toLowerCase();
  const isLoginPage = currentPath.endsWith('login.html');

  if (isLoginPage) return;

  const user = Auth.getUser();
  if (!user) return;

  // Capitalizar nombre para la vista
  const displayName = user.username.charAt(0).toUpperCase() + user.username.slice(1);

  // 1. Barra de usuario con rol y botón salir
  const navActions = document.querySelector('.nav-actions');
  if (navActions && !document.getElementById('userNavBadge')) {
    const isWork = user.ocupacion_tipo === 'trabajo';
    const roleIcon = isWork ? '💼' : '🎓';
    const userBadge = document.createElement('div');
    userBadge.id = 'userNavBadge';
    userBadge.className = 'user-nav-badge';
    userBadge.innerHTML = `
      <span class="user-avatar-tag">👤 ${escapeHtml(displayName)} <span style="font-size:0.75rem; opacity:0.8;">(${roleIcon} ${escapeHtml(user.ocupacion_nombre)})</span></span>
      <button onclick="window.Auth.logout()" class="btn-logout" title="Cerrar sesión">Salir 🚪</button>
    `;
    navActions.prepend(userBadge);
  }

  // 2. Saludo dinámico personalizado
  const greetingEl = document.getElementById('dynamicGreeting');
  if (greetingEl) {
    const now = new Date();
    const hour = now.getHours();
    let prefix = '¡Buenas noches';
    if (hour >= 6 && hour < 13) prefix = '¡Buenos días';
    else if (hour >= 13 && hour < 20) prefix = '¡Buenas tardes';

    greetingEl.textContent = `${prefix}, ${displayName}!`;
  }

  // Actualizar también la pancarta del carrusel con su nombre
  const carouselTitle = document.getElementById('carouselWelcomeTitle');
  if (carouselTitle) {
    carouselTitle.textContent = `¡Hola, ${displayName}! Planifica tu semana`;
  }

  // 3. Moldear Tareas y Escuela/Trabajo
  const isWork = (user.ocupacion_tipo === 'trabajo');
  const icon = isWork ? '💼' : '🎓';
  const label = isWork ? 'Trabajo' : 'Escuela';
  const detail = user.ocupacion_nombre || (isWork ? 'Mi Empleo' : 'DAM');

  // En index.html (Tarjeta principal de tareas)
  const taskTitleEl = document.querySelector('.hub-card-header h3');
  if (taskTitleEl) {
    taskTitleEl.textContent = `${icon} ${label} & Tareas`;
  }

  const statSchoolLabel = document.querySelector('#statsSchool')?.parentElement?.querySelector('.stat-label');
  if (statSchoolLabel) {
    statSchoolLabel.textContent = `${label} (${detail})`;
  }

  // En tareas.html
  const schoolHeader = document.getElementById('mainColumnHeader') || document.querySelector('.column-card:first-child .column-header h2');
  if (schoolHeader) {
    schoolHeader.textContent = `${icon} ${label} (${detail})`;
  }

  const schoolSelectOption = document.getElementById('mainColumnOption') || document.querySelector('#taskCategory option[value="school"]');
  if (schoolSelectOption) {
    schoolSelectOption.textContent = `${icon} ${label} (${detail})`;
  }

  // 4. Moldear Gimnasio (Altura, Peso inicial, Cálculo de IMC con datos del usuario)
  const userProfileBox = document.getElementById('userGymProfile');
  if (userProfileBox) {
    const alt = parseFloat(user.altura) || 170.0;
    const pesoInit = parseFloat(user.peso_inicial) || 65.0;
    const imc = (pesoInit / Math.pow(alt / 100, 2)).toFixed(1);

    userProfileBox.innerHTML = `
      <div style="font-size: 0.85rem; color: var(--text-secondary); display: flex; gap: 1.25rem; flex-wrap: wrap; margin-top: 0.5rem; background: var(--bg-surface-elevated); padding: 0.6rem 1rem; border-radius: 10px; border: 1px solid var(--border-color);">
        <span>📏 <strong>Altura:</strong> ${alt} cm</span>
        <span>⚖️ <strong>Peso Inicial Registrado:</strong> ${pesoInit} kg</span>
        <span>🩺 <strong>IMC de Partida:</strong> ${imc} (${getIMCCategory(imc)})</span>
      </div>
    `;
  }
}

function getIMCCategory(imc) {
  const val = parseFloat(imc);
  if (val < 18.5) return 'Bajo peso';
  if (val < 25.0) return 'Normopeso';
  if (val < 30.0) return 'Sobrepeso ligero';
  return 'Sobrepeso / Obesidad';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
