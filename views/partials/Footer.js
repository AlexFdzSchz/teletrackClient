class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="bg-secondary text-light py-3 mt-auto">
        <div class="container text-center">
          <p class="mb-1">&copy; 2025 Teletrack</p>
          <p class="mb-0">Desarrollado por Alejandro Fernández Sánchez</p>
        </div>
      </footer>
    `;
  }
}
customElements.define('site-footer', SiteFooter);