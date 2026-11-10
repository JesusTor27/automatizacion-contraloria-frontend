
const API_URL =
  "https://automatizacion-contraloria-backend.onrender.com";

// ==========================================
// COMUNICACIÓN CENTRALIZADA CON FASTAPI
// ==========================================

async function solicitarAPI(ruta, opciones = {}) {
  const token = await obtenerTokenAcceso();

  const headers = new Headers(opciones.headers || {});

  headers.set("Authorization", `Bearer ${token}`);

  // Los objetos JSON necesitan Content-Type.
  // FormData debe permitir que el navegador
  // genere su propio Content-Type.

  if (
    opciones.body &&
    !(opciones.body instanceof FormData) &&
    typeof opciones.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers
  });

  if (respuesta.status === 401) {
    throw new Error(
      "No autorizado. Verifica que tu sesión esté activa."
    );
  }

  if (!respuesta.ok) {
    let mensaje = `Error HTTP ${respuesta.status}`;

    try {
      const error = await respuesta.json();

      mensaje = typeof error.detail === "string"
        ? error.detail
        : JSON.stringify(error.detail ?? error);

    } catch {
      // Conservar el mensaje HTTP.
    }

    throw new Error(mensaje);
  }

  if (respuesta.status === 204) {
    return null;
  }

  return respuesta.json();
}

// ==========================================
// SOLICITUDES
// ==========================================

// Consultar todas las solicitudes
async function obtenerSolicitudes() {
  return solicitarAPI("/solicitudes/");
}

// Consultar una solicitud
async function obtenerSolicitud(id) {
  return solicitarAPI(
    `/solicitudes/${encodeURIComponent(id)}`
  );
}

// Validar documentos iniciales
async function validarSolicitud(id) {
  return solicitarAPI(
    `/solicitudes/${encodeURIComponent(id)}/validar`,
    {
      method: "POST"
    }
  );
}

// ==========================================
// DOCUMENTOS
// ==========================================

// Consultar documentos registrados
async function obtenerDocumentos(id) {
  return solicitarAPI(
    `/documentos/${encodeURIComponent(id)}`
  );
}

// Obtener archivo desde Supabase Storage
async function obtenerArchivoDocumento(documentoId) {
  const token = await obtenerTokenAcceso();

  const respuesta = await fetch(
    `${API_URL}/documentos/archivo/${encodeURIComponent(documentoId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!respuesta.ok) {
    throw new Error(
      `No fue posible obtener el documento. HTTP ${respuesta.status}`
    );
  }

  return respuesta.blob();
}

// ==========================================
// PUBLICACIONES
// ==========================================

// Registrar publicación
async function registrarPublicacion(solicitudId, datos) {
  return solicitarAPI(
    `/publicaciones/${encodeURIComponent(solicitudId)}`,
    {
      method: "POST",
      body: datos
    }
  );
}

// Consultar datos de una publicación
async function obtenerPublicacion(solicitudId) {
  return solicitarAPI(
    `/publicaciones/${encodeURIComponent(solicitudId)}`
  );
}

// Corregir una publicación rechazada
async function corregirPublicacion(solicitudId, datos) {
  return solicitarAPI(
    `/publicaciones/${encodeURIComponent(solicitudId)}/corregir`,
    {
      method: "PUT",
      body: datos
    }
  );
}

// ==========================================
// GENERACIÓN DE EVIDENCIAS
// ==========================================

// Generar evidencia Word y PDF
async function generarEvidencia(solicitudId) {
  return solicitarAPI(
    `/evidencias/${encodeURIComponent(solicitudId)}/generar`,
    {
      method: "POST"
    }
  );
}

// ==========================================
// REVISIÓN DE EVIDENCIAS
// ==========================================

// Aprobar evidencia
async function aprobarEvidencia(solicitudId) {
  return solicitarAPI(
    `/revisiones/${encodeURIComponent(solicitudId)}/aprobar`,
    {
      method: "POST",
      body: JSON.stringify({
        observaciones: null
      })
    }
  );
}

// Registrar observación o rechazo
async function observarEvidencia(
  solicitudId,
  observaciones
) {
  return solicitarAPI(
    `/revisiones/${encodeURIComponent(solicitudId)}/observar`,
    {
      method: "POST",
      body: JSON.stringify({
        observaciones: observaciones
      })
    }
  );
}

// ==========================================
// HISTORIAL DE SOLICITUDES
// ==========================================

// Obtener cambios de estado registrados
async function obtenerHistorialSolicitud(solicitudId) {
  return solicitarAPI(
    `/solicitudes/${encodeURIComponent(solicitudId)}/historial`
  );
}
