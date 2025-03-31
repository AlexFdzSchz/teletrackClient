/**
 * Verifica si el usuario está autenticado y muestra u oculta el contenido apropiadamente.
 * Si el usuario no está autenticado, redirige a la página de login.
 * @param {string} contentElementId - ID del elemento que contiene el contenido principal
 * @param {string} loginPath - Ruta a la página de login (opcional)
 * @returns {Object|null} - Datos del usuario si está autenticado, null en caso contrario
 */
function checkAuthentication(contentElementId = 'content', loginPath) {
    // Verificar autenticación
    if (!isAuthenticated()) {
        // Usuario no autenticado, redirigir a login
        const redirectPath = loginPath || './views/pages/login.html';
        window.location.href = redirectPath;
        return null;
    } else {
        // Usuario autenticado, mostrar contenido
        const contentElement = document.getElementById(contentElementId);
        if (contentElement) {
            contentElement.style.display = 'block';
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

window.checkAuthentication = checkAuthentication;
