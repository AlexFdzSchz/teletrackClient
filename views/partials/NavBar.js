class NavBar extends HTMLElement {
  constructor() {
    super();
    this.userSettings = null;
  }

  async connectedCallback() {
    // Verificar si el usuario está autenticado
    const isUserLoggedIn = typeof isAuthenticated === 'function' ? isAuthenticated() : false;

    // Obtener información del usuario si está autenticado
    const userName = isUserLoggedIn && localStorage.getItem('userData') ?
      JSON.parse(localStorage.getItem('userData')).nickname || 'Usuario' : '';

    // Cargar configuraciones del usuario para obtener el avatar
    if (isUserLoggedIn) {
      await this.loadUserSettings();
    }

    // Determinar si estamos en una página de views/ o en la raíz
    const isInViewsFolder = window.location.pathname.includes('/views/');
    const homeUrl = isInViewsFolder ? '../index.html' : './index.html';
    const viewsPrefix = isInViewsFolder ? './' : './views/';
    const iconPath = isInViewsFolder ? '../public/img/teletrack-icon.svg' : './public/img/teletrack-icon.svg';

    // Generar el HTML del avatar o icono
    const userAvatarHtml = this.getUserAvatarHtml();

    this.innerHTML = `
      <nav class="navbar navbar-expand-lg navbar-dark bg-secondary">
        <div class="container-fluid">
          <a class="navbar-brand d-flex align-items-center gap-2" href="${homeUrl}">
            <img src="${iconPath}" alt="TeleTrack Icon" width="32" height="32">
            <span>TeleTrack</span>
          </a>
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
                <a class="nav-link" href="${viewsPrefix}download.html">Descarga</a>
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
                    ${userAvatarHtml}
                    <span>${userName}</span>
                  </div>
                  <button class="btn btn-danger" onclick="logout()">Cerrar sesión</button>
                ` : `
                  <a href="${isInViewsFolder ? './login.html' : './views/login.html'}" class="btn btn-primary">Iniciar sesión</a>
                `}
              </div>
            </div>
          </div>
        </div>
      </nav>
    `;

    // Configurar listener para actualizaciones de avatar
    this.setupAvatarUpdateListener();
  }

  async loadUserSettings() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${CONFIG.apiBaseUrl}/api/users/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.userSettings = data.data || {};
      }
    } catch (error) {
      console.error('Error al cargar configuraciones del usuario para navbar:', error);
      this.userSettings = null;
    }
  }

  getUserAvatarHtml() {
    // Determinar la ruta a la página de opciones
    const isInViewsFolder = window.location.pathname.includes('/views/');
    const optionsUrl = isInViewsFolder ? './options.html' : './views/options.html';
    
    // Verificar si el usuario tiene avatar
    if (this.userSettings && this.userSettings.profileImage && this.userSettings.profileImage.id) {
      const imageUrl = `${CONFIG.apiBaseUrl}/api/users/settings/profile-image/${this.userSettings.profileImage.id}`;
      return `
        <a href="${optionsUrl}" class="text-decoration-none d-flex align-items-center" title="Ver perfil">
          <img src="${imageUrl}" alt="Avatar" class="rounded-circle me-2" 
               style="width: 32px; height: 32px; object-fit: cover; border: 2px solid #6c757d; cursor: pointer;"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
          <i class="bi bi-person-circle me-2 fs-5" style="display: none; color: #fff;"></i>
        </a>
      `;
    } else {
      // Mostrar icono por defecto si no hay avatar
      return `
        <a href="${optionsUrl}" class="text-decoration-none" title="Ver perfil">
          <i class="bi bi-person-circle me-2 fs-5" style="color: #fff; cursor: pointer;"></i>
        </a>
      `;
    }
  }

  // Método para actualizar el avatar sin recargar toda la navbar
  async updateUserAvatar() {
    await this.loadUserSettings();
    const avatarContainer = this.querySelector('.d-flex.align-items-center.text-light.me-3');
    if (avatarContainer) {
      // Obtener el nombre del usuario
      const userName = localStorage.getItem('userData') ?
        JSON.parse(localStorage.getItem('userData')).nickname || 'Usuario' : '';
      
      // Actualizar solo el contenido del avatar
      const userAvatarHtml = this.getUserAvatarHtml();
      avatarContainer.innerHTML = `
        ${userAvatarHtml}
        <span>${userName}</span>
      `;
    }
  }

  // Listener para eventos de actualización de avatar
  setupAvatarUpdateListener() {
    // Escuchar evento personalizado para actualizar avatar
    document.addEventListener('avatarUpdated', () => {
      this.updateUserAvatar();
    });
  }
}

customElements.define('nav-bar', NavBar);