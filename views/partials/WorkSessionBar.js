class WorkSessionBar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="bg-secondary border-top text-white py-4 sticky-bottom shadow-lg" id="workSessionBar">
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
              <input type="text"
                class="form-control bg-dark text-white border-0 px-3 text-center shadow-sm w-100"
                placeholder="Nombre de sesión">
              <button class="btn btn-primary btn-sm px-4 py-2 rounded-pill fw-bold d-flex align-items-center justify-content-center gap-2 shadow">
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
  }
}

customElements.define('work-session-bar', WorkSessionBar);
