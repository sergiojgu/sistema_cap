// ========== CONFIGURACIÓN INICIAL ==========
console.log("Inicializando sistema...");

// Variables globales
var alumnos = [];
var padres = [];
var grupos = [];
var reuniones = [];
var pagos = [];
var bitacora = [];
var usuarios = [];
var usuarioActivo = null;

// Role aliases
var ROLE_ALIASES = { 
  SUPER: ['superadmin','superusuario'], 
  ADMIN: ['administrador','admin'], 
  OPER: ['operador'], 
  VISIT: ['visitante'] 
};

// Variables para edición
var editandoIndex = -1;
var moduloEditando = '';

// ========== CONFIGURACIÓN GITHUB API ==========
const GITHUB_CONFIG = {
  usuario: 'sergiojgu',
  repositorio: 'Sys_CAP',
  rama: 'main',
  token: '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' // Reemplaza con tu token real de GitHub
};

// ========== CONFIGURACIÓN TELEGRAM ==========
const TELEGRAM_CONFIG = {
  botToken: '7679063114:AAFeT9ioL3uUd0s-h2Rr5SDXbFRwy4chD98', // Tu token real
  chatId: '6964897255' // Tu Chat ID real
};

// ========== SISTEMA DE CARGA DE DATOS DESDE JSON ==========
async function cargarDatosIniciales() {
  console.log("📂 Cargando datos iniciales...");
  
  try {
    // Intentar cargar desde el archivo JSON estático
    const response = await fetch('https://raw.githubusercontent.com/sergiojgu/Sys_CAP/main/datos_sistema.json');
    
    if (response.ok) {
      const datosTexto = await response.text();
      console.log("📄 Contenido del JSON cargado");
      
      const datos = JSON.parse(datosTexto);
      
      // Validar y cargar datos con valores por defecto
      alumnos = Array.isArray(datos.alumnos) ? datos.alumnos : [];
      padres = Array.isArray(datos.padres) ? datos.padres : [];
      grupos = Array.isArray(datos.grupos) ? datos.grupos : [];
      reuniones = Array.isArray(datos.reuniones) ? datos.reuniones : [];
      pagos = Array.isArray(datos.pagos) ? datos.pagos : [];
      bitacora = Array.isArray(datos.bitacora) ? datos.bitacora : [];
      usuarios = Array.isArray(datos.usuarios) ? datos.usuarios : [];
      
      // Asegurar que siempre haya al menos el usuario root
      if (!usuarios.some(u => u.user === 'root')) {
        usuarios.push({
          user: 'root',
          pass: 'toor',
          rol: 'superusuario',
          grado: 'Todos',
          telefono: '591',
          activo: true
        });
        await guardarDatosEnGitHub(); // Guardar si se agregó root
      }
      
      console.log("✅ Datos cargados desde GitHub:", {
        usuarios: usuarios.length,
        alumnos: alumnos.length,
        padres: padres.length
      });
      
    } else {
      console.log("⚠️ No se pudo cargar datos_sistema.json - creando datos iniciales");
      await crearDatosIniciales();
    }
    
  } catch (error) {
    console.log("❌ Error cargando datos JSON:", error);
    console.log("📝 Creando datos iniciales debido al error");
    await crearDatosIniciales();
  }
  
  // Cargar sesión de usuario
  cargarSesionUsuario();
}

async function crearDatosIniciales() {
  // Datos iniciales
  usuarios = [
    {
      user: 'root',
      pass: 'toor',
      rol: 'superusuario',
      grado: 'Todos',
      telefono: '591',
      activo: true
    }
  ];
  alumnos = [];
  padres = [];
  grupos = [];
  reuniones = [];
  pagos = [];
  bitacora = [];
  
  // Guardar datos iniciales en GitHub
  await guardarDatosEnGitHub();
}

function cargarSesionUsuario() {
  try {
    if (typeof Storage !== 'undefined') {
      const usuarioGuardado = localStorage.getItem('usuarioActivo');
      if (usuarioGuardado) {
        usuarioActivo = JSON.parse(usuarioGuardado);
        console.log("👤 Sesión cargada:", usuarioActivo.user);
      }
    }
  } catch (error) {
    console.log("⚠️ Error cargando sesión:", error);
  }
}

// ========== GITHUB API - GUARDAR DATOS ==========
async function guardarDatosEnGitHub() {
  console.log("💾 Guardando datos en GitHub...");
  
  // Validar configuración
  if (!GITHUB_CONFIG.token || GITHUB_CONFIG.token === 'TU_TOKEN_GITHUB') {
    console.log("❌ Token de GitHub no configurado");
    mostrarNotificacion('❌ Error: Token GitHub no configurado');
    return false;
  }
  
  const datosActualizados = {
    usuarios: usuarios,
    alumnos: alumnos,
    padres: padres,
    grupos: grupos,
    reuniones: reuniones,
    pagos: pagos,
    bitacora: bitacora,
    ultimaActualizacion: new Date().toISOString()
  };
  
  const contenido = JSON.stringify(datosActualizados, null, 2);
  const contenidoBase64 = btoa(unescape(encodeURIComponent(contenido)));
  
  try {
    // Primero obtener el SHA del archivo actual para actualizarlo
    const url = `https://api.github.com/repos/${GITHUB_CONFIG.usuario}/${GITHUB_CONFIG.repositorio}/contents/datos_sistema.json`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `token ${GITHUB_CONFIG.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    let sha = '';
    if (response.ok) {
      const fileInfo = await response.json();
      sha = fileInfo.sha;
    }
    
    // Crear o actualizar el archivo
    const updateResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_CONFIG.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Actualización automática del sistema - ${new Date().toLocaleString()}`,
        content: contenidoBase64,
        sha: sha,
        branch: GITHUB_CONFIG.rama
      })
    });
    
    if (updateResponse.ok) {
      console.log("✅ Datos guardados en GitHub correctamente");
      mostrarNotificacion('✅ Datos guardados en el repositorio');
      return true;
    } else {
      const error = await updateResponse.json();
      console.log("❌ Error guardando en GitHub:", error);
      mostrarNotificacion('❌ Error guardando datos');
      return false;
    }
    
  } catch (error) {
    console.log("❌ Error en GitHub API:", error);
    mostrarNotificacion('❌ Error de conexión con GitHub');
    return false;
  }
}

// Función para guardar datos (usada por otros módulos)
async function guardarDatos() {
  return await guardarDatosEnGitHub();
}

// ========== SISTEMA DE LOGIN ==========
function login() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  
  if (!user || !pass) {
    mostrarNotificacion('❌ Ingrese usuario y contraseña');
    return;
  }
  
  const u = usuarios.find(x => x.user === user && x.pass === pass);
  
  if (u) {
    if (u.activo === false) {
      mostrarNotificacion('❌ Usuario inactivo. Contacte al administrador.');
      return;
    }
    
    usuarioActivo = u;
    guardarSesion();
    
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainHeader').style.display = 'block';
    document.getElementById('menu').style.display = 'flex';
    
    configurarVisibilidadPorRol();
    renderMenuHeader();
    mostrarNotificacion(`✅ Bienvenido ${u.user}`);
    
  } else {
    mostrarNotificacion('❌ Usuario o contraseña incorrecta');
  }
}

function guardarSesion() {
  try {
    if (typeof Storage !== 'undefined' && usuarioActivo) {
      localStorage.setItem('usuarioActivo', JSON.stringify(usuarioActivo));
    }
  } catch (error) {
    console.log("⚠️ Error guardando sesión:", error);
  }
}

// ========== SISTEMA DE REGISTRO ==========
function mostrarRegistro() {
  document.getElementById('loginScreen').innerHTML = `
    <div style="text-align:center;">
      <h2>Registro de Usuario</h2>
      <input type="text" id="nombreRegistro" placeholder="Usuario" />
      <input type="password" id="passRegistro" placeholder="Contraseña" />
      <input type="text" id="telefonoRegistro" placeholder="Teléfono (ej: 591XXXXXXXX)" value="591" />
      <select id="gradoRegistro">
        <option value="">Seleccionar grado</option>
      </select>
      <br>
      <button onclick="enviarSolicitudRegistro()" style="margin-top: 10px;">Enviar Solicitud</button>
      <button onclick="volverLogin()" style="background: #666; margin-left: 10px; margin-top: 10px;">Cancelar</button>
      <div id="mensajeRegistro" style="margin-top: 15px;"></div>
    </div>
  `;
  
  cargarGradosRegistro();
}

function cargarGradosRegistro() {
  const gradoSelect = document.getElementById('gradoRegistro');
  if (!gradoSelect) return;
  
  gradoSelect.innerHTML = '<option value="">Seleccionar grado</option>';
  
  const optGroupPrimaria = document.createElement('optgroup');
  optGroupPrimaria.label = 'PRIMARIA';
  gradoSelect.appendChild(optGroupPrimaria);
  
  ['1° A', '1° B', '2° A', '2° B', '3° A', '3° B', '4° A', '4° B', '5° A', '5° B', '6° A', '6° B']
    .forEach(grado => {
      const opt = document.createElement('option');
      opt.value = grado;
      opt.textContent = grado;
      optGroupPrimaria.appendChild(opt);
    });
  
  const optGroupSecundaria = document.createElement('optgroup');
  optGroupSecundaria.label = 'SECUNDARIA';
  gradoSelect.appendChild(optGroupSecundaria);
  
  ['1° A Sec.', '1° B Sec.', '2° A Sec.', '2° B Sec.', '3° A Sec.', '3° B Sec.', '4° A Sec.', '4° B Sec.']
    .forEach(grado => {
      const opt = document.createElement('option');
      opt.value = grado;
      opt.textContent = grado;
      optGroupSecundaria.appendChild(opt);
    });
  
  const optGroupPromo = document.createElement('optgroup');
  optGroupPromo.label = 'PROMOCIONES';
  gradoSelect.appendChild(optGroupPromo);
  
  ['Pre Promo A', 'Pre Promo B', 'Promo A', 'Promo B']
    .forEach(grado => {
      const opt = document.createElement('option');
      opt.value = grado;
      opt.textContent = grado;
      optGroupPromo.appendChild(opt);
    });
}

async function enviarSolicitudRegistro() {
  const nombre = document.getElementById('nombreRegistro').value.trim();
  const pass = document.getElementById('passRegistro').value;
  const telefono = document.getElementById('telefonoRegistro').value.trim();
  const grado = document.getElementById('gradoRegistro').value;
  
  if (!nombre || !pass || !grado) {
    document.getElementById('mensajeRegistro').innerHTML = '<div style="color: red;">❌ Complete todos los campos</div>';
    return;
  }
  
  if (usuarios.some(u => u.user === nombre)) {
    document.getElementById('mensajeRegistro').innerHTML = '<div style="color: red;">❌ El usuario ya existe</div>';
    return;
  }
  
  // Agregar nuevo usuario
  usuarios.push({ 
    user: nombre, 
    pass, 
    rol: 'operador',
    grado, 
    telefono,
    activo: false,
    fechaSolicitud: new Date().toLocaleString()
  });
  
  // Guardar datos en GitHub
  const guardadoExitoso = await guardarDatosEnGitHub();
  
  // Enviar notificación a Telegram
  enviarNotificacionTelegram(nombre, grado);
  
  // Mostrar mensaje de confirmación
  document.getElementById('loginScreen').innerHTML = `
    <div style="text-align:center; padding:40px;">
      <h2 style="color: green;">✅ Solicitud Enviada</h2>
      <p style="color:#666; margin-bottom:18px; font-size: 16px; line-height: 1.5;">
        La solicitud de creación de usuario ha sido enviada.<br>
        En las próximas 48 horas, obtendrá respuesta.
      </p>
      
      <div style="background: #e3f2fd; border: 2px solid #2196F3; border-radius: 10px; padding: 15px; margin: 20px 0;">
        <p style="color: #1976D2; margin: 0; font-weight: bold;">
          📱 Notificación enviada al administrador
        </p>
        <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">
          El superusuario ha sido notificado vía Telegram
        </p>
      </div>
      
      ${guardadoExitoso ? 
        '<div style="background: #d4edda; border: 2px solid #28a745; border-radius: 10px; padding: 15px; margin: 20px 0;">' +
          '<p style="color: #155724; margin: 0; font-weight: bold;">💾 Datos Guardados en el Repositorio</p>' +
        '</div>' :
        '<div style="background: #f8d7da; border: 2px solid #dc3545; border-radius: 10px; padding: 15px; margin: 20px 0;">' +
          '<p style="color: #721c24; margin: 0; font-weight: bold;">⚠️ Error Guardando Datos</p>' +
          '<p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Los datos se guardaron localmente pero no en el repositorio</p>' +
        '</div>'
      }
      
      <button onclick="volverLogin()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 15px;">
        Volver al Inicio
      </button>
    </div>
  `;
}

// ========== TELEGRAM - CONFIGURACIÓN CORRECTA ==========
function enviarNotificacionTelegram(usuario, grado) {
  console.log("📱 Enviando notificación a Telegram...");
  
  const mensaje = `🚨 NUEVO REGISTRO PENDIENTE

👤 Usuario: ${usuario}
🎓 Grado: ${grado}  
📅 Fecha: ${new Date().toLocaleString()}

⚠️ Activa el usuario en el sistema de gestión`;

  const url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage`;
  
  console.log("URL Telegram:", url);
  
  fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({
      chat_id: TELEGRAM_CONFIG.chatId,
      text: mensaje,
      parse_mode: 'HTML'
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.ok) {
      console.log('✅ Notificación enviada a Telegram correctamente');
    } else {
      console.log('❌ Error Telegram:', data);
    }
  })
  .catch(error => {
    console.log('❌ Error enviando notificación:', error);
  });
}

// Función para probar Telegram
function probarTelegram() {
  console.log("🔔 Probando Telegram...");
  enviarNotificacionTelegram('USUARIO_PRUEBA', '1° A');
  mostrarNotificacion('🔔 Mensaje de prueba enviado a Telegram');
}

// ========== FUNCIONES PRINCIPALES ==========
function logoutAndShowBlank(){
  usuarioActivo = null;
  localStorage.removeItem('usuarioActivo');
  
  document.getElementById('menu').style.display='none';
  document.getElementById('mainHeader').style.display='none';
  
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginScreen').innerHTML = `
    <div style="text-align:center; padding:40px;">
      <h2>Sesión cerrada</h2>
      <p style="color:#666; margin-bottom:18px;">Pulsa para iniciar sesión</p>
      <button onclick="location.reload()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Iniciar sesión</button>
      
      <!-- Botón de prueba Telegram -->
      <div style="margin-top: 15px;">
        <button onclick="probarTelegram()" style="background: #9C27B0; color: white; border: none; border-radius: 5px; padding: 8px 15px; cursor: pointer; font-size: 12px;">
          🔔 Probar Telegram
        </button>
      </div>
    </div>
  `;
}

function renderMenuHeader(){
  const mh = document.getElementById('menuHeader');
  if(!mh || !usuarioActivo) return;
  
  document.getElementById('mhUser').innerText = `Usuario: ${usuarioActivo.user}`;
  document.getElementById('mhRole').innerText = `Rol: ${usuarioActivo.rol}`;
  document.getElementById('mhGrado').innerText = `Grado: ${usuarioActivo.grado || '-'}`;
  mh.style.display = 'block';
}

function configurarVisibilidadPorRol(){
  if (!usuarioActivo) return;
  
  const botonUsuarios = document.querySelector("button[onclick*='usuarios']");
  const botonBitacora = document.querySelector("button[onclick*='bitacora']");

  if (ROLE_ALIASES.OPER.includes(usuarioActivo.rol) || ROLE_ALIASES.VISIT.includes(usuarioActivo.rol)) {
    if(botonUsuarios) botonUsuarios.style.display='none';
    if(botonBitacora) botonBitacora.style.display='none';
  } else {
    if(botonUsuarios) botonUsuarios.style.display='block';
    if(botonBitacora) botonBitacora.style.display='block';
  }
}

function mostrarNotificacion(msg){
  const n = document.getElementById('notificacion');
  if (!n) return;
  n.textContent = msg;
  n.style.display = 'block';
  setTimeout(() => n.style.display = 'none', 3000);
}

function registrarAccion(texto){
  const fecha = new Date().toLocaleString();
  const usuario = usuarioActivo ? usuarioActivo.user : 'sistema';
  bitacora.unshift({ fecha, usuario, texto });
  if(bitacora.length > 300) bitacora.pop();
  // Los datos se guardarán cuando se llame a guardarDatos()
}

function mostrarBitacora(){
  const cont = document.getElementById('bitacoraLista');
  if (!cont) return;
  
  cont.innerHTML = '';
  
  if (bitacora.length === 0) {
    cont.innerHTML = '<div class="item">No hay registros en la bitácora.</div>';
    return;
  }
  
  bitacora.forEach((b, index) => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `<b>${b.fecha}</b> - ${b.usuario}: ${b.texto}`;
    cont.appendChild(div);
  });
}

function abrirModulo(id){
  document.querySelectorAll('.modulo').forEach(m => m.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.getElementById('menu').style.display = 'none';
  document.getElementById('mainHeader').style.display = 'none';
  
  editandoIndex = -1;
  moduloEditando = '';
  
  if (id === 'usuarios' && typeof mostrarUsuarios === 'function') {
    mostrarUsuarios();
  }
  if (id === 'bitacora') {
    mostrarBitacora();
  }
  
  window.scrollTo(0,0);
}

function volverLogin() {
  location.reload();
}

function volverMenu(){
  document.querySelectorAll('.modulo').forEach(m => m.classList.remove('active'));
  document.getElementById('menu').style.display = 'flex';
  document.getElementById('mainHeader').style.display = 'block';
}

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function() {
  // Cargar datos desde GitHub
  await cargarDatosIniciales();
  
  // Configurar eventos
  const loginUser = document.getElementById('loginUser');
  const loginPass = document.getElementById('loginPass');
  
  if (loginUser && loginPass) {
    loginUser.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') login();
    });
    loginPass.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') login();
    });
  }
  
  // Si hay usuario activo, mostrar menú
  if (usuarioActivo) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainHeader').style.display = 'block';
    document.getElementById('menu').style.display = 'flex';
    configurarVisibilidadPorRol();
    renderMenuHeader();
  }
});
