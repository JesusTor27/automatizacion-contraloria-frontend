
const parametros = new URLSearchParams(window.location.search);
const solicitudId = parametros.get("id");

// ==========================================
// ELEMENTOS DE VALIDACIÓN
// ==========================================

const botonValidar =
  document.getElementById("validar-documentos");

const resultadoValidacion =
  document.getElementById("resultado-validacion");

const listaDocumentos =
  document.getElementById("lista-documentos");

// ==========================================
// ELEMENTOS DE PUBLICACIÓN
// ==========================================

const seccionPublicacion =
  document.getElementById("seccion-publicacion");

const formularioPublicacion =
  document.getElementById("form-publicacion");

const botonPublicacion =
  document.getElementById("btn-registrar-publicacion");

const resultadoPublicacion =
  document.getElementById("resultado-publicacion");

// ==========================================
// ELEMENTOS DE EVIDENCIAS
// ==========================================

const seccionEvidencia =
  document.getElementById("seccion-evidencia");

const botonGenerarEvidencia =
  document.getElementById("btn-generar-evidencia");

const resultadoEvidencia =
  document.getElementById("resultado-evidencia");

// ==========================================
// ELEMENTOS DE REVISIÓN
// ==========================================

const seccionRevision =
  document.getElementById("seccion-revision");

const botonAprobarEvidencia =
  document.getElementById("btn-aprobar-evidencia");

const botonObservarEvidencia =
  document.getElementById("btn-observar-evidencia");

const campoObservaciones =
  document.getElementById("observaciones-revision");

const resultadoRevision =
  document.getElementById("resultado-revision");

// ==========================================
// ELEMENTOS DE CORRECCIÓN
// ==========================================

const seccionCorreccion =
  document.getElementById("seccion-correccion");

const formularioCorreccion =
  document.getElementById("form-correccion");

const botonGuardarCorreccion =
  document.getElementById("btn-guardar-correccion");

const resultadoCorreccion =
  document.getElementById("resultado-correccion");

const campoCorreccionFecha =
  document.getElementById("correccion-fecha");

const campoCorreccionUrl =
  document.getElementById("correccion-url");

const campoCorreccionResponsable =
  document.getElementById("correccion-responsable");

const campoCorreccionCaptura =
  document.getElementById("correccion-captura");

// ==========================================
// AUTENTICACIÓN
// ==========================================

const botonCerrarSesion =
  document.getElementById("cerrar-sesion");

// ==========================================
// ESTADO LOCAL
// ==========================================

let publicacionRegistrada = false;
let estadoActual = null;
let documentosCargados = false;
let paginaAutorizada = false;

let correccionGuardada = false;
let datosCorreccionCargados = false;

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function escribir(id, valor) {
  document.getElementById(id).textContent =
    valor ?? "No especificado";
}

function fechaLegible(fecha) {
  if (!fecha) {
    return "No especificada";
  }

  const valor = new Date(fecha);

  return Number.isNaN(valor.getTime())
    ? "No especificada"
    : valor.toLocaleString("es-CO");
}

// ==========================================
// NOMBRES VISIBLES DE LOS ESTADOS
// ==========================================

function obtenerEstadoVisible(estado) {
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

  return nombres[estado] || estado || "DESCONOCIDO";
}

// ==========================================
// VALIDAR CAPTURA DE PANTALLA
// ==========================================

function validarCaptura(archivo) {
  if (!archivo) {
    throw new Error(
      "Debes seleccionar una captura de pantalla."
    );
  }

  if (!["image/png", "image/jpeg"].includes(archivo.type)) {
    throw new Error(
      "La captura debe ser PNG o JPG."
    );
  }

  if (archivo.size > 10 * 1024 * 1024) {
    throw new Error(
      "La captura no puede superar los 10 MB."
    );
  }

  return true;
}

// ==========================================
// CONTROL DE SECCIONES
// ==========================================


function actualizarSecciones() {
  // Registro inicial
  seccionPublicacion.hidden =
    !documentosCargados ||
    estadoActual !== "LISTA_PARA_PUBLICAR" ||
    publicacionRegistrada;

  // Primera generación de evidencia
  const primeraGeneracion =
    documentosCargados &&
    publicacionRegistrada &&
    estadoActual === "LISTA_PARA_PUBLICAR";

  // Regeneración tras guardar una corrección
  const regeneracion =
    documentosCargados &&
    estadoActual === "OBSERVADA" &&
    correccionGuardada;

  const puedeGenerar =
    primeraGeneracion || regeneracion;

  const evidenciaYaGenerada = [
    "EVIDENCIA_GENERADA",
    "EVIDENCIA_APROBADA",
    "RESPONDIDA"
  ].includes(estadoActual);

  seccionEvidencia.hidden =
    !puedeGenerar && !evidenciaYaGenerada;

  botonGenerarEvidencia.disabled = !puedeGenerar;

  botonGenerarEvidencia.textContent = regeneracion
    ? "Generar nueva evidencia DOCX/PDF"
    : "Generar evidencia DOCX/PDF";

  if (regeneracion) {
    resultadoEvidencia.textContent =
      "Las correcciones están guardadas. " +
      "Genera una nueva versión para revisión.";
  } else if (evidenciaYaGenerada) {
    resultadoEvidencia.textContent =
      "La evidencia fue generada. " +
      "Puedes consultar los documentos registrados.";
  }

  // Aprobar o rechazar
  const puedeRevisar =
    documentosCargados &&
    estadoActual === "EVIDENCIA_GENERADA";

  seccionRevision.hidden = !puedeRevisar;

  botonAprobarEvidencia.disabled = !puedeRevisar;
  botonObservarEvidencia.disabled = !puedeRevisar;

  // Corrección de evidencia rechazada
  const puedeCorregir =
    documentosCargados &&
    estadoActual === "OBSERVADA" &&
    !correccionGuardada;

  seccionCorreccion.hidden = !puedeCorregir;
}

// ==========================================
// MOSTRAR SOLICITUD
// ==========================================

function mostrarSolicitud(solicitud) {
  // Conservar el estado original para la lógica
  estadoActual = solicitud.estado;

  escribir("asunto", solicitud.asunto);

  // Mostrar el nombre amigable en pantalla
  escribir(
    "estado",
    obtenerEstadoVisible(solicitud.estado)
  );

  escribir("remitente", solicitud.remitente);

  escribir(
    "fecha",
    fechaLegible(solicitud.fecha_recepcion)
  );

  escribir("codigo", solicitud.codigo_publicacion);
  escribir("solicitud-id", solicitud.id);

  botonValidar.disabled = ![
    "RECIBIDA",
    "PENDIENTE"
  ].includes(solicitud.estado);

  actualizarSecciones();
}

// ==========================================
// MOSTRAR DOCUMENTOS
// ==========================================

function mostrarDocumentos(documentos) {
  listaDocumentos.replaceChildren();

  publicacionRegistrada = documentos.some(
    documento =>
      documento.tipo === "CAPTURA_PUBLICACION"
  );

  documentosCargados = true;

  actualizarSecciones();

  escribir(
    "mensaje-documentos",
    documentos.length
      ? `${documentos.length} documento(s) registrado(s).`
      : "No hay documentos asociados."
  );

  for (const documento of documentos) {
    const elemento = document.createElement("div");
    elemento.className = "documento-item";

    const informacion = document.createElement("div");

    const nombre = document.createElement("strong");
    nombre.textContent = documento.nombre_archivo;

    const tipo = document.createElement("span");
    tipo.textContent = documento.tipo;

    informacion.append(nombre, tipo);

    const acciones = document.createElement("div");
    acciones.className = "documento-acciones";

    // ==========================================
    // BOTÓN VER
    // ==========================================

    const botonVer = document.createElement("button");

    botonVer.type = "button";
    botonVer.textContent = "Ver";

    botonVer.addEventListener("click", async () => {
      botonVer.disabled = true;

      try {
        const archivo =
          await obtenerArchivoDocumento(documento.id);

        const urlTemporal =
          URL.createObjectURL(archivo);

        const ventana = window.open(
          urlTemporal,
          "_blank",
          "noopener"
        );

        if (!ventana) {
          console.warn(
            "El navegador podría haber bloqueado la ventana."
          );
        }

        setTimeout(() => {
          URL.revokeObjectURL(urlTemporal);
        }, 60000);

      } catch (error) {
        console.error(
          "Error al visualizar documento:",
          error
        );

        alert(error.message);

      } finally {
        botonVer.disabled = false;
      }
    });

    // ==========================================
    // BOTÓN DESCARGAR
    // ==========================================

    const botonDescargar =
      document.createElement("button");

    botonDescargar.type = "button";
    botonDescargar.textContent = "Descargar";

    botonDescargar.addEventListener("click", async () => {
      botonDescargar.disabled = true;

      try {
        const archivo =
          await obtenerArchivoDocumento(documento.id);

        const urlTemporal =
          URL.createObjectURL(archivo);

        const enlace = document.createElement("a");

        enlace.href = urlTemporal;
        enlace.download = documento.nombre_archivo;

        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        setTimeout(() => {
          URL.revokeObjectURL(urlTemporal);
        }, 60000);

      } catch (error) {
        console.error(
          "Error al descargar documento:",
          error
        );

        alert(error.message);

      } finally {
        botonDescargar.disabled = false;
      }
    });

    acciones.append(
      botonVer,
      botonDescargar
    );

    elemento.append(
      informacion,
      acciones
    );

    listaDocumentos.appendChild(elemento);
  }
}

// ==========================================
// CARGAR DATOS PARA CORRECCIÓN
// ==========================================

async function cargarDatosCorreccion() {
  if (
    !paginaAutorizada ||
    estadoActual !== "OBSERVADA" ||
    correccionGuardada ||
    datosCorreccionCargados
  ) {
    return;
  }

  try {
    resultadoCorreccion.textContent =
      "Consultando datos de publicación...";

    const publicacion =
      await obtenerPublicacion(solicitudId);

    campoCorreccionFecha.value =
      String(
        publicacion.fecha_publicacion || ""
      ).slice(0, 10);

    campoCorreccionUrl.value =
      publicacion.url_publicacion || "";

    campoCorreccionResponsable.value =
      publicacion.responsable || "";

    datosCorreccionCargados = true;

    resultadoCorreccion.textContent = "";

  } catch (error) {
    console.error(
      "Error al cargar la publicación:",
      error
    );

    resultadoCorreccion.textContent =
      `No fue posible cargar los datos: ${error.message}`;
  }
}

// ==========================================
// CARGAR DETALLE DE SOLICITUD
// ==========================================

async function cargarDetalle() {
  if (!paginaAutorizada) {
    return;
  }

  if (!solicitudId) {
    escribir(
      "error-general",
      "No se indicó una solicitud."
    );

    return;
  }

  seccionPublicacion.hidden = true;
  seccionEvidencia.hidden = true;
  seccionRevision.hidden = true;
  seccionCorreccion.hidden = true;

  try {
    const [solicitud, documentos] =
      await Promise.all([
        obtenerSolicitud(solicitudId),
        obtenerDocumentos(solicitudId)
      ]);

    mostrarSolicitud(solicitud);
    mostrarDocumentos(documentos);

    if (solicitud.estado === "OBSERVADA") {
      await cargarDatosCorreccion();
    }

  } catch (error) {
    console.error(
      "Error al cargar detalle:",
      error
    );

    escribir(
      "error-general",
      error.message
    );
  }
}

// ==========================================
// VALIDAR DOCUMENTOS
// ==========================================

async function ejecutarValidacion() {
  if (!paginaAutorizada) {
    return;
  }

  botonValidar.disabled = true;

  resultadoValidacion.textContent =
    "Validando documentos...";

  try {
    await validarSolicitud(solicitudId);

    const solicitudActualizada =
      await obtenerSolicitud(solicitudId);

    mostrarSolicitud(solicitudActualizada);

    resultadoValidacion.textContent =
      `Validación ejecutada. Estado actual: ${obtenerEstadoVisible(solicitudActualizada.estado)
      }`;

  } catch (error) {
    console.error(
      "Error de validación:",
      error
    );

    resultadoValidacion.textContent =
      `No fue posible validar la solicitud: ${error.message}`;

    try {
      const solicitud =
        await obtenerSolicitud(solicitudId);

      mostrarSolicitud(solicitud);

    } catch (consultaError) {
      console.error(consultaError);
    }
  }
}

// ==========================================
// REGISTRAR PUBLICACIÓN
// ==========================================

async function ejecutarRegistroPublicacion(evento) {
  evento.preventDefault();

  if (!paginaAutorizada) {
    return;
  }

  if (publicacionRegistrada) {
    resultadoPublicacion.textContent =
      "Esta solicitud ya tiene una publicación registrada.";

    actualizarSecciones();
    return;
  }

  if (estadoActual !== "LISTA_PARA_PUBLICAR") {
    resultadoPublicacion.textContent =
      "La solicitud no está lista para registrar una publicación.";

    return;
  }

  const fecha = document.getElementById(
    "fecha-publicacion"
  ).value;

  const url = document.getElementById(
    "url-publicacion"
  ).value.trim();

  const responsable = document.getElementById(
    "responsable-publicacion"
  ).value.trim();

  const archivo = document.getElementById(
    "captura-publicacion"
  ).files[0];

  if (!fecha || !url || !responsable || !archivo) {
    resultadoPublicacion.textContent =
      "Debes completar todos los campos.";

    return;
  }

  try {
    validarCaptura(archivo);

  } catch (error) {
    resultadoPublicacion.textContent =
      error.message;

    return;
  }

  const datos = new FormData();

  datos.append("fecha_publicacion", fecha);
  datos.append("url_publicacion", url);
  datos.append("responsable", responsable);
  datos.append("captura", archivo);

  botonPublicacion.disabled = true;

  resultadoPublicacion.textContent =
    "Registrando publicación...";

  try {
    await registrarPublicacion(
      solicitudId,
      datos
    );

    publicacionRegistrada = true;
    actualizarSecciones();

    const [
      solicitudActualizada,
      documentosActualizados
    ] = await Promise.all([
      obtenerSolicitud(solicitudId),
      obtenerDocumentos(solicitudId)
    ]);

    mostrarSolicitud(solicitudActualizada);
    mostrarDocumentos(documentosActualizados);

    resultadoPublicacion.textContent =
      "Publicación registrada correctamente.";

  } catch (error) {
    console.error(
      "Error al registrar publicación:",
      error
    );

    resultadoPublicacion.textContent =
      `No fue posible registrar la publicación: ${error.message}`;

  } finally {
    botonPublicacion.disabled = false;
  }
}

// ==========================================
// GENERAR EVIDENCIAS DOCX/PDF
// ==========================================


async function ejecutarGeneracionEvidencia() {
  if (!paginaAutorizada) return;

  const primeraGeneracion =
    publicacionRegistrada &&
    estadoActual === "LISTA_PARA_PUBLICAR";

  const regeneracion =
    estadoActual === "OBSERVADA" &&
    correccionGuardada;

  if (!primeraGeneracion && !regeneracion) {
    resultadoEvidencia.textContent =
      "Primero debes registrar o corregir la publicación.";
    return;
  }

  botonGenerarEvidencia.disabled = true;

  resultadoEvidencia.textContent = regeneracion
    ? "Generando nueva versión de la evidencia..."
    : "Generando documentos Word y PDF...";

  try {
    const resultado = await generarEvidencia(solicitudId);

    const [solicitud, documentos] = await Promise.all([
      obtenerSolicitud(solicitudId),
      obtenerDocumentos(solicitudId)
    ]);

    correccionGuardada = false;
    datosCorreccionCargados = false;

    mostrarSolicitud(solicitud);
    mostrarDocumentos(documentos);

    const version = resultado.version;

    resultadoEvidencia.textContent =
      `Evidencia versión ${version} generada correctamente.`;

    alert(
      `Evidencia v${version} generada correctamente. ` +
      "La solicitud está nuevamente en revisión."
    );

  } catch (error) {
    console.error("Error al generar evidencia:", error);

    resultadoEvidencia.textContent =
      `No fue posible generar la evidencia: ${error.message}`;

  } finally {
    actualizarSecciones();
  }
}


// ==========================================
// APROBAR EVIDENCIA
// ==========================================

async function ejecutarAprobacionEvidencia() {
  if (
    !paginaAutorizada ||
    estadoActual !== "EVIDENCIA_GENERADA"
  ) {
    return;
  }

  const confirmar = window.confirm(
    "¿Confirmas que revisaste la evidencia y deseas aprobarla?"
  );

  if (!confirmar) {
    return;
  }

  botonAprobarEvidencia.disabled = true;
  botonObservarEvidencia.disabled = true;

  resultadoRevision.textContent =
    "Aprobando evidencia...";

  try {
    await aprobarEvidencia(solicitudId);

    const [solicitud, documentos] =
      await Promise.all([
        obtenerSolicitud(solicitudId),
        obtenerDocumentos(solicitudId)
      ]);

    mostrarSolicitud(solicitud);
    mostrarDocumentos(documentos);

    resultadoRevision.textContent =
      "Evidencia aprobada correctamente.";

    alert(
      "Evidencia aprobada correctamente. " +
      "La solicitud quedó lista para el proceso de respuesta."
    );

  } catch (error) {
    console.error(
      "Error al aprobar evidencia:",
      error
    );

    resultadoRevision.textContent =
      `No fue posible aprobar la evidencia: ${error.message}`;

  } finally {
    actualizarSecciones();
  }
}

// ==========================================
// RECHAZAR EVIDENCIA
// ==========================================

async function ejecutarObservacionEvidencia() {
  if (
    !paginaAutorizada ||
    estadoActual !== "EVIDENCIA_GENERADA"
  ) {
    return;
  }

  const observaciones =
    campoObservaciones.value.trim();

  if (!observaciones) {
    resultadoRevision.textContent =
      "Debes escribir el motivo del rechazo.";

    campoObservaciones.focus();
    return;
  }

  const confirmar = window.confirm(
    "¿Confirmas que deseas rechazar esta evidencia? " +
    "Deberá corregirse antes de su aprobación."
  );

  if (!confirmar) {
    return;
  }

  botonAprobarEvidencia.disabled = true;
  botonObservarEvidencia.disabled = true;

  resultadoRevision.textContent =
    "Registrando rechazo...";

  try {
    await observarEvidencia(
      solicitudId,
      observaciones
    );

    const [solicitud, documentos] =
      await Promise.all([
        obtenerSolicitud(solicitudId),
        obtenerDocumentos(solicitudId)
      ]);

    mostrarSolicitud(solicitud);
    mostrarDocumentos(documentos);

    resultadoRevision.textContent =
      "Evidencia rechazada correctamente.";

    // Activar corrección cuando pase a OBSERVADA
    if (solicitud.estado === "OBSERVADA") {
      correccionGuardada = false;
      datosCorreccionCargados = false;

      actualizarSecciones();

      await cargarDatosCorreccion();
    }

    alert(
      "Evidencia rechazada correctamente. " +
      "Ahora puedes corregir la publicación."
    );

  } catch (error) {
    console.error(
      "Error al rechazar evidencia:",
      error
    );

    resultadoRevision.textContent =
      `No fue posible registrar el rechazo: ${error.message}`;

  } finally {
    actualizarSecciones();
  }
}

// ==========================================
// GUARDAR CORRECCIÓN DE PUBLICACIÓN
// ==========================================

async function ejecutarCorreccionPublicacion(evento) {
  evento.preventDefault();

  if (
    !paginaAutorizada ||
    estadoActual !== "OBSERVADA" ||
    correccionGuardada
  ) {
    return;
  }

  const fecha = campoCorreccionFecha.value;

  const url =
    campoCorreccionUrl.value.trim();

  const responsable =
    campoCorreccionResponsable.value.trim();

  const captura =
    campoCorreccionCaptura.files[0];

  if (!fecha || !url || !responsable || !captura) {
    resultadoCorreccion.textContent =
      "Completa todos los campos y selecciona una captura.";

    return;
  }

  try {
    validarCaptura(captura);

  } catch (error) {
    resultadoCorreccion.textContent =
      error.message;

    return;
  }

  const confirmar = window.confirm(
    "¿Deseas guardar las correcciones de esta publicación?"
  );

  if (!confirmar) {
    return;
  }

  const datos = new FormData();

  datos.append("fecha_publicacion", fecha);
  datos.append("url_publicacion", url);
  datos.append("responsable", responsable);
  datos.append("captura", captura);

  botonGuardarCorreccion.disabled = true;

  resultadoCorreccion.textContent =
    "Guardando correcciones...";

  try {
    await corregirPublicacion(
      solicitudId,
      datos
    );

    correccionGuardada = true;

    actualizarSecciones();

    resultadoCorreccion.textContent =
      "Correcciones guardadas correctamente.";

    const [solicitud, documentos] =
      await Promise.all([
        obtenerSolicitud(solicitudId),
        obtenerDocumentos(solicitudId)
      ]);

    mostrarSolicitud(solicitud);
    mostrarDocumentos(documentos);

    alert(
      "Correcciones guardadas correctamente. " +
      "La nueva captura quedó registrada y " +
      "la anterior se conservó."
    );

  } catch (error) {
    console.error(
      "Error al guardar corrección:",
      error
    );

    resultadoCorreccion.textContent =
      `No fue posible guardar las correcciones: ${error.message}`;

  } finally {
    botonGuardarCorreccion.disabled = false;
  }
}

// ==========================================
// EVENTOS
// ==========================================

// Validar documentos
botonValidar.addEventListener(
  "click",
  ejecutarValidacion
);

// Registrar publicación
formularioPublicacion.addEventListener(
  "submit",
  ejecutarRegistroPublicacion
);

// Generar evidencia
botonGenerarEvidencia.addEventListener(
  "click",
  ejecutarGeneracionEvidencia
);

// Aprobar evidencia
botonAprobarEvidencia.addEventListener(
  "click",
  ejecutarAprobacionEvidencia
);

// Rechazar evidencia
botonObservarEvidencia.addEventListener(
  "click",
  ejecutarObservacionEvidencia
);

// Guardar correcciones
formularioCorreccion.addEventListener(
  "submit",
  ejecutarCorreccionPublicacion
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
// INICIALIZAR DETALLE PROTEGIDO
// ==========================================

(async () => {
  const autorizado = await protegerPagina();

  if (!autorizado) {
    return;
  }

  paginaAutorizada = true;

  await cargarDetalle();
})();
