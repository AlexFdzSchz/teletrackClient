class WorkSessionBar extends HTMLElement {
  constructor() {
    super();
    this.activeSession = null;
    this.intervalId = null;
  }

  connectedCallback() {
    this.innerHTML = `
      <div class="bg-secondary border-top text-white py-4 shadow-lg" id="workSessionBar">
        <div class="container-fluid px-4">
          <div class="row align-items-center text-center">
            
            <!-- Temporizador izquierda: ocupa 2 de 12 columnas en lg -->
            <div class="col-12 col-lg-2 mb-3 mb-lg-0">
              <div class="border border-primary rounded px-4 py-3 shadow-sm bg-dark mx-auto" style="max-width: 250px;">
                <div class="text-white-50 small">Hora de comienzo</div>
                <div id="startTime" class="fw-bold fs-2 text-primary shadow-sm">--:--:--</div>
              </div>
            </div>
            
            <!-- Centro: input + botón, ocupa 8 de 12 columnas en lg -->
            <div class="col-12 col-lg-8 d-flex flex-column align-items-center justify-content-center gap-3">
              <div class="position-relative w-100">
                <input type="text"
                  id="sessionDescription"
                  class="form-control bg-dark text-white border-0 px-3 text-center shadow-sm w-100"
                  placeholder="Nombre de sesión">
                <button id="editDescriptionBtn" class="btn btn-info btn-sm position-absolute end-0 top-0 bottom-0 d-none">
                  <i class="bi bi-pencil"></i>
                </button>
              </div>
              <button id="toggleSessionBtn" class="btn btn-primary btn-sm px-4 py-2 rounded-pill fw-bold d-flex align-items-center justify-content-center gap-2 shadow">
                <i class="bi bi-play-fill fs-5"></i>
                <span class="fs-6">Comenzar</span>
              </button>
            </div>
            
            <!-- Temporizador derecha: ocupa 2 de 12 columnas en lg -->
            <div class="col-12 col-lg-2 mt-3 mt-lg-0">
              <div class="border border-primary rounded px-4 py-3 shadow-sm bg-dark mx-auto" style="max-width: 250px;">
                <div class="text-white-50 small">Tiempo transcurrido</div>
                <div id="elapsedTime" class="fw-bold fs-2 text-primary shadow-sm">00:00:00</div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    `;

    // Una vez que el DOM está listo, añadimos los event listeners
    setTimeout(() => {
      this.initSessionBar();
    }, 0);
  }

  // Inicializa los eventos y comprueba si hay una sesión activa
  initSessionBar() {
    // Referencias a elementos del DOM
    this.sessionDescInput = document.getElementById('sessionDescription');
    this.toggleBtn = document.getElementById('toggleSessionBtn');
    this.startTimeDisplay = document.getElementById('startTime');
    this.elapsedDisplay = document.getElementById('elapsedTime');
    this.editDescBtn = document.getElementById('editDescriptionBtn');

    // Agregar listeners a los botones
    this.toggleBtn.addEventListener('click', () => this.toggleSession());
    this.editDescBtn.addEventListener('click', () => this.editSessionDescription());
    
    // Comprobar si hay una sesión activa al cargar
    this.checkActiveSession();
  }

  // Comprueba si hay una sesión activa sin finalizar en el servidor
  async checkActiveSession() {
    try {
      const apiBaseUrl = CONFIG.apiBaseUrl;
      const token = localStorage.getItem('authToken');
      
      console.log('Verificando sesiones existentes en el servidor...');
      
      const response = await handleApiRequest(`${apiBaseUrl}/api/worksessions/latest`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        console.error('Error al obtener la última sesión:', response.status);
        return;
      }
      
      const responseJson = await response.json();
      console.log('Datos recibidos del servidor:', responseJson);
      
      // Extraer los datos reales de la estructura de respuesta
      const sessionData = responseJson.data || responseJson;
      
      // Si no hay datos de sesión, no hay nada que hacer
      if (!sessionData) {
        console.log('No se encontraron sesiones previas');
        return;
      }
      
      console.log('Datos de sesión extraídos:', sessionData);
      
      // Verificación ESTRICTA: solo considerar activa si NO tiene endTime
      if (sessionData.endTime) {
        console.log('La última sesión está finalizada (tiene endTime):', {
          id: sessionData.id,
          endTime: new Date(sessionData.endTime).toLocaleString()
        });
        // No activamos nada, la UI ya muestra el estado inactivo por defecto
      } else {
        // Si NO tiene endTime, esta sesión está activa y debe retomarse
        console.log('Encontrada sesión activa sin finalizar:', {
          id: sessionData.id,
          description: sessionData.description,
          startTime: new Date(sessionData.startTime).toLocaleString()
        });
        
        this.activeSession = sessionData;
        
        // Convertir la fecha de string a objeto Date para cálculos precisos
        const startTime = new Date(sessionData.startTime);
        
        // Actualizar UI para mostrar sesión activa
        this.updateUIForActiveSession();
        
        // Iniciar temporizador adaptado a la fecha y hora exacta que comenzó la sesión
        this.startTimer(startTime);
      }
    } catch (error) {
      console.error('Error al comprobar estado de sesión:', error);
    }
  }

  // Inicia o detiene una sesión
  async toggleSession() {
    if (this.activeSession) {
      // Finalizar sesión activa
      await this.endSession();
    } else {
      // Iniciar nueva sesión
      await this.startSession();
    }
  }

  // Inicia una nueva sesión
  async startSession() {
    try {
      const description = this.sessionDescInput.value.trim() || 'Sesión sin título';
      const startTime = new Date();
      const apiBaseUrl = CONFIG.apiBaseUrl;
      const token = localStorage.getItem('authToken');
      
      const response = await handleApiRequest(`${apiBaseUrl}/api/worksessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime: startTime.toISOString(),
          description: description
        })
      });
      
      const responseJson = await response.json();
      console.log('Respuesta completa del servidor:', responseJson);
      
      if (response.ok) {
        const sessionData = responseJson.data || responseJson;
        
        // Guardar sólo el objeto de sesión, no toda la estructura de respuesta
        this.activeSession = sessionData;
        
        console.log('Nueva sesión creada:', {
          id: sessionData.id,
          description: sessionData.description,
          startTime: new Date(sessionData.startTime).toLocaleString()
        });
        
        this.updateUIForActiveSession();
        this.startTimer(startTime);
      } else {
        console.error('Error al crear sesión:', responseJson);
        alert(`Error: ${responseJson.message || 'No se pudo crear la sesión'}`);
      }
    } catch (error) {
      console.error('Error al crear sesión:', error);
      alert('Error al crear la sesión. Verifica la conexión a la API.');
    }
  }

  // Finaliza una sesión activa
  async endSession() {
    if (!this.activeSession) return;
    
    console.log('Finalizando sesión activa:', this.activeSession);
    console.log('ID de sesión a finalizar:', this.activeSession.id);
    
    try {
      const apiBaseUrl = CONFIG.apiBaseUrl;
      const token = localStorage.getItem('authToken');
      const endTime = new Date();
      
      const response = await handleApiRequest(`${apiBaseUrl}/api/worksessions/${this.activeSession.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endTime: endTime.toISOString()
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Sesión finalizada correctamente:', data);
        this.updateUIForInactiveSession();
        this.activeSession = null;
        this.stopTimer();
      } else {
        console.error('Error al finalizar sesión:', data);
      }
    } catch (error) {
      console.error('Error al finalizar sesión:', error);
    }
  }

  // Inicia el temporizador para mostrar tiempo transcurrido
  startTimer(startTime) {
    // Verificar que startTime sea un objeto Date válido
    if (!(startTime instanceof Date) || isNaN(startTime)) {
      console.error('Fecha de inicio inválida:', startTime);
      startTime = new Date(); // Usar fecha actual como fallback
    }
    
    this.stopTimer(); // Detener timer anterior si existe
    
    // Mostrar hora de inicio
    this.startTimeDisplay.textContent = this.formatTime(startTime);
    
    // Calcular tiempo transcurrido inicial
    const initialElapsed = new Date() - startTime;
    this.elapsedDisplay.textContent = this.formatElapsedTime(initialElapsed);
    
    console.log(`Temporizador iniciado - Hora inicio: ${this.formatTime(startTime)}, Transcurrido inicial: ${this.formatElapsedTime(initialElapsed)}`);
    
    // Iniciar temporizador de tiempo transcurrido
    this.intervalId = setInterval(() => {
      const elapsed = new Date() - startTime;
      this.elapsedDisplay.textContent = this.formatElapsedTime(elapsed);
    }, 1000);
  }

  // Detiene el temporizador
  stopTimer() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Actualiza la UI para mostrar sesión activa
  updateUIForActiveSession() {
    this.toggleBtn.classList.remove('btn-primary');
    this.toggleBtn.classList.add('btn-danger');
    this.toggleBtn.innerHTML = `
      <i class="bi bi-stop-fill fs-5"></i>
      <span class="fs-6">Finalizar</span>
    `;
    
    if (this.activeSession && this.activeSession.description) {
      this.sessionDescInput.value = this.activeSession.description;
    }
    
    // Mostrar botón de confirmar cambios
    this.editDescBtn.classList.remove('d-none');
    // El input siempre está habilitado para edición
  }

  // Actualiza la UI para mostrar estado inactivo
  updateUIForInactiveSession() {
    this.toggleBtn.classList.remove('btn-danger');
    this.toggleBtn.classList.add('btn-primary');
    this.toggleBtn.innerHTML = `
      <i class="bi bi-play-fill fs-5"></i>
      <span class="fs-6">Comenzar</span>
    `;
    this.startTimeDisplay.textContent = '--:--:--';
    this.elapsedDisplay.textContent = '00:00:00';
    
    // Ocultar botón de edición
    this.editDescBtn.classList.add('d-none');
  }

  // Editar la descripción
  async editSessionDescription() {
    // Solo permitimos editar si hay una sesión activa
    if (!this.activeSession) return;
    
    const newDescription = this.sessionDescInput.value.trim() || 'Sesión sin título';
    
    try {
      const apiBaseUrl = CONFIG.apiBaseUrl;
      const token = localStorage.getItem('authToken');
      
      const response = await handleApiRequest(`${apiBaseUrl}/api/worksessions/${this.activeSession.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: newDescription
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Descripción de sesión actualizada:', data);
        
        // Actualizar el objeto de sesión local con la nueva descripción
        this.activeSession.description = newDescription;
        
        // Dar feedback visual de confirmación. Wow! que pro
        const originalHTML = this.editDescBtn.innerHTML;
        this.editDescBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
        this.editDescBtn.classList.add('btn-success');
        this.editDescBtn.classList.remove('btn-info');
        
        // Restaurar el aspecto original después de un momento
        setTimeout(() => {
          this.editDescBtn.innerHTML = originalHTML;
          this.editDescBtn.classList.add('btn-info');
          this.editDescBtn.classList.remove('btn-success');
        }, 1000);
      } else {
        console.error('Error al actualizar descripción:', data);
        alert('No se pudo actualizar la descripción de la sesión.');
      }
    } catch (error) {
      console.error('Error al actualizar descripción:', error);
      alert('Error de conexión al actualizar la descripción.');
    }
  }

  // Formatea una fecha para mostrar la hora
  formatTime(date) {
    return date.toLocaleTimeString('es', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Formatea milisegundos como HH:MM:SS
  formatElapsedTime(milliseconds) {
    let seconds = Math.floor(milliseconds / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    
    seconds = seconds % 60;
    minutes = minutes % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

customElements.define('work-session-bar', WorkSessionBar);
