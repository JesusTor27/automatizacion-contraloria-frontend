
const tabla = document.getElementById("tabla-solicitudes");
const mensaje = document.getElementById("mensaje");

const botonActualizar =
  document.getElementById("actualizar");

const botonCerrarSesion =
  document.getElementById("cerrar-sesion");

const botonExportar =
  document.getElementById("exportar-reporte");

const mensajeReporte =
  document.getElementById("mensaje-reporte");

// ==========================================
// ESTADO LOCAL
// ==========================================

let paginaAutorizada = false;
let exportandoReporte = false;

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function colocarTexto(id, texto) {
  document.getElementById(id).textContent = texto;
}

function crearCelda(fila, valor) {
  const celda = document.createElement("td");

  celda.textContent = valor ?? "No especificado";

  fila.appendChild(celda);

  return celda;
}

function formatearFecha(fecha) {
  if (!fecha) {
    return "No especificada";
  }

  const valor = new Date(fecha);

  return Number.isNaN(valor.getTime())
    ? "No especificada"
    : valor.toLocaleDateString("es-CO");
}

function formatearFechaReporte(fecha) {
  if (!fecha) {
    return "";
  }

  // Conservar fechas YYYY-MM-DD sin desplazarlas
  // por diferencias de zona horaria.
  if (
    typeof fecha === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(fecha)
  ) {
    return fecha;
  }

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return "";
  }

  return valor.toLocaleDateString("es-CO");
}

// ==========================================
// NORMALIZAR ESTADOS
// ==========================================

function normalizarEstado(estado) {
  return String(estado ?? "")
    .trim()
    .toUpperCase();
}

// ==========================================
// NOMBRES VISIBLES DE LOS ESTADOS
// ==========================================

function obtenerEstadoVisible(estado) {
  const estadoNormalizado = normalizarEstado(estado);

  const nombres = {
    RECIBIDA: "RECIBIDA",
    PENDIENTE: "PENDIENTE",
    LISTA_PARA_PUBLICAR: "LISTA PARA PUBLICAR",
    PUBLICADA: "PUBLICADA",
    EVIDENCIA_GENERADA: "EN REVISIÓN",
    EVIDENCIA_APROBADA: "APROBADA",
    OBSERVADA: "RECHAZADA",
    RESPONDIDA: "RESPONDIDA"
  };

  return nombres[estadoNormalizado]
    || estadoNormalizado
    || "DESCONOCIDO";
}

// ==========================================
// CARGAR DASHBOARD
// ==========================================

async function cargarDashboard() {
  if (!paginaAutorizada) {
    return;
  }

  botonActualizar.disabled = true;
  mensaje.textContent = "Cargando solicitudes...";

  tabla.replaceChildren();

  try {
    const solicitudes = await obtenerSolicitudes();

    // ==========================================
    // ESTADÍSTICAS
    // ==========================================

    colocarTexto("total", solicitudes.length);

    // Pendientes de publicación
    colocarTexto(
      "pendientes",
      solicitudes.filter(s =>
        [
          "RECIBIDA",
          "PENDIENTE",
          "LISTA_PARA_PUBLICAR"
        ].includes(normalizarEstado(s.estado))
      ).length
    );

    // En proceso de revisión
    colocarTexto(
      "revision",
      solicitudes.filter(s =>
        [
          "PUBLICADA",
          "EVIDENCIA_GENERADA",
          "OBSERVADA",
          "EVIDENCIA_APROBADA"
        ].includes(normalizarEstado(s.estado))
      ).length
    );

    // Respondidas
    colocarTexto(
      "respondidas",
      solicitudes.filter(
        s => normalizarEstado(s.estado) === "RESPONDIDA"
      ).length
    );

    // ==========================================
    // TABLA DE SOLICITUDES
    // ==========================================

    for (const solicitud of solicitudes) {
      const fila = document.createElement("tr");

      // Asunto
      crearCelda(fila, solicitud.asunto);

      // Remitente
      crearCelda(fila, solicitud.remitente);

      // Fecha de recepción
      crearCelda(
        fila,
        formatearFecha(solicitud.fecha_recepcion)
      );

      // Estado visible
      const estadoVisible = obtenerEstadoVisible(
        solicitud.estado
      );

      const celdaEstado = crearCelda(
        fila,
        estadoVisible
      );

      celdaEstado.classList.add("celda-estado");

      celdaEstado.dataset.estado = normalizarEstado(
        solicitud.estado
      );

      // Botón de detalle
      const celdaAcciones = document.createElement("td");

      const enlace = document.createElement("a");

      enlace.className = "btn-detalle";
      enlace.textContent = "Ver detalle";

      enlace.href =
        `pages/detalle-solicitud.html?id=${
          encodeURIComponent(solicitud.id)
        }`;

      celdaAcciones.appendChild(enlace);
      fila.appendChild(celdaAcciones);

      tabla.appendChild(fila);
    }

    mensaje.textContent = solicitudes.length
      ? ""
      : "No hay solicitudes registradas.";

  } catch (error) {
    console.error(
      "Error al cargar dashboard:",
      error
    );

    mensaje.textContent =
      `No fue posible cargar las solicitudes: ${error.message}`;

  } finally {
    botonActualizar.disabled = false;
  }
}

// ==========================================
// EXPORTACIÓN - PROTEGER VALORES CSV
// ==========================================

function prepararValorCSV(valor) {
  let texto = String(valor ?? "");

  // Evitar que Excel interprete contenido
  // procedente de solicitudes como fórmulas.
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(texto)) {
    texto = "'" + texto;
  }

  // Encerrar entre comillas y duplicar
  // las comillas interiores.
  return `"${texto.replace(/"/g, '""')}"`;
}

// ==========================================
// EXPORTACIÓN - CONSTRUIR ARCHIVO CSV
// ==========================================

function descargarCSV(filas, nombreArchivo) {
  const contenido = [
    "sep=;",
    ...filas.map(fila =>
      fila.map(prepararValorCSV).join(";")
    )
  ].join("\r\n");

  // BOM UTF-8 para conservar tildes
  // y caracteres especiales en Excel.
  const blob = new Blob(
    ["\uFEFF", contenido],
    {
      type: "text/csv;charset=utf-8;"
    }
  );

  const urlTemporal = URL.createObjectURL(blob);

  const enlace = document.createElement("a");

  enlace.href = urlTemporal;
  enlace.download = nombreArchivo;

  document.body.appendChild(enlace);

  enlace.click();
  enlace.remove();

  setTimeout(() => {
    URL.revokeObjectURL(urlTemporal);
  }, 1000);
}

// ==========================================
// EXPORTACIÓN - CONSULTAR PUBLICACIONES
// ==========================================

async function obtenerDatosPublicaciones(solicitudes) {
  const publicaciones = new Map();
  const fallos = [];

  // Consultamos los datos sin saturar la API.
  const concurrencia = 4;

  let posicion = 0;

  async function trabajador() {
    while (posicion < solicitudes.length) {
      const indice = posicion++;

      const solicitud = solicitudes[indice];
      const estado = normalizarEstado(solicitud.estado);

      // Una solicitud recién recibida o pendiente
      // todavía no necesita datos de publicación.
      if (["RECIBIDA", "PENDIENTE"].includes(estado)) {
        continue;
      }

      try {
        const publicacion = await obtenerPublicacion(
          solicitud.id
        );

        publicaciones.set(
          solicitud.id,
          publicacion || null
        );

      } catch (error) {
        // Puede no existir aún una publicación.
        // Si falla otra consulta, lo indicamos
        // al finalizar el reporte.
        if (estado !== "LISTA_PARA_PUBLICAR") {
          fallos.push(solicitud.id);

          console.warn(
            "No fue posible consultar la publicación:",
            solicitud.id,
            error
          );
        }
      }
    }
  }

  await Promise.all(
    Array.from(
      {
        length: Math.min(
          concurrencia,
          solicitudes.length
        )
      },
      () => trabajador()
    )
  );

  return {
    publicaciones,
    fallos
  };
}

// ==========================================
// EXPORTAR REPORTE DE CONTROL
// ==========================================

async function exportarReporte() {
  if (!paginaAutorizada || exportandoReporte) {
    return;
  }

  exportandoReporte = true;
  botonExportar.disabled = true;

  mensajeReporte.textContent =
    "Preparando reporte de solicitudes...";

  try {
    // Consultar datos actualizados.
    const solicitudes = await obtenerSolicitudes();

    if (!solicitudes.length) {
      mensajeReporte.textContent =
        "No hay solicitudes para exportar.";

      return;
    }

    mensajeReporte.textContent =
      "Consultando datos de publicación...";

    const {
      publicaciones,
      fallos
    } = await obtenerDatosPublicaciones(solicitudes);

    // ==========================================
    // COLUMNAS DEL REPORTE
    // ==========================================

    const filas = [
      [
        "ID de solicitud",
        "Asunto",
        "Remitente",
        "Dependencia",
        "Código de publicación",
        "Fecha de recepción",
        "Fecha de publicación",
        "URL de publicación",
        "Responsable de publicación",
        "Estado actual"
      ]
    ];

    // ==========================================
    // AGREGAR SOLICITUDES AL REPORTE
    // ==========================================

    for (const solicitud of solicitudes) {
      const publicacion = publicaciones.get(
        solicitud.id
      );

      // La dependencia puede venir como campo
      // de texto u objeto relacionado.
      const dependencia =
        solicitud.nombre_dependencia ||
        solicitud.dependencia_nombre ||
        solicitud.dependencia?.nombre ||
        "No disponible";

      filas.push([
        solicitud.id || "",
        solicitud.asunto || "",
        solicitud.remitente || "",
        dependencia,
        solicitud.codigo_publicacion || "",
        formatearFechaReporte(
          solicitud.fecha_recepcion
        ),
        formatearFechaReporte(
          publicacion?.fecha_publicacion
        ),
        publicacion?.url_publicacion || "",
        publicacion?.responsable || "",
        obtenerEstadoVisible(solicitud.estado)
      ]);
    }

    // ==========================================
    // DESCARGAR
    // ==========================================

    const hoy = new Date();

    const fechaArchivo = [
      hoy.getFullYear(),
      String(hoy.getMonth() + 1).padStart(2, "0"),
      String(hoy.getDate()).padStart(2, "0")
    ].join("-");

    const nombreArchivo =
      `reporte_publicaciones_${fechaArchivo}.csv`;

    descargarCSV(
      filas,
      nombreArchivo
    );

    mensajeReporte.textContent = fallos.length
      ? (
          `Reporte descargado con ${solicitudes.length} solicitudes. ` +
          `No se pudieron consultar los datos de publicación ` +
          `de ${fallos.length} solicitud(es); revisa esos campos.`
        )
      : (
          `Reporte descargado correctamente: ` +
          `${solicitudes.length} solicitudes.`
        );

  } catch (error) {
    console.error(
      "Error al exportar reporte:",
      error
    );

    mensajeReporte.textContent =
      `No fue posible exportar el reporte: ${error.message}`;

  } finally {
    exportandoReporte = false;
    botonExportar.disabled = false;
  }
}

// ==========================================
// EVENTOS
// ==========================================

// Actualizar solicitudes
botonActualizar.addEventListener(
  "click",
  cargarDashboard
);

// Exportar reporte
botonExportar.addEventListener(
  "click",
  exportarReporte
);

// Cerrar sesión
botonCerrarSesion.addEventListener("click", async () => {
  botonCerrarSesion.disabled = true;

  try {
    await cerrarSesion();

  } catch (error) {
    console.error(
      "Error al cerrar sesión:",
      error
    );

    alert("No fue posible cerrar la sesión.");

    botonCerrarSesion.disabled = false;
  }
});

// ==========================================
// INICIALIZAR APLICACIÓN
// ==========================================

(async () => {
  const autorizado = await protegerPagina();

  if (!autorizado) {
    return;
  }

  paginaAutorizada = true;

  await cargarDashboard();
})();
