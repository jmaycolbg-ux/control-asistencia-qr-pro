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

// Inicializar fechas
document.getElementById("metricFecha").textContent = fechaLegible();
const filtroFecha = document.getElementById("filtroFecha");
filtroFecha.value = fechaHoy();

// ---------- Reproductor de Sonidos Sintéticos (Web Audio API) ----------
function reproducirSonido(tipo) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (tipo === 'exito') {
      osc.frequency.value = 880; // Nota La (agudo)
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.frequency.value = 220; // Tono grave (error/advertencia)
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // Si la API de audio no está soportada, continúa normalmente
  }
}

// ---------- Navegación por Pestañas (Tabs) ----------
const tabBtns = document.querySelectorAll(".tab-btn");
const panelSecciones = document.querySelectorAll(".panel-seccion");

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    tabBtns.forEach(b => b.classList.remove("activo"));
    panelSecciones.forEach(s => s.classList.remove("activo"));

    btn.classList.add("activo");
    const targetId = btn.getAttribute("data-target");
    document.getElementById(targetId).classList.add("activo");
  });
});

// ---------- Métricas ----------
function actualizarMetricas() {
  const estudiantes = leer("estudiantes");
  const asistencias = leer("asistencias");
  const hoy = fechaHoy();

  document.getElementById("metricTotalEst").textContent = estudiantes.length;
  const presentesHoy = asistencias.filter(a => a.fecha === hoy).length;
  document.getElementById("metricPresentes").textContent = presentesHoy;
}

// ---------- Gestión y Búsqueda de Estudiantes ----------
function agregarEstudiante() {
  const codigo = document.getElementById("codigo").value.trim().toUpperCase();
  const nombre = document.getElementById("nombre").value.trim();
  const grado = document.getElementById("grado").value.trim();

  if (!codigo || !nombre) {
    return alert("Debe rellenar el código y el nombre del estudiante.");
  }

  let estudiantes = leer("estudiantes");
  if (estudiantes.some(e => e.codigo === codigo)) {
    return alert("Ya existe un alumno registrado con este código.");
  }

  estudiantes.push({ codigo, nombre, grado });
  guardar("estudiantes", estudiantes);

  ["codigo", "nombre", "grado"].forEach(id => document.getElementById(id).value = "");
  actualizarTodo();
  alert("Estudiante registrado con éxito.");
}

function eliminarEstudiante(codigo) {
  if (confirm(`¿Desea eliminar al estudiante con código ${codigo}?`)) {
    let estudiantes = leer("estudiantes").filter(e => e.codigo !== codigo);
    guardar("estudiantes", estudiantes);
    actualizarTodo();
  }
}

function renderEstudiantes() {
  const tbody = document.getElementById("tablaEstudiantes");
  tbody.innerHTML = "";
  const filtro = document.getElementById("buscarEstudiante").value.trim().toLowerCase();
  
  const estudiantes = leer("estudiantes").filter(e => 
    e.nombre.toLowerCase().includes(filtro) || e.codigo.toLowerCase().includes(filtro)
  );

  if (estudiantes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No se encontraron estudiantes.</td></tr>`;
    return;
  }

  estudiantes.forEach(est => {
    tbody.innerHTML += `
      <tr>
        <td><strong>${est.codigo}</strong></td>
        <td>${est.nombre}</td>
        <td>${est.grado || 'N/A'}</td>
        <td><button onclick="eliminarEstudiante('${est.codigo}')" class="btn-danger">Eliminar</button></td>
      </tr>
    `;
  });
}

document.getElementById("buscarEstudiante").addEventListener("input", renderEstudiantes);

// ---------- Registro de Asistencia ----------
function registrarAsistencia(codigo) {
  const estudiantes = leer("estudiantes");
  const est = estudiantes.find(e => e.codigo === codigo);
  const statusCard = document.getElementById("statusCard");

  if (!est) {
    reproducirSonido('error');
    statusCard.className = "status-display error";
    statusCard.innerHTML = `
      <div class="status-icon-big">❌</div>
      <h4>Código No Encontrado</h4>
      <p>El código <strong>${codigo}</strong> no pertenece a ningún alumno registrado.</p>
    `;
    return;
  }

  let asistencias = leer("asistencias");
  const hoy = fechaHoy();

  if (asistencias.some(a => a.codigo === codigo && a.fecha === hoy)) {
    reproducirSonido('error');
    statusCard.className = "status-display warning";
    statusCard.innerHTML = `
      <div class="status-icon-big">⚠️</div>
      <h4>Acceso Duplicado</h4>
      <p><strong>${est.nombre}</strong><br>Ya registró su ingreso el día de hoy.</p>
    `;
    return;
  }

  const hora = horaActual();
  asistencias.push({ codigo, nombre: est.nombre, fecha: hoy, hora });
  guardar("asistencias", asistencias);

  reproducirSonido('exito');
  statusCard.className = "status-display success";
  statusCard.innerHTML = `
    <div class="status-icon-big">✅</div>
    <h4>Asistencia Registrada</h4>
    <p><strong>${est.nombre}</strong><br>Grado: ${est.grado || 'N/A'}<br>Hora: ${hora}</p>
  `;

  actualizarTodo();
}

// ---------- Tablas Asistencia / Historial ----------
function renderAsistencias() {
  const tbody = document.getElementById("tablaAsistencia");
  tbody.innerHTML = "";
  const fechaFiltro = filtroFecha.value;
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

// ---------- Exportación a Excel / CSV ----------
function exportarCSV(datos, nombreArchivo) {
  if (datos.length === 0) return alert("No hay datos para exportar.");

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

document.getElementById("btnExportarHoy").addEventListener("click", () => {
  const hoy = filtroFecha.value;
  const lista = leer("asistencias").filter(a => a.fecha === hoy);
  exportarCSV(lista, `Asistencias_${hoy}`);
});

document.getElementById("btnExportarTodo").addEventListener("click", () => {
  exportarCSV(leer("asistencias"), "Historial_General_Asistencia");
});

// ---------- Carnets y Modal ----------
function abrirModalCarnet(codigo) {
  const est = leer("estudiantes").find(e => e.codigo === codigo);
  if (!est) return;

  document.getElementById("modalNombre").textContent = est.nombre;
  document.getElementById("modalGrado").textContent = `Grado: ${est.grado || 'N/A'}`;
  document.getElementById("modalCodigo").textContent = est.codigo;

  const qrContainer = document.getElementById("modalQR");
  qrContainer.innerHTML = "";
  new QRCode(qrContainer, { text: est.codigo, width: 120, height: 120 });

  document.getElementById("modalCarnet").classList.add("activo");
}

function cerrarModal() {
  document.getElementById("modalCarnet").classList.remove("activo");
}

function renderCarnets() {
  const container = document.getElementById("gridCarnets");
  container.innerHTML = "";
  const estudiantes = leer("estudiantes");

  if (estudiantes.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align:center;">No hay alumnos para mostrar carnets.</p>`;
    return;
  }

  estudiantes.forEach(est => {
    const div = document.createElement("div");
    div.className = "carnet-card";
    div.innerHTML = `
      <h5>${est.nombre}</h5>
      <p>${est.codigo} • ${est.grado || ''}</p>
      <div id="qr-gen-${est.codigo}" class="qr-box-mini"></div>
      <button onclick="abrirModalCarnet('${est.codigo}')" class="btn-secondary">🖨️ Ver Carnet</button>
    `;
    container.appendChild(div);

    new QRCode(document.getElementById(`qr-gen-${est.codigo}`), {
      text: est.codigo,
      width: 90,
      height: 90
    });
  });
}

// ---------- Cámara ----------
function iniciarCamara() {
  const html5QrCode = new Html5QrcodeScanner("reader", { 
    fps: 10, 
    qrbox: { width: 230, height: 230 } 
  }, false);

  html5QrCode.render((decodedText) => {
    registrarAsistencia(decodedText.trim().toUpperCase());
  }, (error) => {});
}

// ---------- Sincronización ----------
document.getElementById("btnAgregar").addEventListener("click", agregarEstudiante);
filtroFecha.addEventListener("change", renderAsistencias);

const inputLector = document.getElementById("inputLector");
inputLector.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const cod = inputLector.value.trim().toUpperCase();
    inputLector.value = "";
    if (cod) registrarAsistencia(cod);
  }
});

function actualizarTodo() {
  actualizarMetricas();
  renderEstudiantes();
  renderAsistencias();
  renderHistorial();
  renderCarnets();
}

actualizarTodo();
iniciarCamara();
