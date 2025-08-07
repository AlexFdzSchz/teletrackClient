// JavaScript para la página de opciones de TeleTrack

document.addEventListener('DOMContentLoaded', async function () {
    if (!isAuthenticated()) {
        window.location.href = './login.html';
        return;
    }

    // Variables globales
    let currentUserData = null;
    let originalUserData = null;
    let currentSettings = null;
    let originalSettings = null;

    // Elementos del DOM
    const sidebarButtons = document.querySelectorAll('[data-section]');
    const sections = document.querySelectorAll('.settings-section');
    const profileForm = document.getElementById('profileForm');
    const passwordForm = document.getElementById('passwordForm');
    const interfaceForm = document.getElementById('interfaceForm');
    const avatarInput = document.getElementById('avatarInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const removeAvatarBtn = document.getElementById('removeAvatarBtn');
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');

    // Inicialización
    await loadUserData();
    await loadUserSettings();
    setupEventListeners();

    // Cargar datos del usuario
    async function loadUserData() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await handleApiRequest(`${CONFIG.apiBaseUrl}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                currentUserData = data.data;
                originalUserData = { ...data.data };
                populateProfileForm();
                loadUserAvatar();
            } else {
                showAlert('Error al cargar los datos del usuario', 'danger');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            showAlert('Error de conexión al cargar los datos', 'danger');
        }
    }

    // Cargar configuraciones del usuario
    async function loadUserSettings() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await handleApiRequest(`${CONFIG.apiBaseUrl}/api/users/settings`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                currentSettings = data.data || {};
                originalSettings = { ...currentSettings };
                populateInterfaceForm();
                // Actualizar avatar después de cargar settings por si la imagen está ahí
                loadUserAvatar();
            } else {
                console.warn('No se pudieron cargar las configuraciones del usuario');
                currentSettings = { calendarWeekStart: 'monday' }; // Valor por defecto
                originalSettings = { ...currentSettings };
                populateInterfaceForm();
            }
        } catch (error) {
            console.error('Error loading user settings:', error);
            currentSettings = { calendarWeekStart: 'monday' }; // Valor por defecto
            originalSettings = { ...currentSettings };
            populateInterfaceForm();
        }
    }

    // Llenar formulario de perfil
    function populateProfileForm() {
        document.getElementById('firstName').value = currentUserData.firstName || '';
        document.getElementById('lastName').value = currentUserData.lastName || '';
        document.getElementById('nickname').value = currentUserData.nickname || '';
        document.getElementById('email').value = currentUserData.email || '';
        document.getElementById('address').value = currentUserData.address || '';
        document.getElementById('city').value = currentUserData.city || '';
        document.getElementById('postalCode').value = currentUserData.postalCode || '';
        document.getElementById('province').value = currentUserData.province || '';
        document.getElementById('country').value = currentUserData.country || '';
    }

    // Cargar avatar del usuario
    function loadUserAvatar() {
        const avatarImg = document.getElementById('currentAvatar');
        const avatarPlaceholder = document.getElementById('avatarPlaceholder');
        
        // Según la documentación de la API, siempre debe llegar como objeto profileImage
        if (currentSettings && currentSettings.profileImage && currentSettings.profileImage.id) {
            const imageUrl = `${CONFIG.apiBaseUrl}/api/users/settings/profile-image/${currentSettings.profileImage.id}`;
            avatarImg.src = imageUrl;
            avatarImg.classList.remove('d-none');
            avatarPlaceholder.classList.add('d-none');
        } else {
            avatarImg.classList.add('d-none');
            avatarPlaceholder.classList.remove('d-none');
        }
    }

    // Llenar formulario de configuración de interfaz
    function populateInterfaceForm() {
        const weekStart = currentSettings.calendarWeekStart || 'monday';
        const selectElement = document.getElementById('calendarWeekStart');
        if (selectElement) {
            selectElement.value = weekStart;
        }
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Navegación entre secciones
        sidebarButtons.forEach(button => {
            button.addEventListener('click', function() {
                const sectionId = this.dataset.section + '-section';
                showSection(sectionId);
                
                // Actualizar estado activo
                sidebarButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
            });
        });

        // Formulario de perfil
        profileForm.addEventListener('submit', handleProfileSubmit);
        document.getElementById('resetProfileBtn').addEventListener('click', resetProfileForm);

        // Formulario de contraseña
        passwordForm.addEventListener('submit', handlePasswordSubmit);
        document.getElementById('clearPasswordForm').addEventListener('click', clearPasswordForm);

        // Formulario de interfaz
        interfaceForm.addEventListener('submit', handleInterfaceSubmit);
        document.getElementById('resetInterfaceBtn').addEventListener('click', resetInterfaceForm);

        // Validación de contraseña en tiempo real
        document.getElementById('newPassword').addEventListener('input', validatePassword);
        document.getElementById('confirmPassword').addEventListener('input', validatePasswordMatch);

        // Toggle de visibilidad de contraseñas
        setupPasswordToggles();

        // Avatar
        selectFileBtn.addEventListener('click', () => avatarInput.click());
        changeAvatarBtn.addEventListener('click', () => avatarInput.click());
        removeAvatarBtn.addEventListener('click', removeAvatar);
        avatarInput.addEventListener('change', handleAvatarUpload);
    }

    // Mostrar sección específica
    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.add('d-none');
        });
        document.getElementById(sectionId).classList.remove('d-none');
    }

    // Manejar envío del formulario de perfil
    async function handleProfileSubmit(e) {
        e.preventDefault();
        
        const formData = {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            address: document.getElementById('address').value.trim(),
            city: document.getElementById('city').value.trim(),
            postalCode: document.getElementById('postalCode').value.trim(),
            province: document.getElementById('province').value.trim(),
            country: document.getElementById('country').value.trim()
        };

        try {
            const token = localStorage.getItem('authToken');
            const response = await handleApiRequest(`${CONFIG.apiBaseUrl}/api/users/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const data = await response.json();
                currentUserData = { ...currentUserData, ...formData };
                originalUserData = { ...currentUserData };
                showAlert('Perfil actualizado correctamente', 'success');
            } else {
                const error = await response.json();
                showAlert(error.message || 'Error al actualizar el perfil', 'danger');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            showAlert('Error de conexión al actualizar el perfil', 'danger');
        }
    }

    // Resetear formulario de perfil
    function resetProfileForm() {
        populateProfileForm();
        showAlert('Cambios descartados', 'info');
    }

    // Manejar envío del formulario de contraseña
    async function handlePasswordSubmit(e) {
        e.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            showAlert('Las contraseñas no coinciden', 'danger');
            return;
        }

        if (!validatePasswordStrength(newPassword)) {
            showAlert('La contraseña no cumple con los requisitos mínimos', 'danger');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await handleApiRequest(`${CONFIG.apiBaseUrl}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            if (response.ok) {
                passwordForm.reset();
                clearPasswordValidation();
                showAlert('Contraseña cambiada correctamente', 'success');
            } else {
                const error = await response.json();
                showAlert(error.message || 'Error al cambiar la contraseña', 'danger');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            showAlert('Error de conexión al cambiar la contraseña', 'danger');
        }
    }

    // Limpiar formulario de contraseña
    function clearPasswordForm() {
        passwordForm.reset();
        clearPasswordValidation();
    }

    // Validar fortaleza de contraseña
    function validatePassword() {
        const password = document.getElementById('newPassword').value;
        const strengthIndicator = document.getElementById('passwordStrength');
        
        const isValid = validatePasswordStrength(password);
        
        if (password.length === 0) {
            strengthIndicator.textContent = '';
            return;
        }

        if (isValid) {
            strengthIndicator.innerHTML = '<span class="text-success"><i class="bi bi-check-circle me-1"></i>Contraseña válida</span>';
        } else {
            strengthIndicator.innerHTML = '<span class="text-danger"><i class="bi bi-x-circle me-1"></i>Debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número</span>';
        }
    }

    // Validar coincidencia de contraseñas
    function validatePasswordMatch() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const matchIndicator = document.getElementById('passwordMatch');

        if (confirmPassword.length === 0) {
            matchIndicator.textContent = '';
            return;
        }

        if (newPassword === confirmPassword) {
            matchIndicator.innerHTML = '<span class="text-success"><i class="bi bi-check-circle me-1"></i>Las contraseñas coinciden</span>';
        } else {
            matchIndicator.innerHTML = '<span class="text-danger"><i class="bi bi-x-circle me-1"></i>Las contraseñas no coinciden</span>';
        }
    }

    // Validar fortaleza de contraseña
    function validatePasswordStrength(password) {
        const minLength = 8;
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);

        return password.length >= minLength && hasUppercase && hasLowercase && hasNumber;
    }

    // Limpiar validación de contraseña
    function clearPasswordValidation() {
        document.getElementById('passwordStrength').textContent = '';
        document.getElementById('passwordMatch').textContent = '';
    }

    // Configurar toggles de visibilidad de contraseña
    function setupPasswordToggles() {
        const toggles = [
            { button: 'toggleCurrentPassword', input: 'currentPassword' },
            { button: 'toggleNewPassword', input: 'newPassword' },
            { button: 'toggleConfirmPassword', input: 'confirmPassword' }
        ];

        toggles.forEach(({ button, input }) => {
            document.getElementById(button).addEventListener('click', function() {
                const passwordInput = document.getElementById(input);
                const icon = this.querySelector('i');
                
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.className = 'bi bi-eye-slash';
                } else {
                    passwordInput.type = 'password';
                    icon.className = 'bi bi-eye';
                }
            });
        });
    }

    // Manejar subida de avatar
    async function handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validar archivo
        if (!file.type.startsWith('image/')) {
            showAlert('Por favor selecciona un archivo de imagen válido', 'danger');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB
            showAlert('El archivo es demasiado grande. Máximo 5MB', 'danger');
            return;
        }

        try {
            // Mostrar preview inmediato mientras se sube
            const reader = new FileReader();
            reader.onload = function(e) {
                const avatarImg = document.getElementById('currentAvatar');
                const avatarPlaceholder = document.getElementById('avatarPlaceholder');
                
                avatarImg.src = e.target.result;
                avatarImg.classList.remove('d-none');
                avatarPlaceholder.classList.add('d-none');
            };
            reader.readAsDataURL(file);

            // Mostrar progreso
            showUploadProgress();

            // Crear FormData para multipart/form-data
            const formData = new FormData();
            formData.append('profileImage', file);

            const token = localStorage.getItem('authToken');
            
            // Debug: verificar que tenemos un token válido
            if (!token) {
                hideUploadProgress();
                showAlert('No se encontró token de autenticación. Por favor, inicia sesión nuevamente.', 'danger');
                loadUserAvatar();
                return;
            }
            
            console.log('Subiendo imagen con token:', token.substring(0, 20) + '...');
            console.log('URL de destino:', `${CONFIG.apiBaseUrl}/api/users/settings`);
            console.log('Tipo de archivo:', file.type);
            console.log('Tamaño de archivo:', file.size);
            
            // Test: verificar si el token funciona con otra API primero
            console.log('Verificando token con /api/auth/me...');
            const testResponse = await fetch(`${CONFIG.apiBaseUrl}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('Test de token resultado:', testResponse.status, testResponse.statusText);
            
            if (testResponse.status === 401) {
                hideUploadProgress();
                showAlert('Token de autenticación inválido. Por favor, inicia sesión nuevamente.', 'danger');
                loadUserAvatar();
                setTimeout(() => {
                    window.location.href = './login.html';
                }, 2000);
                return;
            }
            
            // Usar fetch directamente para evitar problemas con headers automáticos
            const response = await fetch(`${CONFIG.apiBaseUrl}/api/users/settings`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // NO establecer Content-Type para FormData - el navegador lo hace automáticamente
                },
                body: formData
            });

            console.log('Respuesta del servidor:', response.status, response.statusText);
            console.log('Headers de respuesta:', [...response.headers.entries()]);
            
            // Intentar leer el cuerpo de la respuesta para más información
            if (!response.ok) {
                const responseText = await response.text();
                console.log('Cuerpo de respuesta de error:', responseText);
            }

            if (response.ok) {
                const data = await response.json();
                
                // Actualizar configuraciones locales con los datos del servidor
                currentSettings = { ...currentSettings, ...data.data };
                
                // Actualizar la UI después de un breve delay para mejor UX
                setTimeout(() => {
                    hideUploadProgress();
                    showAlert('Foto de perfil actualizada correctamente', 'success');
                    // Usar la función principal para mostrar el avatar actualizado
                    loadUserAvatar();
                }, 1000);
                
            } else if (response.status === 401) {
                hideUploadProgress();
                showAlert('Sesión expirada. Por favor, inicia sesión nuevamente.', 'danger');
                // Revertir preview en caso de error
                loadUserAvatar();
                // Redirigir al login después de un breve delay
                setTimeout(() => {
                    window.location.href = './login.html';
                }, 2000);
            } else {
                try {
                    // Intentar parsear como JSON si no hemos leído el cuerpo aún
                    const error = await response.json();
                    hideUploadProgress();
                    showAlert(error.message || 'Error al subir la imagen', 'danger');
                } catch (jsonError) {
                    // Si no es JSON válido, usar el texto que ya leímos
                    hideUploadProgress();
                    showAlert('Error al subir la imagen: ' + response.statusText, 'danger');
                }
                // Revertir preview en caso de error
                loadUserAvatar();
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            hideUploadProgress();
            showAlert('Error al subir la imagen', 'danger');
            // Revertir preview en caso de error
            loadUserAvatar();
        }
    }

    // Eliminar avatar
    async function removeAvatar() {
        try {
            const token = localStorage.getItem('authToken');
            const response = await handleApiRequest(`${CONFIG.apiBaseUrl}/api/users/settings`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    removeProfileImage: true
                })
            });

            if (response.ok) {
                // Limpiar datos locales - solo necesitamos limpiar profileImage
                currentSettings.profileImage = null;
                
                // Actualizar UI usando la función principal
                loadUserAvatar();
                
                showAlert('Foto de perfil eliminada correctamente', 'success');
            } else {
                const error = await response.json();
                showAlert(error.message || 'Error al eliminar la foto de perfil', 'danger');
            }
        } catch (error) {
            console.error('Error removing avatar:', error);
            showAlert('Error de conexión al eliminar la foto de perfil', 'danger');
        }
    }

    // Mostrar progreso de subida
    function showUploadProgress() {
        const progressContainer = document.getElementById('uploadProgress');
        const progressBar = progressContainer.querySelector('.progress-bar');
        const avatarPreview = document.getElementById('avatarPreview');
        
        progressContainer.classList.remove('d-none');
        avatarPreview.classList.add('uploading');
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            progressBar.style.width = progress + '%';
            
            if (progress >= 100) {
                clearInterval(interval);
            }
        }, 200);
    }

    // Ocultar progreso de subida
    function hideUploadProgress() {
        const progressContainer = document.getElementById('uploadProgress');
        const progressBar = progressContainer.querySelector('.progress-bar');
        const avatarPreview = document.getElementById('avatarPreview');
        
        progressContainer.classList.add('d-none');
        progressBar.style.width = '0%';
        avatarPreview.classList.remove('uploading');
    }

    // Manejar envío del formulario de interfaz
    async function handleInterfaceSubmit(e) {
        e.preventDefault();
        
        const calendarWeekStart = document.getElementById('calendarWeekStart').value;
        
        const settingsData = {
            calendarWeekStart: calendarWeekStart
        };

        try {
            const token = localStorage.getItem('authToken');
            const response = await handleApiRequest(`${CONFIG.apiBaseUrl}/api/users/settings`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settingsData)
            });

            if (response.ok) {
                const data = await response.json();
                currentSettings = { ...currentSettings, ...settingsData };
                originalSettings = { ...currentSettings };
                showAlert('Configuración de la interfaz actualizada correctamente', 'success');
                

            } else {
                const error = await response.json();
                showAlert(error.message || 'Error al actualizar la configuración de la interfaz', 'danger');
            }
        } catch (error) {
            console.error('Error updating interface settings:', error);
            showAlert('Error de conexión al actualizar la configuración de la interfaz', 'danger');
        }
    }

    // Resetear formulario de interfaz
    function resetInterfaceForm() {
        populateInterfaceForm();
        showAlert('Cambios descartados', 'info');
    }

    // Mostrar alertas
    function showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        const alertId = 'alert-' + Date.now();
        
        const alertHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert" id="${alertId}">
                <i class="bi bi-${getAlertIcon(type)} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        alertContainer.insertAdjacentHTML('beforeend', alertHTML);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }

    // Obtener icono para alerta
    function getAlertIcon(type) {
        const icons = {
            'success': 'check-circle-fill',
            'danger': 'exclamation-triangle-fill',
            'warning': 'exclamation-triangle-fill',
            'info': 'info-circle-fill'
        };
        return icons[type] || 'info-circle-fill';
    }
});
