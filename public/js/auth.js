// Funciones de autenticación para TeleTrack

/**
 * Verifica si el usuario está autenticado
 * @returns {boolean} - true si el usuario tiene un token válido, false en caso contrario
 */
function isAuthenticated() {
    const token = localStorage.getItem('authToken');
    return !!token; 
}

/**
 * Verifica si el usuario está autenticado y muestra el contenido apropiadamente.
 * Si el usuario no está autenticado, redirige a login.html.
 * @returns {Object|null} - Datos del usuario si está autenticado, null en caso contrario
 */
function checkAuthentication() {
    if (!isAuthenticated()) {
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
 * Inicia sesión con la API
 * @param {string} email - Correo electrónico del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise} - Promesa con el resultado del login
 */
async function login(email, password) {
    try {
        // Acceder a CONFIG que está disponible globalmente
        const apiBaseUrl = CONFIG.apiBaseUrl;
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
