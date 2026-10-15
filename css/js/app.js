/* Sistema de asistencia QR: datos locales del navegador.
   Para usar QRCode se carga qrcode.min.js desde CDN en index.html. */

const CLAVES = { estudiantes: "estudiantes", asistencias: "asistencias" };

function leer(key) {
  try {
    const valor = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(valor) ? valor : [];
  } catch (error) {
    console.error(No se pudo leer ${key} desde localStorage., error);
    return [];
  }
}

function guardar(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    alert("No se pudo guardar la información en este navegador. Compruebe el espacio disponible.");
    console.error(error);
    return false;
  }
}

const fechaHoy = () => {
  const d = new Date();
  return ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")};
};
const fechaLegible = (fecha = fechaHoy()) => {
  const [y, m, d] = fecha.split("-");
  return ${d}/${m}/${y};
};
const horaActual = () => new Date().toLocaleTimeString("es-CO", { hour12: false });

function inicializarDatos() {
  const estudiantesGuardados = localStorage.getItem(CLAVES.estudiantes);
  if (estudiantesGuardados === null) {
    guardar(CLAVES.estudiantes, [
      { codigo: "EST-0001", nombre: "Estudiante de ejemplo 1", grado: "11-A" },
      { codigo: "EST-0002", nombre: "Estudiante de ejemplo 2", grado: "11-A" },
      { codigo: "EST-0003", nombre: "Estudiante de ejemplo 3", grado: "11-B" }
    ]);
    return;
  }

  /* Sustituye únicamente los antiguos datos de ejemplo que contenían números
     con apariencia de documento por ejemplos ficticios; conserva los demás. */
  const estudiantes = leer(CLAVES.estudiantes);
  const antiguos = new Set(["1142925222", "1062607932", "1062439213"]);
  if (estudiantes.some(e => antiguos.has(String(e.codigo)))) {
    const seguros = estudiantes.filter(e => !antiguos.has(String(e.codigo)));
    seguros.push(
      { codigo: "EST-0001", nombre: "Estudiante de ejemplo 1", grado: "11-A" },
      { codigo: "EST-0002", nombre: "Estudiante de ejemplo 2", grado: "11-A" },
      { codigo: "EST-0003", nombre: "Estudiante de ejemplo 3", grado: "11-B" }
    );
    guardar(CLAVES.estudiantes, seguros);
  }
  if (localStorage.getItem(CLAVES.asistencias) === null) guardar(CLAVES.asistencias, []);
}

function crearCelda(texto, negrita = false) {
  const td = document.createElement("td");
  if (negrita) {
    const strong = document.createElement("strong");
    strong.textContent = texto ?? "";
    td.appendChild(strong);
  } else {
    td.textContent = texto ?? "";
  }
  return td;
}

function mostrarFilaVacia(tbody, mensaje, columnas) {
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = columnas;
  td.className = "empty-row";
  td.textContent = mensaje;
  tr.appendChild(td);
  tbody.appendChild(tr);
}

function reproducirSonido(tipo) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = tipo === "exito" ? 880 : 220;
    gain.gain.setValueAtTime(tipo === "exito" ? 0.08 : 0.1, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + (tipo === "exito" ? 0.13 : 0.25));
    osc.onended = () => ctx.close();
  } catch (_) { /* El sonido es opcional; no afecta el registro. */ }
}

function mostrarEstado(tipo, icono, titulo, lineas) {
  const card = document.getElementById("statusCard");
  if (!card) return;
  card.replaceChildren();
  card.className = status-display ${tipo};
  const icon = document.createElement("div");
  icon.className = "status-icon-big";
  icon.textContent = icono;
  const h4 = document.createElement("h4");
  h4.textContent = titulo;
  card.append(icon, h4);
  lineas.forEach(linea => {
    const p = document.createElement("p");
    p.textContent = linea;
    card.appendChild(p);
  });
}

function actualizarMetricas() {
  const estudiantes = leer(CLAVES.estudiantes);
  const asistenciasHoy = leer(CLAVES.asistencias).filter(a => a.fecha === fechaHoy());
  const total = document.getElementById("metricTotalEst");
  const presentes = document.getElementById("metricPresentes");
  const fecha = document.getElementById("metricFecha");
  if (total) total.textContent = estudiantes.length;
  if (presentes) presentes.textContent = asistenciasHoy.length;
  if (fecha) fecha.textContent = fechaLegible();
}

function agregarEstudiante(evento) {
  if (evento) evento.preventDefault();
  const codigoInput = document.getElementById("codigo");
  const nombreInput = document.getElementById("nombre");
  const gradoInput = document.getElementById("grado");
  const codigo = codigoInput.value.trim().toUpperCase();
  const nombre = nombreInput.value.trim();
  const grado = gradoInput.value.trim();

  if (!codigo || !nombre) {
    alert("Debe escribir el código y el nombre del estudiante.");
    return;
  }
  const estudiantes = leer(CLAVES.estudiantes);
  if (estudiantes.some(e => String(e.codigo).toUpperCase() === codigo)) {
    alert("Ya existe un estudiante registrado con ese código.");
    codigoInput.focus();
    return;
  }
  estudiantes.push({ codigo, nombre, grado });
  if (!guardar(CLAVES.estudiantes, estudiantes)) return;

  document.getElementById("formEstudiante").reset();
  actualizarTodo();
  mostrarEstado("success", "👤", "Estudiante registrado", [${nombre} · ${codigo}, Grado: ${grado || "No especificado"}]);
  alert("¡Estudiante registrado con éxito!");
}

function eliminarEstudiante(codigo) {
  const estudiantes = leer(CLAVES.estudiantes);
  const est = estudiantes.find(e => e.codigo === codigo);
  if (!est) return;
  if (!confirm(¿Desea eliminar a ${est.nombre} (${codigo})? Los registros históricos de asistencia se conservarán.)) return;
  guardar(CLAVES.estudiantes, estudiantes.filter(e => e.codigo !== codigo));
  actualizarTodo();
}
window.eliminarEstudiante = eliminarEstudiante;

function renderEstudiantes() {
  const tbody = document.getElementById("tablaEstudiantes");
  if (!tbody) return;
  tbody.replaceChildren();
  const filtro = (document.getElementById("buscarEstudiante")?.value || "").trim().toLocaleLowerCase("es");
  const estudiantes = leer(CLAVES.estudiantes).filter(e =>
    String(e.nombre || "").toLocaleLowerCase("es").includes(filtro) ||
    String(e.codigo || "").toLocaleLowerCase("es").includes(filtro)
  );
  if (!estudiantes.length) return mostrarFilaVacia(tbody, "No se encontraron estudiantes registrados.", 4);

  estudiantes.forEach(est => {
    const tr = document.createElement("tr");
    tr.append(
      crearCelda(est.codigo, true),
      crearCelda(est.nombre),
      crearCelda(est.grado || "N/A")
    );
    const td = document.createElement("td");
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "btn-danger";
    boton.textContent = "Eliminar";
    boton.addEventListener("click", () => eliminarEstudiante(est.codigo));
    td.appendChild(boton);
    tr.appendChild(td);
    tbody.appendChild(tr);
  });
}

function registrarAsistencia(codigoEntrada) {
  const codigo = String(codigoEntrada || "").trim().toUpperCase();
  if (!codigo) return;
  const est = leer(CLAVES.estudiantes).find(e => String(e.codigo).toUpperCase() === codigo);
  if (!est) {
    reproducirSonido("error");
    mostrarEstado("error", "❌", "Código no encontrado", [El código ${codigo} no pertenece a un estudiante registrado.]);
    return;
  }

  const asistencias = leer(CLAVES.asistencias);
  const hoy = fechaHoy();
  if (asistencias.some(a => String(a.codigo).toUpperCase() === codigo && a.fecha === hoy)) {
    reproducirSonido("error");
    mostrarEstado("warning", "⚠️", "Asistencia duplicada", [${est.nombre} ya tiene asistencia registrada hoy.]);
    return;
  }

  const hora = horaActual();
  asistencias.push({ codigo: est.codigo, nombre: est.nombre, fecha: hoy, hora });
  if (!guardar(CLAVES.asistencias, asistencias)) return;
  reproducirSonido("exito");
  mostrarEstado("success", "✅", "Asistencia registrada", [${est.nombre}, Grado: ${est.grado || "No especificado"}, Fecha: ${fechaLegible(hoy)}, Hora: ${hora}]);
  actualizarTodo();
}

function renderAsistencias() {
  const tbody = document.getElementById("tablaAsistencia");
  if (!tbody) return;
  tbody.replaceChildren();
  const fechaFiltro = document.getElementById("filtroFecha")?.value || fechaHoy();
  const lista = leer(CLAVES.asistencias)
    .filter(a => a.fecha === fechaFiltro)
    .sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
  if (!lista.length) return mostrarFilaVacia(tbody, "Sin asistencias registradas para esta fecha.", 4);
  lista.forEach(item => {
    const tr = document.createElement("tr");
    tr.append(crearCelda(item.codigo, true), crearCelda(item.nombre), crearCelda(item.fecha), crearCelda(item.hora));
    tbody.appendChild(tr);
  });
}

function renderHistorial() {
  const tbody = document.getElementById("tablaHistorial");
  if (!tbody) return;
  tbody.replaceChildren();
  const fechaFiltro = document.getElementById("filtroHistorial")?.value || "";
  const historial = leer(CLAVES.asistencias)
    .filter(a => !fechaFiltro || a.fecha === fechaFiltro)
    .slice()
    .sort((a, b) => ${b.fecha} ${b.hora}.localeCompare(${a.fecha} ${a.hora}));
  if (!historial.length) return mostrarFilaVacia(tbody, "No hay registros para la consulta seleccionada.", 4);
  historial.forEach(item => {
    const tr = document.createElement("tr");
    tr.append(crearCelda(item.codigo, true), crearCelda(item.nombre), crearCelda(item.fecha), crearCelda(item.hora));
    tbody.appendChild(tr);
  });
}

function escaparCSV(valor) {
  let texto = String(valor ?? "");
  if (/^[=+\-@\t\r]/.test(texto)) texto = "'" + texto;
  return "${texto.replace(/"/g, '""')}";
}

function exportarCSV(datos, nombreArchivo) {
  if (!datos.length) {
    alert("No hay datos disponibles para exportar.");
    return;
  }
  const filas = [["Código", "Nombre", "Fecha", "Hora"], ...datos.map(a => [a.codigo, a.nombre, a.fecha, a.hora])];
  const contenido = "\uFEFF" + filas.map(fila => fila.map(escaparCSV).join(",")).join("\r\n");
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = ${nombreArchivo}.csv;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderCarnets() {
  const container = document.getElementById("gridCarnets");
  if (!container) return;
  container.replaceChildren();
  const estudiantes = leer(CLAVES.estudiantes);
  if (!estudiantes.length) return mostrarFilaVaciaCarnets(container);

  estudiantes.forEach(est => {
    const card = document.createElement("article");
    card.className = "carnet-card";
    const institucion = document.createElement("p");
    institucion.textContent = "C.I. SOLEDAD VIVES DE JOLY";
    const nombre = document.createElement("h4");
    nombre.textContent = est.nombre;
    const grado = document.createElement("p");
    grado.textContent = Grado: ${est.grado || "No especificado"};
    const qr = document.createElement("div");
    qr.className = "qr-container";
    qr.setAttribute("aria-label", Código QR para ${est.codigo});
    const codigo = document.createElement("span");
    codigo.className = "codigo-badge-card";
    codigo.textContent = est.codigo;
    card.append(institucion, nombre, grado, qr, codigo);
    container.appendChild(card);

    if (typeof QRCode === "function") {
      new QRCode(qr, { text: String(est.codigo), width: 128, height: 128, colorDark: "#0f172a", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
    } else {
      const aviso = document.createElement("p");
      aviso.textContent = "No se pudo cargar la librería QR. Compruebe la conexión a internet.";
      qr.appendChild(aviso);
    }
  });
}
function mostrarFilaVaciaCarnets(container) {
  const p = document.createElement("p");
  p.textContent = "No hay estudiantes registrados para mostrar carnets.";
  container.appendChild(p);
}

function actualizarTodo() {
  actualizarMetricas();
  renderEstudiantes();
  renderAsistencias();
  renderHistorial();
  renderCarnets();
}

document.addEventListener("DOMContentLoaded", () => {
  inicializarDatos();

  const filtroFecha = document.getElementById("filtroFecha");
  if (filtroFecha) {
    filtroFecha.value = fechaHoy();
    filtroFecha.addEventListener("change", renderAsistencias);
  }
  const filtroHistorial = document.getElementById("filtroHistorial");
  if (filtroHistorial) filtroHistorial.addEventListener("change", renderHistorial);

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => {
        b.classList.remove("activo");
        b.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".panel-seccion").forEach(panel => panel.classList.remove("activo"));
      btn.classList.add("activo");
      btn.setAttribute("aria-selected", "true");
      const panel = document.getElementById(btn.dataset.target);
      if (panel) panel.classList.add("activo");
    });
  });

  document.getElementById("formEstudiante")?.addEventListener("submit", agregarEstudiante);
  document.getElementById("buscarEstudiante")?.addEventListener("input", renderEstudiantes);

  document.getElementById("inputLector")?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      const input = event.currentTarget;
      const codigo = input.value.trim();
      input.value = "";
      registrarAsistencia(codigo);
    }
  });

  document.getElementById("btnExportarHoy")?.addEventListener("click", () => {
    const fecha = filtroFecha?.value || fechaHoy();
    exportarCSV(leer(CLAVES.asistencias).filter(a => a.fecha === fecha), Asistencias_${fecha});
  });
  document.getElementById("btnExportarTodo")?.addEventListener("click", () => {
    const fecha = filtroHistorial?.value || "";
    const datos = leer(CLAVES.asistencias).filter(a => !fecha || a.fecha === fecha);
    exportarCSV(datos, fecha ? Historial_Asistencia_${fecha} : "Historial_General_Asistencia");
  });
  document.getElementById("btnLimpiarHistorial")?.addEventListener("click", () => {
    if (filtroHistorial) filtroHistorial.value = "";
    renderHistorial();
  });
  document.getElementById("btnImprimirCarnets")?.addEventListener("click", () => {
    document.querySelector('.tab-btn[data-target="tab-carnets"]')?.click();
    window.print();
  });

  actualizarTodo();
});
