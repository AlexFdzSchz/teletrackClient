class NavBar extends HTMLElement {
  connectedCallback() {
    // Verificar si el usuario está autenticado
    const isUserLoggedIn = typeof isAuthenticated === 'function' ? isAuthenticated() : false;

    // Obtener información del usuario si está autenticado
    const userName = isUserLoggedIn && localStorage.getItem('userData') ?
      JSON.parse(localStorage.getItem('userData')).nickname || 'Usuario' : '';

    // Determinar la ruta base para los links
    const isInRoot = window.location.pathname.endsWith('index.html') || 
                     window.location.pathname === '/' || 
                     window.location.pathname.endsWith('/');
    const basePath = isInRoot ? './' : '../';

    this.innerHTML = `
      <nav class="navbar navbar-expand-lg navbar-dark bg-secondary">
        <div class="container-fluid">
          <a class="navbar-brand" href="${basePath}index.html">TeleTrack</a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" 
                  data-bs-target="#navbarMain" aria-controls="navbarMain" 
                  aria-expanded="false" aria-label="Alternar navegación">
            <span class="navbar-toggler-icon"></span>
          </button>
          
          <div class="collapse navbar-collapse" id="navbarMain">
            <ul class="navbar-nav me-auto mb-2 mb-lg-0">
              <li class="nav-item">
                <a class="nav-link" href="${basePath}index.html">Inicio</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="${basePath}views/sessions.html">Sesiones</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="${basePath}views/groups.html">Grupos</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="${basePath}views/options.html">Opciones</a>
              </li>
            </ul>
            
            <div class="d-flex align-items-center">
              ${isUserLoggedIn ? `
                <div class="d-flex align-items-center text-light me-3">
                  <i class="bi bi-person-circle me-2 fs-5"></i>
                  <span>${userName}</span>
                </div>
                <button class="btn btn-danger" onclick="logout()">Cerrar sesión</button>
              ` : `
                <a href="${basePath}views/login.html" class="btn btn-primary">Iniciar sesión</a>
              `}
            </div>
          </div>
        </div>
      </nav>
    `;
  }
}

customElements.define('nav-bar', NavBar);