// download.js - Funcionalidad para la página de descargas

let workSessions = [];
let filteredSessions = [];
let reportData = null;

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadWorkSessions().then(() => {
        // Mostrar estado inicial sin datos en lugar de generar reporte automáticamente
        showInitialState();
    });
});

// Configurar event listeners
function setupEventListeners() {
    // Event listeners para los radio buttons de período
    const periodOptions = document.querySelectorAll('input[name="periodOption"]');
    periodOptions.forEach(option => {
        option.addEventListener('change', handlePeriodChange);
    });

    // Event listener para descargar PDF
    document.getElementById('downloadPdfBtn').addEventListener('click', downloadPDF);

    // Event listeners para campos de fecha personalizada
    document.getElementById('startDate').addEventListener('change', validateDateRange);
    document.getElementById('endDate').addEventListener('change', validateDateRange);
}

// Manejar cambio de período
function handlePeriodChange(e) {
    const value = e.target.value;
    const customFields = document.getElementById('customDateFields');
    const selectedLabel = e.target.nextElementSibling;
    
    // Limpiar cualquier animación previa para evitar conflictos
    if (selectedLabel) {
        selectedLabel.classList.remove('clicked');
        // Forzar reflow para asegurar que la clase se removió
        selectedLabel.offsetHeight;
        // Añadir efecto visual de click más sutil
        selectedLabel.classList.add('clicked');
        setTimeout(() => {
            selectedLabel.classList.remove('clicked');
        }, 200);
    }
    
    // Mostrar/ocultar campos de fecha personalizada
    if (value === 'customRange') {
        customFields.style.display = 'block';
        setupDefaultCustomDates();
    } else {
        customFields.style.display = 'none';
    }
    
    // Generar reporte con un delay mínimo para UX
    setTimeout(() => {
        generateReport();
    }, 100);
}

// Configurar fechas por defecto para rango personalizado
function setupDefaultCustomDates() {
    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    document.getElementById('startDate').value = oneWeekAgo.toISOString().split('T')[0];
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
}

// Validar rango de fechas
function validateDateRange() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (startDate && endDate && startDate > endDate) {
        alert('La fecha de inicio no puede ser posterior a la fecha de fin');
        document.getElementById('endDate').value = startDate;
        return;
    }
    
    // Si estamos en modo personalizado y ambas fechas están seleccionadas, regenerar reporte
    const selectedPeriod = document.querySelector('input[name="periodOption"]:checked');
    if (selectedPeriod && selectedPeriod.value === 'customRange' && startDate && endDate) {
        setTimeout(() => {
            generateReport();
        }, 100);
    }
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
            
            if (result.success && Array.isArray(result.data)) {
                workSessions = result.data;
                console.log('Sesiones cargadas exitosamente:', workSessions.length);
            } else {
                console.warn('Formato de respuesta inesperado:', result);
                workSessions = [];
            }
        } else {
            console.error('Error cargando sesiones de trabajo:', response.status);
            workSessions = [];
        }
    } catch (error) {
        console.error('Error al cargar sesiones:', error);
        workSessions = [];
    }
}

// Generar reporte
async function generateReport() {
    // Limpiar cualquier spinner previo en las tarjetas
    document.querySelectorAll('.period-card.generating').forEach(card => {
        card.classList.remove('generating');
    });
    
    // Mostrar indicador de carga en la tarjeta seleccionada
    const selectedRadio = document.querySelector('input[name="periodOption"]:checked');
    const selectedCard = selectedRadio ? selectedRadio.nextElementSibling.querySelector('.period-card') : null;
    
    if (selectedCard) {
        selectedCard.classList.add('generating');
    }
    
    showLoadingState();
    
    try {
        // Obtener período seleccionado de los radio buttons
        const selectedPeriod = selectedRadio.value;
        const dateRange = getDateRange(selectedPeriod);
        
        if (!dateRange) {
            hideLoadingState();
            if (selectedCard) selectedCard.classList.remove('generating');
            return;
        }

        // Filtrar sesiones por período
        filteredSessions = filterSessionsByDateRange(dateRange.start, dateRange.end);
        
        if (filteredSessions.length === 0) {
            hideLoadingState();
            showNoDataState();
            if (selectedCard) selectedCard.classList.remove('generating');
            return;
        }

        // Calcular estadísticas
        reportData = calculateReportData(filteredSessions, dateRange);
        
        // Mostrar vista previa
        hideLoadingState();
        showReportPreview(reportData);
        
    } catch (error) {
        console.error('Error generando reporte:', error);
        hideLoadingState();
        alert('Error al generar el reporte');
    } finally {
        // Asegurar que se quite el indicador de carga
        if (selectedCard) {
            selectedCard.classList.remove('generating');
        }
    }
}

// Obtener rango de fechas según el período seleccionado
function getDateRange(period) {
    const today = new Date();
    let start, end;

    switch (period) {
        case 'thisWeek':
            // Obtener lunes de la semana actual
            const dayOfWeek = today.getDay();
            const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajustar para que lunes sea el primer día
            start = new Date(today.setDate(diff));
            start.setHours(0, 0, 0, 0);
            
            // Fin de semana (domingo)
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            break;

        case 'thisMonth':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            start.setHours(0, 0, 0, 0);
            
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
            break;

        case 'customRange':
            const startDateValue = document.getElementById('startDate').value;
            const endDateValue = document.getElementById('endDate').value;
            
            if (!startDateValue || !endDateValue) {
                alert('Por favor, selecciona ambas fechas para el rango personalizado');
                return null;
            }
            
            start = new Date(startDateValue);
            start.setHours(0, 0, 0, 0);
            
            end = new Date(endDateValue);
            end.setHours(23, 59, 59, 999);
            break;

        default:
            return null;
    }

    return { start, end };
}

// Filtrar sesiones por rango de fechas
function filterSessionsByDateRange(startDate, endDate) {
    if (!Array.isArray(workSessions)) {
        return [];
    }

    return workSessions.filter(session => {
        if (!session.endTime) return false; // Solo sesiones terminadas
        
        const sessionStart = new Date(session.startTime);
        const sessionEnd = new Date(session.endTime);
        
        // La sesión se incluye si hay alguna superposición con el período
        return !(sessionEnd < startDate || sessionStart > endDate);
    });
}

// Calcular datos del reporte
function calculateReportData(sessions, dateRange) {
    let totalHours = 0;
    const workDaysSet = new Set();
    
    // Procesar cada sesión
    const processedSessions = sessions.map(session => {
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);
        
        // Calcular horas efectivas dentro del rango de fechas
        const effectiveStart = start < dateRange.start ? dateRange.start : start;
        const effectiveEnd = end > dateRange.end ? dateRange.end : end;
        
        const duration = (effectiveEnd - effectiveStart) / (1000 * 60 * 60); // horas
        totalHours += duration;
        
        // Añadir días trabajados al set (usar fecha de inicio efectiva)
        const dayKey = formatDateKey(effectiveStart);
        workDaysSet.add(dayKey);
        
        return {
            ...session,
            effectiveStart,
            effectiveEnd,
            duration
        };
    });

    const workDays = workDaysSet.size;
    const avgHours = workDays > 0 ? totalHours / workDays : 0;

    return {
        period: dateRange,
        sessions: processedSessions,
        totalHours,
        workDays,
        totalSessions: sessions.length,
        avgHours
    };
}

// Mostrar vista previa del reporte
function showReportPreview(data) {
    // Actualizar estadísticas
    document.getElementById('totalHours').textContent = formatHours(data.totalHours);
    document.getElementById('totalDays').textContent = data.workDays;
    document.getElementById('totalSessions').textContent = data.totalSessions;
    document.getElementById('avgHours').textContent = formatHours(data.avgHours);

    // Renderizar tabla de sesiones
    renderSessionsTable(data.sessions);

    // Mostrar vista previa
    document.getElementById('reportPreview').classList.remove('d-none');
    document.getElementById('noDataState').classList.add('d-none');
    hideInitialMessage();
}

// Renderizar tabla de sesiones
function renderSessionsTable(sessions) {
    const tbody = document.getElementById('sessionsTableBody');
    
    // Ordenar sesiones por fecha de inicio
    const sortedSessions = [...sessions].sort((a, b) => 
        new Date(a.startTime) - new Date(b.startTime)
    );

    tbody.innerHTML = sortedSessions.map(session => {
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);
        
        return `
            <tr>
                <td>${formatDate(start)}</td>
                <td>${formatTime(start)}</td>
                <td>${formatTime(end)}</td>
                <td>${formatHours(session.duration)}</td>
                <td>${session.description || '-'}</td>
            </tr>
        `;
    }).join('');
}

// Descargar PDF
function downloadPDF() {
    if (!reportData) {
        alert('No hay datos de reporte para descargar');
        return;
    }

    try {
        // Crear documento PDF usando jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Configuración
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        let yPosition = margin;

        // Título
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('TeleTrack - Reporte de Horas Trabajadas', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 15;

        // Período
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        const periodText = `Período: ${formatDate(reportData.period.start)} - ${formatDate(reportData.period.end)}`;
        doc.text(periodText, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 20;

        // Resumen estadísticas
        doc.setFont(undefined, 'bold');
        doc.text('Resumen:', margin, yPosition);
        yPosition += 10;

        doc.setFont(undefined, 'normal');
        doc.text(`Total de horas: ${formatHours(reportData.totalHours)}`, margin, yPosition);
        yPosition += 7;
        doc.text(`Días trabajados: ${reportData.workDays}`, margin, yPosition);
        yPosition += 7;
        doc.text(`Total de sesiones: ${reportData.totalSessions}`, margin, yPosition);
        yPosition += 7;
        doc.text(`Promedio por día: ${formatHours(reportData.avgHours)}`, margin, yPosition);
        yPosition += 20;

        // Tabla de sesiones
        doc.setFont(undefined, 'bold');
        doc.text('Detalle de sesiones:', margin, yPosition);
        yPosition += 10;

        // Encabezados de tabla
        const headers = ['Fecha', 'Inicio', 'Fin', 'Duración', 'Descripción'];
        const colWidths = [35, 25, 25, 25, 60];
        let xPosition = margin;

        doc.setFont(undefined, 'bold');
        headers.forEach((header, index) => {
            doc.text(header, xPosition, yPosition);
            xPosition += colWidths[index];
        });
        yPosition += 7;

        // Línea separadora
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;

        // Datos de sesiones
        doc.setFont(undefined, 'normal');
        const sortedSessions = [...reportData.sessions].sort((a, b) => 
            new Date(a.startTime) - new Date(b.startTime)
        );

        sortedSessions.forEach(session => {
            if (yPosition > 270) { // Nueva página si se necesita
                doc.addPage();
                yPosition = margin;
            }

            xPosition = margin;
            const start = new Date(session.startTime);
            const end = new Date(session.endTime);
            
            const rowData = [
                formatDate(start),
                formatTime(start),
                formatTime(end),
                formatHours(session.duration),
                session.description || '-'
            ];

            rowData.forEach((data, index) => {
                // Truncar texto si es muy largo
                let text = data.length > 20 ? data.substring(0, 17) + '...' : data;
                doc.text(text, xPosition, yPosition);
                xPosition += colWidths[index];
            });
            yPosition += 7;
        });

        // Pie de página
        const timestamp = new Date().toLocaleString('es-ES');
        doc.setFontSize(8);
        doc.text(`Generado el ${timestamp}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });

        // Descargar
        const filename = `TeleTrack_Reporte_${formatDate(reportData.period.start)}_${formatDate(reportData.period.end)}.pdf`;
        doc.save(filename);

    } catch (error) {
        console.error('Error generando PDF:', error);
        alert('Error al generar el PDF. Por favor, intenta nuevamente.');
    }
}

// Funciones de utilidad
function showLoadingState() {
    document.getElementById('loadingState').classList.remove('d-none');
    document.getElementById('reportPreview').classList.add('d-none');
    document.getElementById('noDataState').classList.add('d-none');
    hideInitialMessage();
}

function hideLoadingState() {
    document.getElementById('loadingState').classList.add('d-none');
}

function showNoDataState() {
    document.getElementById('noDataState').classList.remove('d-none');
    document.getElementById('reportPreview').classList.add('d-none');
    hideInitialMessage();
}

function hideReportPreview() {
    document.getElementById('reportPreview').classList.add('d-none');
    document.getElementById('noDataState').classList.add('d-none');
}

function showInitialState() {
    document.getElementById('reportPreview').classList.add('d-none');
    document.getElementById('noDataState').classList.add('d-none');
    document.getElementById('loadingState').classList.add('d-none');
    
    // Mostrar mensaje inicial
    showInitialMessage();
}

function showInitialMessage() {
    // Crear o mostrar elemento de estado inicial
    let initialState = document.getElementById('initialState');
    if (!initialState) {
        // Crear el elemento si no existe
        const reportContainer = document.getElementById('reportPreview').parentNode;
        initialState = document.createElement('div');
        initialState.id = 'initialState';
        initialState.className = 'text-center py-5';
        initialState.innerHTML = `
            <div class="text-primary mb-3">
                <i class="bi bi-calendar-check fs-1"></i>
            </div>
            <h5 class="text-light mb-2">Selecciona un período</h5>
            <p class="text-muted">Elige una de las opciones de arriba para generar tu reporte de horas trabajadas.</p>
        `;
        reportContainer.appendChild(initialState);
    }
    
    initialState.classList.remove('d-none');
}

function hideInitialMessage() {
    const initialState = document.getElementById('initialState');
    if (initialState) {
        initialState.classList.add('d-none');
    }
}

function formatHours(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    
    // Corregir el caso donde los minutos se redondean a 60
    if (m >= 60) {
        return formatHours(h + 1);
    }
    
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

function formatDate(date) {
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatTime(date) {
    return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
