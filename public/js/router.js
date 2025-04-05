// Router SPA ultra simplificado para TeleTrack

/**
 * Lista de rutas válidas
 */
const validRoutes = [
  './views/fragments/home.html',
  './views/fragments/sessions.html',
  './views/fragments/groups.html',
  './views/fragments/options.html'
];

// Ruta por defecto
const DEFAULT_ROUTE = './views/fragments/home.html';

/**
 * Navega a una ruta específica sin recargar la página
 * @param {string} route - Ruta directa al archivo HTML (ej: './views/fragments/options.html')
 */
function navigate(route) {
  // Verificación básica de autenticación
  if (!isAuthenticated()) {
    window.location.href = './views/login.html';
    return;
  }
  
  // Comprobar si la ruta es válida, sino usar la ruta por defecto
  if (!validRoutes.includes(route)) {
    console.warn('Ruta no válida:', route);
    route = DEFAULT_ROUTE;
  }
  
  // Cargar contenido
  const contentContainer = document.getElementById('content');
  contentContainer.innerHTML = '<div class="text-center text-light py-3"><div class="spinner-border" role="status"></div></div>';
  
  // Cargar el contenido
  fetch(route)
    .then(response => response.ok ? response.text() : Promise.reject('Error al cargar contenido'))
    .then(html => {
      // Limpiar el contenedor antes de insertar nuevo contenido
      // Esto ayuda a evitar problemas con IDs duplicados y la acumulación de event listeners
      contentContainer.innerHTML = '';
      
      // Pequeña pausa para asegurar que todo se ha limpiado
      setTimeout(() => {
        contentContainer.innerHTML = html;
        
        // Ejecutar scripts en el contenido
        executeScripts(contentContainer);
        
        // Actualizar enlaces activos en la navegación
        updateActiveLinks(route);
      }, 50);
    })
    .catch(error => {
      console.error('Error:', error);
      contentContainer.innerHTML = `
        <div class="container mt-3">
          <div class="alert alert-danger">
            <h4>Error al cargar el contenido</h4>
            <button class="btn btn-primary mt-2" onclick="navigate('${DEFAULT_ROUTE}')">Volver al inicio</button>
          </div>
        </div>`;
    });
}

/**
 * Ejecuta los scripts dentro de un contenedor
 * @param {HTMLElement} container - Contenedor que contiene los scripts a ejecutar
 */
function executeScripts(container) {
  const scriptNodes = container.querySelectorAll('script');
  
  // Crear un array para procesar los scripts en orden
  const scripts = Array.from(scriptNodes);
  
  scripts.forEach(oldScript => {
    // Crear un nuevo elemento script
    const newScript = document.createElement('script');
    
    // Copiar todos los atributos
    Array.from(oldScript.attributes).forEach(attr => {
      newScript.setAttribute(attr.name, attr.value);
    });
    

    if (!oldScript.src) {
      newScript.textContent = `
        // Script inyectado por router
        (function() {
          ${oldScript.textContent}
        })();
      `;
    } else {
      newScript.src = oldScript.src;
    }
    
    // Reemplazar el script original con el nuevo
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
}

/**
 * Actualiza los enlaces activos en la navegación
 * @param {string} currentRoute - Ruta actual
 */
function updateActiveLinks(currentRoute) {
  document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
    const routeAttr = link.getAttribute('data-route');
    link.classList.remove('active');
    
    if (routeAttr && currentRoute.includes(routeAttr)) {
      link.classList.add('active');
    }
  });
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  // Cargar contenido inicial
  navigate(DEFAULT_ROUTE);
});
