class NavBar extends HTMLElement {
  connectedCallback() {
    // Verificar si el usuario está autenticado
    const isUserLoggedIn = typeof isAuthenticated === 'function' ? isAuthenticated() : false;

    // Obtener información del usuario si está autenticado
    const userName = isUserLoggedIn && localStorage.getItem('userData') ?
      JSON.parse(localStorage.getItem('userData')).nickname || 'Usuario' : '';

    // Determinar si estamos en una página de views/ o en la raíz
    const isInViewsFolder = window.location.pathname.includes('/views/');
    const homeUrl = isInViewsFolder ? '../index.html' : './index.html';
    const viewsPrefix = isInViewsFolder ? './' : './views/';

    this.innerHTML = `
      <nav class="navbar navbar-expand-lg navbar-dark bg-secondary">
        <div class="container-fluid">
          <a class="navbar-brand" href="${homeUrl}">TeleTrack</a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" 
                  data-bs-target="#navbarMain" aria-controls="navbarMain" 
                  aria-expanded="false" aria-label="Alternar navegación">
            <span class="navbar-toggler-icon"></span>
          </button>
          
          <div class="collapse navbar-collapse" id="navbarMain">
            <ul class="navbar-nav me-auto mb-2 mb-lg-0">
              <li class="nav-item">
                <a class="nav-link" href="${homeUrl}">Inicio</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="${viewsPrefix}sessions.html">Sesiones</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="${viewsPrefix}groups.html">Grupos</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="${viewsPrefix}chat.html">Chat</a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="${viewsPrefix}options.html">Opciones</a>
              </li>
            </ul>
            <div class="ms-auto">
              <div class="d-flex align-items-center">
                ${isUserLoggedIn ? `
                  <div class="d-flex align-items-center text-light me-3">
                    <i class="bi bi-person-circle me-2 fs-5"></i>
                    <span>${userName}</span>
                </div>
                <button class="btn btn-danger" onclick="logout()">Cerrar sesión</button>
              ` : `
                <a href="${isInViewsFolder ? './login.html' : './views/login.html'}" class="btn btn-primary">Iniciar sesión</a>
              `}
            </div>
          </div>
        </div>
      </nav>
    `;
  }
}

customElements.define('nav-bar', NavBar);