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
    
    // Event listeners para mejorar UX de fecha/hora
    setupDateTimeListeners();
}

// Configurar listeners para campos de fecha y hora
function setupDateTimeListeners() {
    // Auto-completar fecha de fin cuando se introduce hora de fin
    document.getElementById('endTime').addEventListener('change', function() {
        const endDate = document.getElementById('endDate');
        const startDate = document.getElementById('startDate');
        
        // Si se introduce hora de fin pero no fecha de fin, usar fecha de inicio
        if (this.value && !endDate.value && startDate.value) {
            endDate.value = startDate.value;
        }
    });
    
    // Cuando se cambia la hora de inicio, actualizar hora de fin si está vacía
    document.getElementById('startTime').addEventListener('change', function() {
        const endTime = document.getElementById('endTime');
        const endDate = document.getElementById('endDate');
        const startDate = document.getElementById('startDate');
        
        // Si no hay hora de fin configurada, poner 1 hora después
        if (!endTime.value && this.value) {
            const [hours, minutes] = this.value.split(':');
            const startDateTime = new Date();
            startDateTime.setHours(parseInt(hours), parseInt(minutes));
            
            // Añadir 1 hora
            const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
            endTime.value = endDateTime.toTimeString().slice(0, 5);
            
            // Si no hay fecha de fin, usar la misma que inicio
            if (!endDate.value && startDate.value) {
                endDate.value = startDate.value;
            }
        }
    });
    
    // Validar que fecha de fin no sea anterior a fecha de inicio
    document.getElementById('endDate').addEventListener('change', function() {
        const startDate = document.getElementById('startDate');
        if (startDate.value && this.value && this.value < startDate.value) {
            alert('La fecha de fin no puede ser anterior a la fecha de inicio');
            this.value = startDate.value;
        }
    });
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
    // Calcular correctamente el mes y año anterior
    let prevMonthYear = year;
    let prevMonthIndex = month - 1;
    
    if (prevMonthIndex < 0) {
        prevMonthIndex = 11; // Diciembre
        prevMonthYear = year - 1;
    }
    
    // Obtener el último día del mes anterior
    const lastDayOfPrevMonth = new Date(prevMonthYear, prevMonthIndex + 1, 0).getDate();
    
    for (let i = firstDayWeek - 1; i >= 0; i--) {
        const dayNum = lastDayOfPrevMonth - i;
        const dayElement = createDayElement(dayNum, prevMonthYear, prevMonthIndex, true);
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
    // Calcular correctamente el mes y año siguiente
    let nextMonthYear = year;
    let nextMonthIndex = month + 1;
    
    if (nextMonthIndex > 11) {
        nextMonthIndex = 0; // Enero
        nextMonthYear = year + 1;
    }
    
    let nextMonthDay = 1;
    while (currentRow.children.length < 7) {
        const dayElement = createDayElement(nextMonthDay, nextMonthYear, nextMonthIndex, true);
        currentRow.appendChild(dayElement);
        nextMonthDay++;
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
        
        // Procesar fecha y hora de inicio
        const startDateTime = new Date(session.startTime);
        document.getElementById('startDate').value = startDateTime.toISOString().split('T')[0];
        document.getElementById('startTime').value = startDateTime.toTimeString().slice(0, 5);
        
        // Procesar fecha y hora de fin si existe
        if (session.endTime) {
            const endDateTime = new Date(session.endTime);
            document.getElementById('endDate').value = endDateTime.toISOString().split('T')[0];
            document.getElementById('endTime').value = endDateTime.toTimeString().slice(0, 5);
        } else {
            document.getElementById('endDate').value = '';
            document.getElementById('endTime').value = '';
        }
        
        document.getElementById('description').value = session.description || '';
        document.getElementById('deleteSessionBtn').style.display = 'block';
    } else {
        document.getElementById('sessionModalTitle').textContent = 'Nueva Sesión';
        
        // Configurar fecha y hora por defecto
        const now = new Date();
        let defaultDate;
        
        if (selectedDateForModal) {
            defaultDate = new Date(selectedDateForModal);
        } else {
            defaultDate = now;
        }
        
        // Configurar fecha de inicio
        document.getElementById('startDate').value = defaultDate.toISOString().split('T')[0];
        document.getElementById('startTime').value = now.toTimeString().slice(0, 5);
        
        // Configurar hora de fin por defecto (1 hora después del inicio)
        const defaultEndTime = new Date(now.getTime() + 60 * 60 * 1000); // +1 hora
        document.getElementById('endDate').value = defaultDate.toISOString().split('T')[0]; // Misma fecha que inicio
        document.getElementById('endTime').value = defaultEndTime.toTimeString().slice(0, 5);
        
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
    
    // Combinar fecha y hora para crear datetime completo
    const startDate = document.getElementById('startDate').value;
    const startTime = document.getElementById('startTime').value;
    const endDate = document.getElementById('endDate').value;
    const endTime = document.getElementById('endTime').value;
    
    // Validar campos requeridos - TODOS son obligatorios para nuevas sesiones
    if (!startDate || !startTime) {
        alert('Por favor, completa la fecha y hora de inicio');
        return;
    }
    
    if (!endDate && !endTime) {
        alert('Por favor, completa la fecha y hora de fin. Las sesiones deben tener un tiempo definido.');
        return;
    }
    
    if (!endTime) {
        alert('Por favor, especifica la hora de fin de la sesión');
        return;
    }
    
    // Crear datetime de inicio
    const startDateTime = `${startDate}T${startTime}:00`;
    
    // Crear datetime de fin - siempre debe existir
    let endDateTime;
    if (endDate) {
        endDateTime = `${endDate}T${endTime}:00`;
    } else {
        // Si no hay fecha de fin, usar la misma fecha de inicio
        endDateTime = `${startDate}T${endTime}:00`;
    }
    
    // Validar que la hora de fin sea posterior a la de inicio
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    if (end <= start) {
        alert('La hora de fin debe ser posterior a la hora de inicio');
        return;
    }
    
    const sessionData = {
        startTime: startDateTime,
        endTime: endDateTime,
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
