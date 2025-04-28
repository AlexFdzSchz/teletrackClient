// Funciones de autenticación para TeleTrack

/**
 * Verifica si el usuario está autenticado
 * @param {boolean} checkWithServer - Si es true, verifica también con el servidor si el token es válido
 * @returns {boolean|Promise<boolean>} - true si el usuario tiene un token válido, false en caso contrario
 */
function isAuthenticated(checkWithServer = false) {
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
            
            // Si el servidor devuelve 401, el token no es válido o ha caducado
            if (response.status === 401) {
                // Limpiar datos de autenticación si el token ha caducado
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
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
            window.location.href = './views/login.html';
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
        window.location.href = './views/login.html';
        return null;
    }
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
        window.location.href = './views/login.html';
    }
}

/**
 * Utilidad para manejar peticiones a la API que verifica automáticamente
 * si la respuesta es 401 (Unauthorized) y cierra sesión en ese caso.
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
            await logout();
            return response; // Devolvemos la respuesta original para manejo adicional si es necesario
        }
        
        return response;
    } catch (error) {
        console.error('Error en petición a la API:', error);
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
            throw new Error(data.message || 'Error al iniciar sesión');
        }

        // Guardar token y datos del usuario
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        
        return data;
    } catch (error) {
        console.error('Error de login:', error);
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
            throw new Error(data.message || 'Error en el registro');
        }
        // Guardar token y datos del usuario tras registro exitoso
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        return data;
    } catch (error) {
        console.error('Error en registro:', error);
        throw error;
    }
}
