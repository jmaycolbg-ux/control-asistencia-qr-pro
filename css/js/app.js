// ---------- Almacenamiento Local ----------
const leer = (key) => JSON.parse(localStorage.getItem(key) || "[]");
const guardar = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// ---------- Utilidades de Tiempo ----------
const fechaHoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fechaLegible = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const horaActual = () => new Date().toLocaleTimeString("es-CO", { hour12: false });

// ---------- Precargar Estudiantes Con Documento Real ----------
function precargarEstudiantesPorDefecto() {
  let estudiantes = [
    { codigo: "1142925222", nombre: "Ana Barrios", grado: "11-A" },
    { codigo: "1062607932", nombre: "Juan Taberas", grado: "11-A" },
    { codigo: "1062439213", nombre: "Jhon Buelvas", grado: "11-B" }
  ];
  guardar("estudiantes", estudiantes);
}

// ---------- Inicialización General al Cargar el DOM ----------
document.addEventListener("DOMContentLoaded", () => {
  
  // Cargar siempre los estudiantes actualizados
  precargarEstudiantesPorDefecto();

  // Asignar fecha por defecto
  const elMetricFecha = document.getElementById("metricFecha");
  if (elMetricFecha) elMetricFecha.textContent = fechaLegible();
  
  const filtroFecha = document.getElementById("filtroFecha");
  if (filtroFecha) filtroFecha.value = fechaHoy();

  // ---------- Navegación por Pestañas (Tabs) ----------
  const tabBtns = document.querySelectorAll(".tab-btn");
  const panelSecciones = document.querySelectorAll(".panel-seccion");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("activo"));
      panelSecciones.forEach(s => s.classList.remove("activo"));

      btn.classList.add("activo");
      const targetId = btn.getAttribute("data-target");
      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.classList.add("activo");
    });
  });

  // ---------- Botón Agregar Estudiante ----------
  const btnAgregar = document.getElementById("btnAgregar");
  if (btnAgregar) {
    btnAgregar.addEventListener("click", agregarEstudiante);
  }

  // ---------- Filtro y Búsqueda ----------
  if (filtroFecha) {
    filtroFecha.addEventListener("change", renderAsistencias);
  }

  const buscarEstudiante = document.getElementById("buscarEstudiante");
  if (buscarEstudiante) {
    buscarEstudiante.addEventListener("input", renderEstudiantes);
  }

  // ---------- Botones de Exportación CSV ----------
  const btnExportarHoy = document.getElementById("btnExportarHoy");
  if (btnExportarHoy) {
    btnExportarHoy.addEventListener("click", () => {
      const hoy = filtroFecha ? filtroFecha.value : fechaHoy();
      const lista = leer("asistencias").filter(a => a.fecha === hoy);
      exportarCSV(lista, `Asistencias_${hoy}`);
    });
  }

  const btnExportarTodo = document.getElementById("btnExportarTodo");
  if (btnExportarTodo) {
    btnExportarTodo.addEventListener("click", () => {
      exportarCSV(leer("asistencias"), "Historial_General_Asistencia");
    });
  }

  // ---------- Lector / Input de Código ----------
  const inputLector = document.getElementById("inputLector");
  if (inputLector) {
    inputLector.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const cod = inputLector.value.trim().toUpperCase();
        inputLector.value = "";
        if (cod) registrarAsistencia(cod);
      }
    });
  }

  // Cargar tablas y estadísticas iniciales
  actualizarTodo();
});

// ---------- Reproductor de Audio Sintético ----------
function reproducirSonido(tipo) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (tipo === 'exito') {
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.frequency.value = 220;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {}
}

// ---------- Métricas ----------
function actualizarMetricas() {
  const estudiantes = leer("estudiantes");
  const asistencias = leer("asistencias");
  const hoy = fechaHoy();

  const totalEst = document.getElementById("metricTotalEst");
  const presHoy = document.getElementById("metricPresentes");

  if (totalEst) totalEst.textContent = estudiantes.length;
  if (presHoy) presHoy.textContent = asistencias.filter(a => a.fecha === hoy).length;
}

// ---------- Gestión de Estudiantes ----------
function agregarEstudiante() {
  const codigoInput = document.getElementById("codigo");
  const nombreInput = document.getElementById("nombre");
  const gradoInput = document.getElementById("grado");

  const codigo = codigoInput ? codigoInput.value.trim().toUpperCase() : "";
  const nombre = nombreInput ? nombreInput.value.trim() : "";
  const grado = gradoInput ? gradoInput.value.trim() : "";

  if (!codigo || !nombre) {
    alert("Debe rellenar al menos el código y el nombre del estudiante.");
    return;
  }

  let estudiantes = leer("estudiantes");
  if (estudiantes.some(e => e.codigo === codigo)) {
    alert("Ya existe un alumno registrado con este código.");
    return;
  }

  estudiantes.push({ codigo, nombre, grado });
  guardar("estudiantes", estudiantes);

  if (codigoInput) codigoInput.value = "";
  if (nombreInput) nombreInput.value = "";
  if (gradoInput) gradoInput.value = "";

  actualizarTodo();
  alert("¡Estudiante registrado con éxito!");
}

function eliminarEstudiante(codigo) {
  if (confirm(`¿Desea eliminar al estudiante con código ${codigo}?`)) {
    let estudiantes = leer("estudiantes").filter(e => e.codigo !== codigo);
    guardar("estudiantes", estudiantes);
    actualizarTodo();
  }
}

window.eliminarEstudiante = eliminarEstudiante;

function renderEstudiantes() {
  const tbody = document.getElementById("tablaEstudiantes");
  if (!tbody) return;
  tbody.innerHTML = "";

  const buscarInput = document.getElementById("buscarEstudiante");
  const filtro = buscarInput ? buscarInput.value.trim().toLowerCase() : "";
  
  const estudiantes = leer("estudiantes").filter(e => 
    e.nombre.toLowerCase().includes(filtro) || e.codigo.toLowerCase().includes(filtro)
  );

  if (estudiantes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No se encontraron estudiantes registrados.</td></tr>`;
    return;
  }

  estudiantes.forEach(est => {
    tbody.innerHTML += `
      <tr>
        <td><strong>${est.codigo}</strong></td>
        <td>${est.nombre}</td>
        <td>${est.grado || 'N/A'}</td>
        <td><button onclick="eliminarEstudiante('${est.codigo}')" class="btn-danger" type="button">Eliminar</button></td>
      </tr>
    `;
  });
}

// ---------- Registro de Asistencia ----------
function registrarAsistencia(codigo) {
  const estudiantes = leer("estudiantes");
  const est = estudiantes.find(e => e.codigo === codigo);
  const statusCard = document.getElementById("statusCard");

  if (!est) {
    reproducirSonido('error');
    if (statusCard) {
      statusCard.className = "status-display error";
      statusCard.innerHTML = `
        <div class="status-icon-big">❌</div>
        <h4>Código No Encontrado</h4>
        <p>El código <strong>${codigo}</strong> no pertenece a ningún alumno registrado.</p>
      `;
    }
    return;
  }

  let asistencias = leer("asistencias");
  const hoy = fechaHoy();

  if (asistencias.some(a => a.codigo === codigo && a.fecha === hoy)) {
    reproducirSonido('error');
    if (statusCard) {
      statusCard.className = "status-display warning";
      statusCard.innerHTML = `
        <div class="status-icon-big">⚠️</div>
        <h4>Acceso Duplicado</h4>
        <p><strong>${est.nombre}</strong><br>Ya registró su ingreso el día de hoy.</p>
      `;
    }
    return;
  }

  const hora = horaActual();
  asistencias.push({ codigo, nombre: est.nombre, fecha: hoy, hora });
  guardar("asistencias", asistencias);

  reproducirSonido('exito');
  if (statusCard) {
    statusCard.className = "status-display success";
    statusCard.innerHTML = `
      <div class="status-icon-big">✅</div>
      <h4>Asistencia Registrada</h4>
      <p><strong>${est.nombre}</strong><br>Grado: ${est.grado || 'N/A'}<br>Hora: ${hora}</p>
    `;
  }

  actualizarTodo();
}

// ---------- Tablas de Asistencia e Historial ----------
function renderAsistencias() {
  const tbody = document.getElementById("tablaAsistencia");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const filtroFecha = document.getElementById("filtroFecha");
  const fechaFiltro = filtroFecha ? filtroFecha.value : fechaHoy();
  const lista = leer("asistencias").filter(a => a.fecha === fechaFiltro);

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Sin asistencias registradas para esta fecha.</td></tr>`;
    return;
  }

  lista.forEach(item => {
    tbody.innerHTML += `
      <tr>
        <td><strong>${item.codigo}</strong></td>
        <td>${item.nombre}</td>
        <td>${item.fecha}</td>
        <td>${item.hora}</td>
      </tr>
    `;
  });
}

function renderHistorial() {
  const tbody = document.getElementById("tablaHistorial");
  if (!tbody) return;
  tbody.innerHTML = "";
  const historial = leer("asistencias");

  if (historial.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Historial vacío.</td></tr>`;
    return;
  }

  historial.slice().reverse().forEach(item => {
    tbody.innerHTML += `
      <tr>
        <td><strong>${item.codigo}</strong></td>
        <td>${item.nombre}</td>
        <td>${item.fecha}</td>
        <td>${item.hora}</td>
      </tr>
    `;
  });
}

// ---------- Exportación a CSV ----------
function exportarCSV(datos, nombreArchivo) {
  if (datos.length === 0) {
    alert("No hay datos disponibles para exportar.");
    return;
  }

  let csvContent = "\uFEFFCódigo,Nombre,Fecha,Hora\n";
  datos.forEach(row => {
    csvContent += `"${row.codigo}","${row.nombre}","${row.fecha}","${row.hora}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${nombreArchivo}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ---------- Renderizar Carnets ----------
function renderCarnets() {
  const container = document.getElementById("gridCarnets");
  if (!container) return;
  container.innerHTML = "";
  const estudiantes = leer("estudiantes");

  if (estudiantes.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align:center;">No hay alumnos registrados para mostrar carnets.</p>`;
    return;
  }

  estudiantes.forEach(est => {
    const div = document.createElement("div");
    div.className = "carnet-card";
    div.innerHTML = `
      <h5>${est.nombre}</h5>
      <p>${est.grado || 'Sin curso'}</p>
      <div class="codigo-badge-card">${est.codigo}</div>
    `;
    container.appendChild(div);
  });
}

// ---------- Sincronización Global ----------
function actualizarTodo() {
  actualizarMetricas();
  renderEstudiantes();
  renderAsistencias();
  renderHistorial();
  renderCarnets();
}
