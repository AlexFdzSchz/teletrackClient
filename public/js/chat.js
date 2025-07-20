// JavaScript específico para la página de chat

let activeChat = null;
let userGroups = [];
let currentMessages = [];
// Variable para el intervalo de comprobación de mensajes nuevos
let messagePollInterval = null;

// Cargar chats y manejar parámetros de URL
document.addEventListener('DOMContentLoaded', function () {
    // Verificar si hay un groupId en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('groupId');
    
    // Cargar la lista de grupos del usuario
    loadUserGroups().then(() => {
        if (groupId) {
            // Si se especifica un grupo en la URL, seleccionarlo automáticamente
            const group = userGroups.find(g => g.id == groupId);
            if (group) {
                selectChat(groupId, group.name);
            } else {
                showError('No tienes acceso a este grupo o el grupo no existe.');
            }
        }
    });
    
    // Enter para enviar mensaje
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        // Actualizar contador de caracteres
        messageInput.addEventListener('input', function() {
            const maxLength = parseInt(this.getAttribute('maxlength'));
            const currentLength = this.value.length;
            const charCount = document.getElementById('charCount');
            charCount.textContent = `${currentLength}/${maxLength}`;
            
            // Cambiar color cuando se acerca al límite
            if (currentLength > maxLength * 0.8) {
                charCount.classList.remove('text-muted');
                charCount.classList.add('text-warning');
            } else {
                charCount.classList.remove('text-warning');
                charCount.classList.add('text-muted');
            }
        });
    }
    
    // Manejar cambios de visibilidad de la página
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
            // Reducir la frecuencia de polling cuando la página no está visible
            if (messagePollInterval) {
                stopMessagePolling();
                // Opcionalmente reiniciar con una frecuencia menor (cada 10 segundos)
                if (activeChat) {
                    messagePollInterval = setInterval(() => {
                        loadMessages(activeChat);
                    }, 10000);
                }
            }
        } else if (document.visibilityState === 'visible' && activeChat) {
            // Restaurar polling normal cuando la página vuelve a ser visible
            stopMessagePolling();
            startMessagePolling(activeChat);
            // Recargar mensajes inmediatamente
            loadMessages(activeChat);
        }
    });
    
    // Limpiar el intervalo cuando se cierre o recargue la página
    window.addEventListener('beforeunload', function() {
        stopMessagePolling();
    });
});

// Cargar grupos del usuario desde la API
async function loadUserGroups() {
    try {
        const apiBaseUrl = CONFIG.apiBaseUrl;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/groups`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar grupos');
        }
        
        const result = await response.json();
        userGroups = result.data || [];
        
        // Mostrar grupos en la lista de chats
        displayChatList();
        
    } catch (error) {
        console.error('Error al cargar grupos:', error);
        showError('Error al cargar los grupos. Intenta nuevamente.');
    }
}

// Mostrar lista de grupos como chats
function displayChatList() {
    const chatList = document.getElementById('chatList');
    
    if (userGroups.length === 0) {
        chatList.innerHTML = `
            <div class="text-center py-3 empty-state">
                <p>No perteneces a ningún grupo.</p>
                <a href="./groups.html" class="btn btn-sm btn-primary">Ver grupos</a>
            </div>
        `;
        return;
    }
    
    let html = '';
    userGroups.forEach(group => {
        const memberCount = group.Users ? group.Users.length : 0;
        html += `
            <div class="list-group-item list-group-item-action bg-dark text-light border-0 chat-item" onclick="selectChat(${group.id}, '${group.name.replace(/'/g, '\\\'')}')" data-group-id="${group.id}">
                <div class="d-flex w-100 justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle bg-primary d-flex align-items-center justify-content-center me-3" style="width: 35px; height: 35px;">
                            <i class="bi bi-people-fill small"></i>
                        </div>
                        <div>
                            <h6 class="mb-1">${group.name}</h6>
                            <p class="mb-1 small chat-item-info">${memberCount} ${memberCount === 1 ? 'miembro' : 'miembros'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    chatList.innerHTML = html;
}

// Seleccionar un chat y cargar mensajes
async function selectChat(groupId, groupName) {
    try {
        // Detener el polling del chat anterior si existe
        stopMessagePolling();
        
        activeChat = groupId;
        
        // Actualizar header del chat
        document.getElementById('activeChatName').textContent = groupName;
        const group = userGroups.find(g => g.id == groupId);
        const memberCount = group && group.Users ? group.Users.length : 0;
        document.getElementById('activeChatStatus').textContent = `${memberCount} ${memberCount === 1 ? 'miembro' : 'miembros'} • Activo`;
        
        // Cargar mensajes del grupo
        await loadMessages(groupId);
        
        // Resaltar chat activo
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeItem = document.querySelector(`[data-group-id="${groupId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
        
        // Actualizar URL sin recargar la página
        const url = new URL(window.location);
        url.searchParams.set('groupId', groupId);
        window.history.replaceState({}, '', url);
        
        // Iniciar polling de mensajes nuevos solo si la página es visible
        if (document.visibilityState === 'visible') {
            startMessagePolling(groupId);
        }
        
    } catch (error) {
        console.error('Error al seleccionar chat:', error);
        showError('Error al cargar el chat');
    }
}

// Cargar mensajes de un grupo
async function loadMessages(groupId) {
    try {
        const apiBaseUrl = CONFIG.apiBaseUrl;
        const token = localStorage.getItem('authToken');
        
        // Mostrar indicador de carga solo si es la primera carga o si se solicitó explícitamente
        if (currentMessages.length === 0) {
            document.getElementById('messagesArea').innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status"></div>
                    <p class="mt-2">Cargando mensajes...</p>
                </div>
            `;
        }
        
        const response = await fetch(`${apiBaseUrl}/api/messages/group/${groupId}?limit=50&offset=0`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar mensajes');
        }
        
        const result = await response.json();
        // Extraer mensajes de la estructura anidada result.data.messages
        const newMessages = result.data && Array.isArray(result.data.messages) ? result.data.messages : [];
        
        // Comprobar si hay nuevos mensajes comparando con los actuales
        const hasChanges = newMessages.length !== currentMessages.length || 
            (newMessages.length > 0 && newMessages[newMessages.length - 1].id !== currentMessages[currentMessages.length - 1]?.id);
        
        if (hasChanges) {
            currentMessages = newMessages;
            displayMessages();
        }
        
        return newMessages;
        
    } catch (error) {
        console.error('Error al cargar mensajes:', error);
        document.getElementById('messagesArea').innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="bi bi-exclamation-circle fs-1"></i>
                <p class="mt-3">Error al cargar los mensajes</p>
            </div>
        `;
        return [];
    }
}

// Mostrar mensajes en el área de chat
function displayMessages() {
    const messagesArea = document.getElementById('messagesArea');
    const currentUserId = JSON.parse(localStorage.getItem('userData'))?.id;
    
    // Asegurarse de que currentMessages sea un array
    const messages = Array.isArray(currentMessages) ? [...currentMessages] : [];
    
    // Invertir el orden de los mensajes para mostrarlos cronológicamente (más antiguos primero)
    messages.reverse();
    
    if (messages.length === 0) {
        messagesArea.innerHTML = `
            <div class="text-center empty-state py-5">
                <i class="bi bi-chat-dots fs-1"></i>
                <p class="mt-3">No hay ningún mensaje</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    messages.forEach(message => {
        const isOwnMessage = message.userId === currentUserId;
        const alignClass = isOwnMessage ? 'justify-content-end' : 'justify-content-start';
        const cardClass = isOwnMessage ? 'bg-primary text-white' : 'bg-dark text-light';
        const authorName = message.User ? (message.User.firstName && message.User.lastName ? 
            `${message.User.firstName} ${message.User.lastName}` : message.User.nickname) : 'Usuario';
        const messageTime = new Date(message.createdAt).toLocaleTimeString('es', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        // Usar clase de texto personalizada para mejor contraste
        const timeClass = isOwnMessage ? 'opacity-75' : 'message-time-muted';
        
        html += `
            <div class="d-flex ${alignClass} mb-3">
                <div class="card message-card ${cardClass}">
                    <div class="card-body py-2 px-3">
                        ${!isOwnMessage ? `<small class="text-info fw-bold">${authorName}</small>` : ''}
                        <p class="mb-1">${escapeHtml(message.content)}</p>
                        <small class="${timeClass}">${messageTime}</small>
                    </div>
                </div>
            </div>
        `;
    });
    
    messagesArea.innerHTML = html;
    
    // Scroll al final
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Enviar mensaje
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message || !activeChat) {
        return;
    }
    
    // Verificar longitud del mensaje
    const maxLength = parseInt(input.getAttribute('maxlength'));
    if (message.length > maxLength) {
        showMessageError(`El mensaje es demasiado largo. Máximo ${maxLength} caracteres.`);
        return;
    }
    
    try {
        const apiBaseUrl = CONFIG.apiBaseUrl;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                groupId: activeChat,
                content: message
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al enviar mensaje');
        }
        
        // Limpiar input
        input.value = '';
        document.getElementById('charCount').textContent = `0/${maxLength}`;
        document.getElementById('charCount').classList.remove('text-warning');
        document.getElementById('charCount').classList.add('text-muted');
        
        // Recargar mensajes para mostrar el nuevo mensaje
        await loadMessages(activeChat);
        
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        if (error.message && error.message.includes('largo')) {
            showMessageError('El mensaje es demasiado largo para el servidor.');
        } else {
            showMessageError('Error al enviar el mensaje: ' + error.message);
        }
    }
}

// Función auxiliar para escapar HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Mostrar mensaje de error
function showError(message) {
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.innerHTML = `
        <div class="text-center py-4">
            <div class="alert alert-danger" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                ${message}
            </div>
        </div>
    `;
}

// Mostrar error específico para mensajes sin afectar el área de chat
function showMessageError(message) {
    // Crear un elemento toast para mostrar el error
    const toastContainer = document.createElement('div');
    toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '5';
    toastContainer.innerHTML = `
        <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header bg-danger text-white">
                <i class="bi bi-exclamation-circle me-2"></i>
                <strong class="me-auto">Error</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    document.body.appendChild(toastContainer);
    
    // Eliminar el toast después de 5 segundos
    setTimeout(() => {
        toastContainer.querySelector('.toast').classList.remove('show');
        setTimeout(() => toastContainer.remove(), 500);
    }, 5000);
    
    // Agregar evento al botón de cerrar
    const closeBtn = toastContainer.querySelector('.btn-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            toastContainer.querySelector('.toast').classList.remove('show');
            setTimeout(() => toastContainer.remove(), 500);
        });
    }
}

// Iniciar polling de mensajes nuevos
function startMessagePolling(groupId) {
    // Detener intervalo anterior si existe
    stopMessagePolling();
    
    // Iniciar nuevo intervalo
    messagePollInterval = setInterval(async () => {
        // Solo realizar la consulta si el chat está activo y estamos en la página
        if (activeChat === groupId && document.visibilityState === 'visible') {
            try {
                const apiBaseUrl = CONFIG.apiBaseUrl;
                const token = localStorage.getItem('authToken');
                
                // Usar el timestamp del mensaje más reciente para optimizar
                const lastMessageTime = currentMessages.length > 0 ? 
                    new Date(currentMessages[currentMessages.length - 1].createdAt).getTime() : 0;
                
                const response = await fetch(`${apiBaseUrl}/api/messages/group/${groupId}?limit=50&offset=0`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Error al verificar nuevos mensajes');
                }
                
                const result = await response.json();
                const fetchedMessages = result.data && Array.isArray(result.data.messages) ? result.data.messages : [];
                
                // Verificar si hay mensajes nuevos (comparando cantidad o el ID del último mensaje)
                const hasNewMessages = fetchedMessages.length !== currentMessages.length || 
                    (fetchedMessages.length > 0 && currentMessages.length > 0 && 
                     fetchedMessages[0].id !== currentMessages[0].id);
                
                if (hasNewMessages) {
                    // Actualizar los mensajes actuales y mostrarlos
                    currentMessages = fetchedMessages;
                    displayMessages();
                }
                
            } catch (error) {
                console.error('Error al verificar nuevos mensajes:', error);
            }
        }
    }, 3000); // Cada 3 segundos
}

// Detener el polling de mensajes
function stopMessagePolling() {
    if (messagePollInterval) {
        clearInterval(messagePollInterval);
        messagePollInterval = null;
    }
}
