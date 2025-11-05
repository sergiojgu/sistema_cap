// ========== USUARIOS ==========
function nuevoUsuario() {
  if (!usuarioActivo || (!ROLE_ALIASES.SUPER.includes(usuarioActivo.rol) && !ROLE_ALIASES.ADMIN.includes(usuarioActivo.rol))) {
    mostrarNotificacion('❌ No tienes permisos para crear usuarios');
    return;
  }
  document.getElementById('formularioUsuario').style.display = 'block';
  document.getElementById('botonNuevoUsuarioContainer').style.display = 'none';
  // Limpiar formulario
  document.getElementById('nombreUsuario').value = '';
  document.getElementById('passUsuario').value = '';
  document.getElementById('telefonoUsuario').value = '591';
  document.getElementById('rolUsuario').innerHTML = '';
  document.getElementById('gradoUsuario').innerHTML = '<option value="">Seleccionar grado</option>';
  // Cargar opciones de rol según el usuario actual
  const rolSelect = document.getElementById('rolUsuario');
  if (ROLE_ALIASES.SUPER.includes(usuarioActivo.rol)) {
    rolSelect.innerHTML = `
      <option value="superusuario">Superusuario</option>
      <option value="admin">Administrador</option>
      <option value="operador">Operador</option>
      <option value="visitante">Visitante</option>
    `;
  } else if (ROLE_ALIASES.ADMIN.includes(usuarioActivo.rol)) {
    rolSelect.innerHTML = `
      <option value="admin">Administrador</option>
      <option value="operador">Operador</option>
      <option value="visitante">Visitante</option>
    `;
  }
  // Cargar opciones de grado
  const gradoSelect = document.getElementById('gradoUsuario');
  gradoSelect.innerHTML = '<option value="">Seleccionar grado</option>';
  // Si es superusuario, agregar opción "Todos" y todos los grados
  if (ROLE_ALIASES.SUPER.includes(usuarioActivo.rol)) {
    const optTodos = document.createElement('option');
    optTodos.value = 'Todos';
    optTodos.textContent = 'Todos';
    gradoSelect.appendChild(optTodos);
    // Agregar todos los grados disponibles
    cargarTodosLosGrados(gradoSelect);
  } else if (ROLE_ALIASES.ADMIN.includes(usuarioActivo.rol)) {
    // Para administradores, solo mostrar su propio grado
    const opt = document.createElement('option');
    opt.value = usuarioActivo.grado;
    opt.textContent = usuarioActivo.grado;
    opt.selected = true;
    gradoSelect.appendChild(opt);
    // Deshabilitar el select para administradores (solo pueden crear usuarios de su grado)
    gradoSelect.disabled = true;
  }
  editandoIndex = -1;
  moduloEditando = 'usuarios';
  document.getElementById('btnGuardarUsuario').textContent = 'Guardar';
}

function guardarUsuario() {
  if (!usuarioActivo || (!ROLE_ALIASES.SUPER.includes(usuarioActivo.rol) && !ROLE_ALIASES.ADMIN.includes(usuarioActivo.rol))) {
    mostrarNotificacion('❌ No tienes permisos para gestionar usuarios');
    return;
  }
  const nombre = document.getElementById('nombreUsuario').value.trim();
  const pass = document.getElementById('passUsuario').value;
  const telefono = document.getElementById('telefonoUsuario').value.trim();
  const rol = document.getElementById('rolUsuario').value;
  let grado = document.getElementById('gradoUsuario').value;
  // Para administradores, el grado siempre será el mismo que el del administrador
  if (ROLE_ALIASES.ADMIN.includes(usuarioActivo.rol)) {
    grado = usuarioActivo.grado;
  }
  if (!nombre || !pass || !rol || !grado) {
    return mostrarNotificacion('❌ Completar todos los campos obligatorios');
  }
  // Validar que administradores no creen superusuarios
  if (ROLE_ALIASES.ADMIN.includes(usuarioActivo.rol) && ROLE_ALIASES.SUPER.includes(rol)) {
    return mostrarNotificacion('❌ No tienes permisos para crear superusuarios');
  }
  if (editandoIndex !== -1 && moduloEditando === 'usuarios') {
    // Validaciones para edición
    const usuarioEditado = usuarios[editandoIndex];
    // Administradores no pueden editar superusuarios
    if (ROLE_ALIASES.ADMIN.includes(usuarioActivo.rol) && ROLE_ALIASES.SUPER.includes(usuarioEditado.rol)) {
      return mostrarNotificacion('❌ No tienes permisos para editar superusuarios');
    }
    // Administradores solo pueden editar usuarios de su mismo grado
    if (ROLE_ALIASES.ADMIN.includes(usuarioActivo.rol) && usuarioEditado.grado !== usuarioActivo.grado) {
      return mostrarNotificacion('❌ Solo puedes editar usuarios de tu mismo grado');
    }
    usuarios[editandoIndex] = { ...usuarios[editandoIndex], user: nombre, pass, rol, grado, telefono };
    registrarAccion(`Editó usuario: ${nombre} (${rol})`);
    mostrarNotificacion('✅ Usuario actualizado correctamente');
  } else {
    // Nuevo usuario
    if (usuarios.some(u => u.user === nombre)) {
      return mostrarNotificacion('❌ Ya existe un usuario con ese nombre');
    }
    usuarios.push({ user: nombre, pass, rol, grado, telefono, activo: true, // Usuarios creados aquí por admin/super están ACTIVOS
      fechaCreacion: new Date().toLocaleString() });
    registrarAccion(`Nuevo usuario: ${nombre} (${rol})`);
    mostrarNotificacion('✅ Usuario creado correctamente');
  }
  guardarDatos(); // Llama a la función guardarDatos() para guardar los cambios
  mostrarUsuarios();
  cancelarEdicionUsuario();
}

function mostrarUsuarios() {
  const cont = document.getElementById('listaUsuarios');
  if (!cont) return;
  const q = document.getElementById('buscarUsuario')?.value?.toLowerCase() || '';
  cont.innerHTML = '';
  // Filtrar usuarios según permisos
  let usuariosFiltrados = usuarios.filter(u => u.user.toLowerCase().includes(q));
  // Si es administrador, solo mostrar usuarios de su mismo grado
  if (ROLE_ALIASES.ADMIN.includes(usuarioActivo.rol)) {
    usuariosFiltrados = usuariosFiltrados.filter(u => u.grado === usuarioActivo.grado && !ROLE_ALIASES.SUPER.includes(u.rol) );
  }
  if (usuariosFiltrados.length === 0) {
    cont.innerHTML = '<div class="item">No se encontraron usuarios</div>';
    return;
  }
  usuariosFiltrados.forEach((u, i) => {
    const div = document.createElement('div');
    div.className = 'item';
    // Mostrar estado activo/inactivo y fecha de solicitud si existe
    const estado = u.activo === false ? '❌ INACTIVO' : '✅ ACTIVO';
    const fechaInfo = u.fechaSolicitud ? `<br>📅 Solicitud: ${u.fechaSolicitud}` : u.fechaCreacion ? `<br>📅 Creado: ${u.fechaCreacion}` : '';
    div.innerHTML = `
      <b>${u.user}</b> (${u.rol}) - ${estado}${fechaInfo}<br>
      🎓 Grado: ${u.grado}<br>
      📞 Teléfono: ${u.telefono || '—'}
    `;
    // Solo superusuario y admin pueden editar/eliminar usuarios (con restricciones)
    if (usuarioActivo && (ROLE_ALIASES.SUPER.includes(usuarioActivo.rol) || ROLE_ALIASES.ADMIN.includes(usuarioActivo.rol))) {
      const acciones = document.createElement('div');
      acciones.className = 'item-actions';
      // Verificar permisos para editar
      let puedeEditar = true;
      // Administradores no pueden editar superusuarios ni usuarios de otros grados
      if (ROLE_ALIASES.ADMIN.includes(usuarioActivo.rol)) {
        if (ROLE_ALIASES.SUPER.includes(u.rol) || u.grado !== usuarioActivo.grado) {
          puedeEditar = false;
        }
      }
      if (puedeEditar) {
        const btnEdit = document.createElement('button');
        btnEdit.textContent = 'Editar';
        btnEdit.className = 'btn-edit';
        btnEdit.onclick = () => editarUsuario(i);
        acciones.appendChild(btnEdit);
      }
      // 🔥 BOTÓN PARA ACTIVAR/DESACTIVAR (SOLO SUPERUSUARIO)
      if (ROLE_ALIASES.SUPER.includes(usuarioActivo.rol)) {
        const btnEstado = document.createElement('button');
        btnEstado.textContent = u.activo === false ? 'Activar' : 'Desactivar';
        btnEstado.className = u.activo === false ? 'btn-edit' : 'btn-delete';
        btnEstado.style.marginLeft = '5px';
        btnEstado.onclick = () => cambiarEstadoUsuario(i);
        acciones.appendChild(btnEstado);
      }
      // Verificar permisos para eliminar
      let puedeEliminar = true;
      // No permitir eliminar al propio usuario
      if (u.user === usuarioActivo.user) {
        puedeEliminar = false;
      }
      // Administradores no pueden eliminar superusuarios ni usuarios de otros grados
      if (ROLE_ALIASES.ADMIN.includes(usuarioActivo.rol)) {
        if (ROLE_ALIASES.SUPER.includes(u.rol) || u.grado !== usuarioActivo.gr
