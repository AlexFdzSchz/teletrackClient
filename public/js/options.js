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
                showErrorAlert('Error al cargar los datos del usuario');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            showErrorAlert('Error de conexión al cargar los datos');
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
                showSuccessAlert('Perfil actualizado correctamente');
            } else {
                const error = await response.json();
                showErrorAlert(error.message || 'Error al actualizar el perfil');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            showErrorAlert('Error de conexión al actualizar el perfil');
        }
    }

    // Resetear formulario de perfil
    function resetProfileForm() {
        populateProfileForm();
        showInfoAlert('Cambios descartados');
    }

    // Manejar envío del formulario de contraseña
    async function handlePasswordSubmit(e) {
        e.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            showErrorAlert('Las contraseñas no coinciden');
            return;
        }

        if (!validatePasswordStrength(newPassword)) {
            showErrorAlert('La contraseña no cumple con los requisitos mínimos');
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
                showSuccessAlert('Contraseña cambiada correctamente');
            } else {
                const error = await response.json();
                showErrorAlert(error.message || 'Error al cambiar la contraseña');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            showErrorAlert('Error de conexión al cambiar la contraseña');
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
            showErrorAlert('Por favor selecciona un archivo de imagen válido');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB
            showErrorAlert('El archivo es demasiado grande. Máximo 5MB');
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
                showErrorAlert('No se encontró token de autenticación. Por favor, inicia sesión nuevamente.');
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
                showErrorAlert('Token de autenticación inválido. Por favor, inicia sesión nuevamente.');
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
                    showSuccessAlert('Foto de perfil actualizada correctamente');
                    // Usar la función principal para mostrar el avatar actualizado
                    loadUserAvatar();
                }, 1000);
                
            } else if (response.status === 401) {
                hideUploadProgress();
                showErrorAlert('Sesión expirada. Por favor, inicia sesión nuevamente.');
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
                    showErrorAlert(error.message || 'Error al subir la imagen');
                } catch (jsonError) {
                    // Si no es JSON válido, usar el texto que ya leímos
                    hideUploadProgress();
                    showErrorAlert('Error al subir la imagen: ' + response.statusText);
                }
                // Revertir preview en caso de error
                loadUserAvatar();
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            hideUploadProgress();
            showErrorAlert('Error al subir la imagen');
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
                
                showSuccessAlert('Foto de perfil eliminada correctamente');
            } else {
                const error = await response.json();
                showErrorAlert(error.message || 'Error al eliminar la foto de perfil');
            }
        } catch (error) {
            console.error('Error removing avatar:', error);
            showErrorAlert('Error de conexión al eliminar la foto de perfil');
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
                showSuccessAlert('Configuración de la interfaz actualizada correctamente');
                

            } else {
                const error = await response.json();
                showErrorAlert(error.message || 'Error al actualizar la configuración de la interfaz');
            }
        } catch (error) {
            console.error('Error updating interface settings:', error);
            showErrorAlert('Error de conexión al actualizar la configuración de la interfaz');
        }
    }

    // Resetear formulario de interfaz
    function resetInterfaceForm() {
        populateInterfaceForm();
        showInfoAlert('Cambios descartados');
    }

    // Mostrar alerta de error con Bootstrap Alert (igual que groups.html)
    function showErrorAlert(message) {
        const alertId = 'alert-' + Date.now();
        const alertHtml = `
            <div id="${alertId}" class="alert alert-danger alert-dismissible fade show mb-0" role="alert">
                <strong><i class="bi bi-exclamation-circle-fill me-2"></i>Error:</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        const container = document.getElementById('alertContainer');
        container.insertAdjacentHTML('beforeend', alertHtml);
        
        // Programar eliminación automática después de 5 segundos
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                // Crear instancia de bootstrap Alert para poder ocultarla con una transición
                const bsAlert = new bootstrap.Alert(alertElement);
                bsAlert.close();
            }
        }, 5000);
        
        // Eliminar el elemento del DOM después de que se oculte
        document.getElementById(alertId).addEventListener('closed.bs.alert', function () {
            this.remove();
        });
    }

    // Mostrar alerta de éxito con Bootstrap Alert (igual que groups.html)
    function showSuccessAlert(message) {
        const alertId = 'alert-' + Date.now();
        const alertHtml = `
            <div id="${alertId}" class="alert alert-success alert-dismissible fade show mb-0" role="alert">
                <strong><i class="bi bi-check-circle-fill me-2"></i>Éxito:</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        const container = document.getElementById('alertContainer');
        container.insertAdjacentHTML('beforeend', alertHtml);
        
        // Programar eliminación automática después de 5 segundos
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                // Crear instancia de bootstrap Alert para poder ocultarla con una transición
                const bsAlert = new bootstrap.Alert(alertElement);
                bsAlert.close();
            }
        }, 5000);
        
        // Eliminar el elemento del DOM después de que se oculte
        document.getElementById(alertId).addEventListener('closed.bs.alert', function () {
            this.remove();
        });
    }

    // Mostrar alerta de información con Bootstrap Alert
    function showInfoAlert(message) {
        const alertId = 'alert-' + Date.now();
        const alertHtml = `
            <div id="${alertId}" class="alert alert-info alert-dismissible fade show mb-0" role="alert">
                <strong><i class="bi bi-info-circle-fill me-2"></i>Información:</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        const container = document.getElementById('alertContainer');
        container.insertAdjacentHTML('beforeend', alertHtml);
        
        // Programar eliminación automática después de 5 segundos
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                // Crear instancia de bootstrap Alert para poder ocultarla con una transición
                const bsAlert = new bootstrap.Alert(alertElement);
                bsAlert.close();
            }
        }, 5000);
        
        // Eliminar el elemento del DOM después de que se oculte
        document.getElementById(alertId).addEventListener('closed.bs.alert', function () {
            this.remove();
        });
    }
});
