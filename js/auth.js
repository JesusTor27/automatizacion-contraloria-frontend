const SUPABASE_URL = "https://fgnaggwgxmxdluuazjqd.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_WM6b2pH_77LzlVaMqqgsDQ_UQ8l-s2W";

const authClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLIC_KEY
);

// Iniciar sesión
async function iniciarSesion(email, password) {
  const { data, error } =
    await authClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Consultar usuario autenticado
async function obtenerUsuario() {
  const { data, error } = await authClient.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

// Cerrar sesión
async function cerrarSesion() {
  const { error } = await authClient.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }

  window.location.replace("/login.html");
}

// Comprobar autenticación antes de mostrar una página
async function protegerPagina() {
  try {
    const usuario = await obtenerUsuario();

    if (!usuario) {
      window.location.replace("/login.html");
      return false;
    }

    return true;

  } catch (error) {
    console.error("Error de autenticación:", error);
    window.location.replace("/login.html");
    return false;
  }
}

// Obtener el token para las futuras peticiones protegidas
async function obtenerTokenAcceso() {
  const { data, error } = await authClient.auth.getSession();

  if (error || !data.session?.access_token) {
    throw new Error(
      "Tu sesión ha expirado. Inicia sesión nuevamente."
    );
  }

  return data.session.access_token;
}