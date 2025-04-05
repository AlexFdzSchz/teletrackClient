class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="bg-secondary text-light py-1 mt-auto">
        <div class="container text-center">
          <p class="mb-0">&copy; 2025 Teletrack. Alejandro Fernández Sánchez</p>
        </div>
      </footer>
    `;
  }
}
customElements.define('site-footer', SiteFooter);