// calendar.js 

let currentDate = new Date();
let workSessions = []; // Inicializar como array vacío
let selectedDateForModal = null;
let editingSessionId = null;

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    // Asegurar que workSessions esté inicializado
    if (!Array.isArray(workSessions)) {
        workSessions = [];
    }
    
    loadWorkSessions();
    generateCalendar();
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        generateCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        generateCalendar();
    });

    document.getElementById('addSessionBtn').addEventListener('click', () => {
        openSessionModal();
    });

    document.getElementById('sessionForm').addEventListener('submit', saveSession);
    document.getElementById('deleteSessionBtn').addEventListener('click', deleteSession);
}

// Cargar sesiones de trabajo desde la API
async function loadWorkSessions() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            redirectToLogin('No hay token de autenticación');
            return;
        }

        const response = await handleApiRequest(`${CONFIG.apiBaseUrl}/api/worksessions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Respuesta de la API:', result);
            
            // La API devuelve { success: true, data: [...] }
            if (result.success && Array.isArray(result.data)) {
                workSessions = result.data;
                console.log('Sesiones cargadas exitosamente:', workSessions.length);
            } else {
                console.warn('Formato de respuesta inesperado:', result);
                workSessions = [];
            }
            
            generateCalendar();
            updateStatistics();
        } else {
            console.error('Error cargando sesiones de trabajo:', response.status);
            workSessions = []; // Inicializar como array vacío en caso de error
            generateCalendar();
            updateStatistics();
        }
    } catch (error) {
        console.error('Error al cargar sesiones:', error);
        workSessions = []; // Inicializar como array vacío en caso de error
        generateCalendar();
        updateStatistics();
    }
}

// Generar el calendario
function generateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Actualizar título del mes
    document.getElementById('currentMonth').textContent = 
        new Date(year, month).toLocaleDateString('es-ES', { 
            month: 'long', 
            year: 'numeric' 
        });

    // Obtener primer día del mes y último día
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';

    let currentRow = document.createElement('div');
    currentRow.className = 'row mb-1';

    // Días del mes anterior
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = firstDayWeek - 1; i >= 0; i--) {
        const dayNum = prevMonth.getDate() - i;
        const dayElement = createDayElement(dayNum, year, month - 1, true);
        currentRow.appendChild(dayElement);
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
        if (currentRow.children.length === 7) {
            calendarGrid.appendChild(currentRow);
            currentRow = document.createElement('div');
            currentRow.className = 'row mb-1';
        }

        const dayElement = createDayElement(day, year, month, false);
        currentRow.appendChild(dayElement);
    }

    // Días del siguiente mes
    while (currentRow.children.length < 7) {
        const dayNum = currentRow.children.length - firstDayWeek - daysInMonth + 1;
        const dayElement = createDayElement(dayNum, year, month + 1, true);
        currentRow.appendChild(dayElement);
    }

    calendarGrid.appendChild(currentRow);
}

// Crear elemento de día del calendario
function createDayElement(day, year, month, isOtherMonth) {
    const col = document.createElement('div');
    col.className = 'col p-1';

    const dayDiv = document.createElement('div');
    dayDiv.className = `calendar-day bg-dark text-light d-flex flex-column justify-content-between p-2 ${isOtherMonth ? 'other-month' : ''}`;
    
    const dateObj = new Date(year, month, day);
    const today = new Date();
    
    // Marcar día actual
    if (!isOtherMonth && dateObj.toDateString() === today.toDateString()) {
        dayDiv.classList.add('today');
    }

    // Obtener horas trabajadas del día
    const dayKey = formatDateKey(dateObj);
    const dayHours = getWorkHoursForDay(dayKey);
    
    if (dayHours > 0) {
        dayDiv.classList.add('has-work');
    }

    dayDiv.innerHTML = `
        <div class="day-number">${day}</div>
        <div class="work-hours">${dayHours > 0 ? formatHours(dayHours) : ''}</div>
    `;

    // Event listener para abrir modal
    if (!isOtherMonth) {
        dayDiv.addEventListener('click', () => {
            selectedDateForModal = dateObj;
            showDaySessionsModal(dateObj);
        });
    }

    col.appendChild(dayDiv);
    return col;
}

// Obtener horas trabajadas para un día específico
function getWorkHoursForDay(dateKey) {
    // Validar que workSessions sea un array
    if (!Array.isArray(workSessions)) {
        console.warn('workSessions no es un array:', workSessions);
        return 0;
    }

    return workSessions
        .filter(session => {
            const sessionDate = new Date(session.startTime);
            return formatDateKey(sessionDate) === dateKey && session.endTime;
        })
        .reduce((total, session) => {
            const start = new Date(session.startTime);
            const end = new Date(session.endTime);
            return total + (end - start) / (1000 * 60 * 60); // horas
        }, 0);
}

// Formatear fecha como clave
function formatDateKey(date) {
    return date.toISOString().split('T')[0];
}

// Formatear horas
function formatHours(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

// Mostrar modal de sesiones del día
function showDaySessionsModal(date) {
    // Cerrar cualquier modal de sesión que pueda estar abierto
    const sessionModal = bootstrap.Modal.getInstance(document.getElementById('sessionModal'));
    if (sessionModal) {
        sessionModal.hide();
    }
    
    const dateStr = date.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    document.getElementById('selectedDate').textContent = dateStr;
    
    const dayKey = formatDateKey(date);
    
    // Validar que workSessions sea un array
    const daySessions = Array.isArray(workSessions) ? 
        workSessions.filter(session => {
            const sessionDate = new Date(session.startTime);
            return formatDateKey(sessionDate) === dayKey;
        }) : [];

    const totalHours = getWorkHoursForDay(dayKey);
    document.getElementById('dayTotalHours').textContent = formatHours(totalHours);

    renderDaySessions(daySessions);
    
    // Asegurar que no hay otros modales abiertos antes de mostrar este
    setTimeout(() => {
        const modal = new bootstrap.Modal(document.getElementById('daySessionsModal'));
        modal.show();
    }, 100);
}

// Renderizar sesiones del día
function renderDaySessions(sessions) {
    const container = document.getElementById('sessionsContainer');
    
    if (sessions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="bi bi-calendar-x fs-1"></i>
                <p class="mt-2">No hay sesiones registradas para este día</p>
            </div>
        `;
        return;
    }

    container.innerHTML = sessions.map(session => {
        const start = new Date(session.startTime);
        const end = session.endTime ? new Date(session.endTime) : null;
        const duration = end ? (end - start) / (1000 * 60 * 60) : 0;

        return `
            <div class="session-item bg-dark p-3 mb-2 rounded cursor-pointer" 
                 onclick="editSession(${session.id})">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="session-time">
                            ${start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            ${end ? ` - ${end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : ' - En curso'}
                        </div>
                        <div class="session-duration mt-1">
                            ${end ? formatHours(duration) : 'Sesión activa'}
                        </div>
                        ${session.description ? `<div class="mt-2">${session.description}</div>` : ''}
                    </div>
                    <button class="btn btn-outline-primary btn-sm">
                        <i class="bi bi-pencil"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Abrir modal de sesión
function openSessionModal(session = null) {
    editingSessionId = session ? session.id : null;
    
    if (session) {
        document.getElementById('sessionModalTitle').textContent = 'Editar Sesión';
        document.getElementById('startTime').value = new Date(session.startTime).toISOString().slice(0, 16);
        document.getElementById('endTime').value = session.endTime ? new Date(session.endTime).toISOString().slice(0, 16) : '';
        document.getElementById('description').value = session.description || '';
        document.getElementById('deleteSessionBtn').style.display = 'block';
    } else {
        document.getElementById('sessionModalTitle').textContent = 'Nueva Sesión';
        
        // Configurar fecha y hora por defecto
        const now = new Date();
        if (selectedDateForModal) {
            const defaultDate = new Date(selectedDateForModal);
            defaultDate.setHours(now.getHours());
            defaultDate.setMinutes(now.getMinutes());
            document.getElementById('startTime').value = defaultDate.toISOString().slice(0, 16);
        } else {
            document.getElementById('startTime').value = now.toISOString().slice(0, 16);
        }
        
        document.getElementById('endTime').value = '';
        document.getElementById('description').value = '';
        document.getElementById('deleteSessionBtn').style.display = 'none';
    }

    const modal = new bootstrap.Modal(document.getElementById('sessionModal'));
    modal.show();
}

// Editar sesión
function editSession(sessionId) {
    // Validar que workSessions sea un array
    if (!Array.isArray(workSessions)) {
        console.warn('workSessions no es un array al editar sesión');
        return;
    }

    const session = workSessions.find(s => s.id === sessionId);
    if (session) {
        openSessionModal(session);
    }
}

// Guardar sesión
async function saveSession(e) {
    e.preventDefault();
    
    const sessionData = {
        startTime: document.getElementById('startTime').value,
        endTime: document.getElementById('endTime').value || null,
        description: document.getElementById('description').value || null
    };

    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            redirectToLogin('No hay token de autenticación');
            return;
        }

        const url = editingSessionId 
            ? `${CONFIG.apiBaseUrl}/api/worksessions/${editingSessionId}`
            : `${CONFIG.apiBaseUrl}/api/worksessions`;
        
        const method = editingSessionId ? 'PUT' : 'POST';

        const response = await handleApiRequest(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(sessionData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Sesión guardada:', result);
            
            // Cerrar el modal de edición de sesión
            const sessionModal = bootstrap.Modal.getInstance(document.getElementById('sessionModal'));
            if (sessionModal) {
                sessionModal.hide();
            }
            
            // Esperar a que el modal se cierre completamente antes de recargar datos
            setTimeout(async () => {
                await loadWorkSessions();
                
                // Solo reabrir el modal del día si tenemos una fecha seleccionada
                if (selectedDateForModal) {
                    // Esperar un poco más para asegurar que el modal anterior se cerró completamente
                    setTimeout(() => {
                        showDaySessionsModal(selectedDateForModal);
                    }, 100);
                }
            }, 300);
        } else {
            const error = await response.json();
            const errorMessage = error.message || error.error || 'Error desconocido';
            alert('Error al guardar la sesión: ' + errorMessage);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar la sesión');
    }
}

// Eliminar sesión
async function deleteSession() {
    if (!editingSessionId || !confirm('¿Estás seguro de que quieres eliminar esta sesión?')) {
        return;
    }

    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            redirectToLogin('No hay token de autenticación');
            return;
        }

        const response = await handleApiRequest(`${CONFIG.apiBaseUrl}/api/worksessions/${editingSessionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Sesión eliminada:', result);
            
            // Cerrar el modal de edición de sesión
            const sessionModal = bootstrap.Modal.getInstance(document.getElementById('sessionModal'));
            if (sessionModal) {
                sessionModal.hide();
            }
            
            // Esperar a que el modal se cierre completamente antes de recargar datos
            setTimeout(async () => {
                await loadWorkSessions();
                
                // Solo reabrir el modal del día si tenemos una fecha seleccionada
                if (selectedDateForModal) {
                    // Esperar un poco más para asegurar que el modal anterior se cerró completamente
                    setTimeout(() => {
                        showDaySessionsModal(selectedDateForModal);
                    }, 100);
                }
            }, 300);
        } else {
            const error = await response.json();
            const errorMessage = error.message || error.error || 'Error al eliminar la sesión';
            alert(errorMessage);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar la sesión');
    }
}

// Actualizar estadísticas
function updateStatistics() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Validar que workSessions sea un array
    if (!Array.isArray(workSessions)) {
        console.warn('workSessions no es un array al actualizar estadísticas');
        // Mostrar valores por defecto
        document.getElementById('totalHoursMonth').textContent = '0h';
        document.getElementById('workDaysMonth').textContent = '0';
        document.getElementById('avgHoursDay').textContent = '0h';
        document.getElementById('totalSessions').textContent = '0';
        return;
    }
    
    const monthSessions = workSessions.filter(session => {
        const sessionDate = new Date(session.startTime);
        return sessionDate.getFullYear() === year && sessionDate.getMonth() === month;
    });

    const totalHours = monthSessions.reduce((total, session) => {
        if (session.endTime) {
            const start = new Date(session.startTime);
            const end = new Date(session.endTime);
            return total + (end - start) / (1000 * 60 * 60);
        }
        return total;
    }, 0);

    const workDays = new Set(monthSessions
        .filter(session => session.endTime)
        .map(session => formatDateKey(new Date(session.startTime)))
    ).size;

    const avgHours = workDays > 0 ? totalHours / workDays : 0;

    document.getElementById('totalHoursMonth').textContent = formatHours(totalHours);
    document.getElementById('workDaysMonth').textContent = workDays;
    document.getElementById('avgHoursDay').textContent = formatHours(avgHours);
    document.getElementById('totalSessions').textContent = monthSessions.length;
}

// Función para limpiar backdrops de modales que puedan quedar colgando
function cleanupModalBackdrops() {
    // Eliminar cualquier backdrop que pueda haber quedado
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => {
        backdrop.remove();
    });
    
    // Asegurar que el body no tenga clases de modal
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
}

// Agregar event listeners para limpiar modales cuando se cierren
document.addEventListener('DOMContentLoaded', function() {
    const daySessionsModal = document.getElementById('daySessionsModal');
    const sessionModal = document.getElementById('sessionModal');
    
    if (daySessionsModal) {
        daySessionsModal.addEventListener('hidden.bs.modal', function() {
            setTimeout(cleanupModalBackdrops, 100);
        });
    }
    
    if (sessionModal) {
        sessionModal.addEventListener('hidden.bs.modal', function() {
            setTimeout(cleanupModalBackdrops, 100);
        });
    }
});
