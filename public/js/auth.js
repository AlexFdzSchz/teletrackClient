// Funciones de autenticación para TeleTrack

/**
 * Verifica si el usuario está autenticado
 * @param {boolean} checkWithServer - Si es true, verifica también con el servidor si el token es válido
 * @param {boolean} cleanOnInvalid - Si es true, limpia la sesión local cuando el token es inválido
 * @returns {boolean|Promise<boolean>} - true si el usuario tiene un token válido, false en caso contrario
 */
function isAuthenticated(checkWithServer = false, cleanOnInvalid = false) {
    const token = localStorage.getItem('authToken');
    
    // Si no hay token, no está autenticado
    if (!token) return checkWithServer ? Promise.resolve(false) : false;
    
    // Modo de compatibilidad: solo verificar existencia del token
    if (!checkWithServer) return true;
    
    // Modo de verificación completa: comprobar validez del token con el servidor
    return new Promise(async (resolve) => {
        try {
            const apiBaseUrl = CONFIG.apiBaseUrl;
            const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            // Si el servidor devuelve 401 o 403, el token no es válido
            if (response.status === 401 || response.status === 403) {
                if (cleanOnInvalid) {
                    // Limpiar datos de autenticación si el token ha caducado
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userData');
                }
                resolve(false);
                return;
            }
            
            // Si la respuesta es exitosa, el token es válido
            if (response.ok) {
                resolve(true);
                return;
            }
            
            // Para cualquier otro error, consideramos que no está autenticado
            resolve(false);
        } catch (error) {
            console.error('Error al verificar autenticación con el servidor:', error);
            // En caso de error de red, consideramos que podría estar autenticado si tiene token
            // No limpiamos la sesión en caso de error de conectividad
            resolve(true);
        }
    });
}

/**
 * Verifica si el usuario está autenticado y muestra el contenido apropiadamente.
 * Si el usuario no está autenticado, redirige a login.html.
 * @param {boolean} checkWithServer - Si es true, verifica también con el servidor
 * @returns {Promise<Object|null>} - Promesa con datos del usuario si está autenticado, null en caso contrario
 */
async function checkAuthentication(checkWithServer = true) {
    try {
        const authenticated = checkWithServer 
            ? await isAuthenticated(true) 
            : isAuthenticated();
        
        if (!authenticated) {
            console.log('Usuario no autenticado, redirigiendo a login.html');
            redirectToLogin('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
            return null;
        } else {
            const contentElement = document.getElementById('content');
            if (contentElement) {
                contentElement.classList.remove('d-none');
            }
            
            // Obtener y devolver los datos del usuario
            try {
                const userDataString = localStorage.getItem('userData');
                if (userDataString) {
                    return JSON.parse(userDataString);
                }
            } catch (error) {
                console.error('Error al obtener datos del usuario:', error);
            }
            
            return {}; 
        }
    } catch (error) {
        console.error('Error en la verificación de autenticación:', error);
        redirectToLogin('Error de conexión con el servidor. Por favor, intenta iniciar sesión nuevamente.');
        return null;
    }
}

/**
 * Redirige a la página de login con un mensaje de error opcional
 * @param {string} errorMessage - Mensaje de error a mostrar
 * @param {string} errorType - Tipo de error (session_expired, server_error, network_error, etc.)
 */
function redirectToLogin(errorMessage = '', errorType = 'session_expired') {
    // Determinar la ruta correcta según dónde estemos
    const isInViewsFolder = window.location.pathname.includes('/views/');
    let loginUrl = isInViewsFolder ? './login.html' : './views/login.html';
    
    // Añadir parámetros de error si se proporcionan
    if (errorMessage) {
        const params = new URLSearchParams();
        params.append('error', errorMessage);
        params.append('error_type', errorType);
        loginUrl += '?' + params.toString();
    }
    
    window.location.href = loginUrl;
}

/**
 * Cierra la sesión del usuario y redirige a login.html
 */
async function logout() {
    try {
        // Obtener el token de autenticación
        const token = localStorage.getItem('authToken');
        if (token) {
            // Llamar a la API para registrar el logout 
            const apiBaseUrl = CONFIG.apiBaseUrl;
            // No usar handleApiRequest aquí para evitar recursión infinita
            await fetch(`${apiBaseUrl}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });
        }
    } catch (error) {
        console.error('Error al cerrar sesión en el servidor:', error);
    } finally {
        // Limpiar datos locales incluso si falla la llamada a la API
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        
        // Redirigir con mensaje de logout exitoso
        redirectToLogin('Has cerrado sesión correctamente.', 'logout_success');
    }
}

/**
 * Utilidad para manejar peticiones a la API que verifica automáticamente
 * si la respuesta es 401 (Unauthorized) y cierra sesión en ese caso.
 * También maneja errores de conectividad y otros errores del servidor.
 * 
 * @param {string} url - URL de la petición
 * @param {Object} options - Opciones de fetch
 * @returns {Promise<Response>} - Promesa con la respuesta
 */
async function handleApiRequest(url, options = {}) {
    try {
        const response = await fetch(url, options);
        
        // Si la respuesta es 401 Unauthorized, el token ha expirado
        if (response.status === 401) {
            console.warn('Sesión expirada o token inválido. Cerrando sesión...');
            redirectToLogin('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'session_expired');
            return response; 
        }
        
        // Si la respuesta es 403 Forbidden
        if (response.status === 403) {
            console.warn('Acceso denegado.');
            redirectToLogin('No tienes permisos para acceder a este recurso.', 'access_denied');
            return response;
        }
        
        // Si la respuesta es 500 o superior (errores del servidor)
        if (response.status >= 500) {
            console.error('Error del servidor:', response.status);
            redirectToLogin('Error interno del servidor. Por favor, intenta más tarde.', 'server_error');
            return response;
        }
        
        return response;
    } catch (error) {
        console.error('Error en petición a la API:', error);
        
        // Verificar si es un error de conectividad
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            redirectToLogin('No se puede conectar con el servidor. Verifica tu conexión a internet.', 'network_error');
        } else {
            redirectToLogin('Error de conexión con el servidor. Por favor, intenta más tarde.', 'network_error');
        }
        
        throw error;
    }
}

/**
 * Inicia sesión con la API
 * @param {string} email - Correo electrónico del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise} - Promesa con el resultado del login
 */
async function login(email, password) {
    try {
        // Acceder a CONFIG que está disponible globalmente
        const apiBaseUrl = CONFIG.apiBaseUrl;
        // No usar handleApiRequest para login ya que no tenemos token aún
        const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            // Personalizar mensajes de error según el código de estado
            let errorMessage;
            switch (response.status) {
                case 401:
                    errorMessage = 'Correo electrónico o contraseña incorrectos.';
                    break;
                case 403:
                    errorMessage = 'Tu cuenta ha sido suspendida. Contacta al administrador.';
                    break;
                case 429:
                    errorMessage = 'Demasiados intentos de inicio de sesión. Intenta más tarde.';
                    break;
                case 500:
                case 502:
                case 503:
                    errorMessage = 'Error del servidor. Por favor, intenta más tarde.';
                    break;
                default:
                    errorMessage = data.message || 'Error al iniciar sesión';
            }
            throw new Error(errorMessage);
        }

        // Guardar token y datos del usuario
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        
        return data;
    } catch (error) {
        console.error('Error de login:', error);
        
        // Si es un error de red/conectividad
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('No se puede conectar con el servidor. Verifica tu conexión a internet.');
        }
        
        throw error;
    }
}

/**
 * Registra un nuevo usuario con la API
 * @param {string} firstName - Nombre del usuario
 * @param {string} lastName - Apellido del usuario
 * @param {string} nickname - Apodo del usuario
 * @param {string} email - Correo electrónico del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise} - Promesa con el resultado del registro
 */
async function register(firstName, lastName, nickname, email, password) {
    try {
        const apiBaseUrl = CONFIG.apiBaseUrl;
        // No usar handleApiRequest para registro ya que no tenemos token aún
        const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ firstName, lastName, nickname, email, password })
        });
        const data = await response.json();
        
        if (!response.ok) {
            // Personalizar mensajes de error según el código de estado
            let errorMessage;
            switch (response.status) {
                case 400:
                    errorMessage = data.message || 'Datos de registro inválidos. Verifica que todos los campos estén correctos.';
                    break;
                case 409:
                    errorMessage = 'Ya existe una cuenta con este correo electrónico.';
                    break;
                case 422:
                    errorMessage = 'Los datos proporcionados no son válidos. Verifica el formato del correo y la longitud de la contraseña.';
                    break;
                case 500:
                case 502:
                case 503:
                    errorMessage = 'Error del servidor. Por favor, intenta más tarde.';
                    break;
                default:
                    errorMessage = data.message || 'Error en el registro';
            }
            throw new Error(errorMessage);
        }
        
        // Guardar token y datos del usuario tras registro exitoso
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        return data;
    } catch (error) {
        console.error('Error en registro:', error);
        
        // Si es un error de red/conectividad
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('No se puede conectar con el servidor. Verifica tu conexión a internet.');
        }
        
        throw error;
    }
}

/**
 * Verifica si el servidor está disponible
 * @returns {Promise<boolean>} - true si el servidor responde, false en caso contrario
 */
async function checkServerHealth() {
    try {
        const apiBaseUrl = CONFIG.apiBaseUrl;
        const response = await fetch(`${apiBaseUrl}/api/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        return response.ok;
    } catch (error) {
        console.error('Error al verificar salud del servidor:', error);
        return false;
    }
}

/**
 * Obtiene los parámetros de URL
 * @returns {URLSearchParams} - Objeto con los parámetros de la URL
 */
function getUrlParams() {
    return new URLSearchParams(window.location.search);
}

/**
 * Maneja errores de forma centralizada y los muestra al usuario
 * @param {Error} error - El error a manejar
 * @param {HTMLElement} errorElement - Elemento HTML donde mostrar el error
 * @param {string} defaultMessage - Mensaje por defecto si no se puede determinar el error
 */
function handleError(error, errorElement, defaultMessage = 'Ha ocurrido un error inesperado') {
    let errorMessage = defaultMessage;
    
    if (error && error.message) {
        errorMessage = error.message;
    }
    
    if (errorElement) {
        errorElement.textContent = errorMessage;
        errorElement.classList.remove('d-none');
    }
    
    console.error('Error manejado:', error);
}

/**
 * Limpia todos los mensajes de error visibles
 * @param {HTMLElement[]} errorElements - Array de elementos de error a ocultar
 */
function clearErrors(errorElements) {
    errorElements.forEach(element => {
        if (element) {
            element.classList.add('d-none');
        }
    });
}

/**
 * Verifica autenticación de forma segura para la página de login
 * Evita bucles infinitos y maneja errores apropiadamente
 * @returns {Promise<void>}
 */
async function checkAuthentication() {
    try {
        // Primero verificar si hay token localmente
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            // No hay token, está bien estar en login
            return;
        }
        
        // Si hay token, verificar con el servidor
        const apiBaseUrl = CONFIG.apiBaseUrl;
        
        // Intentar verificar con el servidor
        const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            // El token es válido, redirigir a index
            console.log('Usuario ya autenticado, redirigiendo al dashboard');
            window.location.href = '../index.html';
            return;
        }
        
        if (response.status === 401) {
            // Token inválido o expirado, limpiar sesión
            console.log('Token expirado o inválido, limpiando sesión local');
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            
            // Mostrar mensaje si no hay otros errores ya mostrados
            const urlParams = getUrlParams();
            if (!urlParams.get('error')) {
                const loginErrorElement = document.getElementById('loginError');
                if (loginErrorElement) {
                    loginErrorElement.textContent = 'Tu sesión anterior ha expirado. Por favor, inicia sesión nuevamente.';
                    loginErrorElement.classList.remove('d-none');
                }
            }
            return;
        }
        
        if (response.status === 403) {
            // Acceso denegado, limpiar sesión
            console.log('Acceso denegado, limpiando sesión local');
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            
            const urlParams = getUrlParams();
            if (!urlParams.get('error')) {
                const loginErrorElement = document.getElementById('loginError');
                if (loginErrorElement) {
                    loginErrorElement.textContent = 'Tu cuenta ha sido suspendida. Contacta al administrador.';
                    loginErrorElement.classList.remove('d-none');
                }
            }
            return;
        }
        
        if (response.status >= 500) {
            // Error del servidor, no limpiar sesión local (podría ser temporal)
            console.log('Error del servidor, manteniendo sesión local');
            const urlParams = getUrlParams();
            if (!urlParams.get('error')) {
                const loginErrorElement = document.getElementById('loginError');
                if (loginErrorElement) {
                    loginErrorElement.textContent = 'Error del servidor. Tu sesión se mantendrá para cuando el servidor esté disponible.';
                    loginErrorElement.classList.remove('d-none');
                }
            }
            return;
        }
        
    } catch (error) {
        // Error de conectividad o red
        console.log('Error de conectividad, manteniendo sesión local:', error);
        
        // No limpiar la sesión en caso de error de red
        // El usuario podrá intentar de nuevo cuando mejore la conexión
        const urlParams = getUrlParams();
        if (!urlParams.get('error')) {
            const loginErrorElement = document.getElementById('loginError');
            if (loginErrorElement) {
                loginErrorElement.textContent = 'Error de conexión. Tu sesión se mantendrá para cuando mejore la conectividad.';
                loginErrorElement.classList.remove('d-none');
            }
        }
        return;
    }
}
