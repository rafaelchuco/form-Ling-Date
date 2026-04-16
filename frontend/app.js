const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

function toBoolean(value) {
  return value === 'true';
}

function byId(id) {
  return document.getElementById(id);
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  const data = await response.json();
  if (!response.ok) {
    const backendErrors = Array.isArray(data.errors) ? `: ${data.errors.join(', ')}` : '';
    const requestId = data.requestId ? ` (requestId: ${data.requestId})` : '';
    throw new Error((data.message || 'Error de red') + backendErrors + requestId);
  }
  return data;
}

function initEncuesta() {
  const form = byId('encuestaForm');
  if (!form) return;

  const statusEl = byId('formStatus');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    statusEl.textContent = 'Enviando...';

    const payload = {
      nombre: byId('nombre').value,
      edad: Number(byId('edad').value),
      pais: byId('pais').value,
      ha_usado_apps_citas: toBoolean(byId('ha_usado_apps_citas').value),
      tuvo_problemas_idioma: toBoolean(byId('tuvo_problemas_idioma').value),
      interes_conocer_extranjeros: toBoolean(byId('interes_conocer_extranjeros').value),
      interes_app_traduccion: Number(byId('interes_app_traduccion').value),
      funcion_mas_valiosa: byId('funcion_mas_valiosa').value,
      pagaria: toBoolean(byId('pagaria').value),
      precio_dispuesto: byId('precio_dispuesto').value,
      frecuencia_uso: byId('frecuencia_uso').value,
      confianza_app_nueva: Number(byId('confianza_app_nueva').value),
      recomendaria: toBoolean(byId('recomendaria').value),
      comentario: byId('comentario').value
    };

    try {
      await request('/respuestas', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      form.reset();
      statusEl.className = 'text-sm text-success';
      statusEl.textContent = 'Respuesta enviada. ¡Gracias por participar!';
    } catch (error) {
      console.error('[Encuesta] Error enviando respuesta', error);
      statusEl.className = 'text-sm text-rose-400';
      statusEl.textContent = error.message;
    }
  });
}

function initAdmin() {
  const loginSection = byId('loginSection');
  const dashboardSection = byId('dashboardSection');
  if (!loginSection || !dashboardSection) return;

  const loginForm = byId('loginForm');
  const loginStatus = byId('loginStatus');
  const logoutBtn = byId('logoutBtn');
  const exportBtn = byId('exportBtn');
  const applyFilterBtn = byId('applyFilter');
  const filterPais = byId('filterPais');
  const sortFecha = byId('sortFecha');
  const prevPageBtn = byId('prevPage');
  const nextPageBtn = byId('nextPage');
  const pageInfoEl = byId('pageInfo');

  let chartInstance = null;
  let cacheRows = [];
  let lastTableSignature = '';
  let dashboardLoadInFlight = false;
  let currentPage = 1;
  const pageSize = 20;
  let totalPages = 1;

  const setAuthedView = (authed) => {
    loginSection.classList.toggle('hidden', authed);
    dashboardSection.classList.toggle('hidden', !authed);
  };

  const isAuthed = () => !!localStorage.getItem('auth');

  const buildRowsSignature = (rows) =>
    rows.map((row) => `${row.id || ''}:${row.created_at || ''}`).join('|');

  const renderTable = (rows) => {
    const tbody = byId('tablaRespuestas');
    const signature = buildRowsSignature(rows);

    if (signature === lastTableSignature) return;
    lastTableSignature = signature;

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="px-2 py-4 text-center text-muted">Sin resultados</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map((row) => {
        const fecha = new Date(row.created_at).toLocaleString('es-ES');
        return `
          <tr class="border-b border-divider/60 align-top">
            <td class="px-2 py-3 text-muted">${fecha}</td>
            <td class="px-2 py-3">${row.nombre}</td>
            <td class="px-2 py-3">${row.edad}</td>
            <td class="px-2 py-3">${row.pais}</td>
            <td class="px-2 py-3">${row.interes_conocer_extranjeros ? 'Sí' : 'No'}</td>
            <td class="px-2 py-3">${row.pagaria ? 'Sí' : 'No'}</td>
            <td class="px-2 py-3 text-muted">${row.comentario || '-'}</td>
          </tr>
        `;
      })
      .join('');
  };

  const updatePaginationUI = () => {
    if (pageInfoEl) {
      pageInfoEl.textContent = `Página ${currentPage} de ${totalPages}`;
    }
    if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
    if (prevPageBtn) prevPageBtn.classList.toggle('opacity-50', currentPage <= 1);
    if (nextPageBtn) nextPageBtn.classList.toggle('opacity-50', currentPage >= totalPages);
  };

  const updateMetrics = (stats) => {
    byId('mTotal').textContent = stats.total_respuestas;
    byId('mInteres').textContent = `${stats.porcentaje_interes}%`;
    byId('mPago').textContent = `${stats.porcentaje_pago}%`;
    byId('mEdad').textContent = stats.promedio_edad;

    const chartNode = byId('statsChart');
    if (!chartNode) return;

    const nextData = [
      stats.porcentaje_necesidad,
      stats.porcentaje_problema_idioma,
      stats.porcentaje_interes,
      stats.porcentaje_pago
    ];

    if (!chartInstance) {
      chartInstance = new Chart(chartNode, {
        type: 'bar',
        data: {
          labels: ['Necesidad', 'Problema idioma', 'Interés', 'Pago'],
          datasets: [
            {
              label: '%',
              data: nextData,
              backgroundColor: ['#f07585', '#f0b050', '#5aad7a', '#e0556a'],
              borderRadius: 10,
              borderSkipped: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          resizeDelay: 200,
          animation: false,
          devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: { color: '#8a8278' },
              grid: { color: 'rgba(138,130,120,0.2)' }
            },
            x: {
              ticks: { color: '#8a8278' },
              grid: { display: false }
            }
          },
          plugins: {
            legend: {
              labels: {
                color: '#f0ebe3'
              }
            }
          }
        }
      });
      return;
    }

    chartInstance.data.datasets[0].data = nextData;
    chartInstance.update('none');
  };

  const loadDashboard = async () => {
    if (dashboardLoadInFlight) return;
    dashboardLoadInFlight = true;

    const pais = filterPais.value.trim();
    const order = sortFecha.value;

    try {
      const [statsRes, rowsRes] = await Promise.all([
        request('/stats'),
        request(
          `/respuestas?order=${encodeURIComponent(order)}&pais=${encodeURIComponent(pais)}&page=${currentPage}&pageSize=${pageSize}`
        )
      ]);

      updateMetrics(statsRes.data);
      cacheRows = rowsRes.data;
      totalPages = rowsRes.totalPages || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      renderTable(cacheRows);
      updatePaginationUI();
    } finally {
      dashboardLoadInFlight = false;
    }
  };

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const user = byId('user').value;
    const pass = byId('pass').value;

    if (user === 'admin' && pass === 'admin') {
      localStorage.setItem('auth', 'true');
      loginStatus.textContent = '';
      setAuthedView(true);
      loadDashboard().catch((error) => {
        console.error('[Admin] Error al cargar dashboard tras login', error);
        loginStatus.textContent = error.message;
      });
      return;
    }

    loginStatus.textContent = 'Credenciales incorrectas';
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('auth');
    location.reload();
  });

  applyFilterBtn.addEventListener('click', () => {
    currentPage = 1;
    loadDashboard().catch((error) => {
      console.error('[Admin] Error aplicando filtros', error);
      alert(error.message);
    });
  });

  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (currentPage <= 1) return;
      currentPage -= 1;
      loadDashboard().catch((error) => {
        console.error('[Admin] Error cargando página anterior', error);
      });
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      if (currentPage >= totalPages) return;
      currentPage += 1;
      loadDashboard().catch((error) => {
        console.error('[Admin] Error cargando página siguiente', error);
      });
    });
  }

  exportBtn.addEventListener('click', () => {
    if (!cacheRows.length) {
      alert('No hay datos para exportar');
      return;
    }

    const exportRows = cacheRows.map((row) => ({
      Fecha: new Date(row.created_at).toLocaleString('es-ES'),
      Nombre: row.nombre,
      Edad: row.edad,
      Pais: row.pais,
      Necesidad: row.ha_usado_apps_citas ? 'Si' : 'No',
      ProblemaIdioma: row.tuvo_problemas_idioma ? 'Si' : 'No',
      Interes: row.interes_conocer_extranjeros ? 'Si' : 'No',
      IA_1_5: row.interes_app_traduccion,
      Funcion: row.funcion_mas_valiosa,
      Pagaria: row.pagaria ? 'Si' : 'No',
      Precio: row.precio_dispuesto,
      Frecuencia: row.frecuencia_uso,
      Confianza_1_5: row.confianza_app_nueva,
      Recomendaria: row.recomendaria ? 'Si' : 'No',
      Comentario: row.comentario || ''
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Respuestas');
    XLSX.writeFile(workbook, 'respuestas_lingodate.xlsx');
  });

  if (!isAuthed()) {
    setAuthedView(false);
    return;
  }

  setAuthedView(true);
  updatePaginationUI();
  loadDashboard().catch((error) => {
    console.error('[Admin] Error en carga inicial de dashboard', error);
    alert(error.message);
  });

  setInterval(() => {
    if (isAuthed() && !document.hidden) {
      loadDashboard().catch((error) => {
        console.error('[Admin] Error en refresh automático', error);
      });
    }
  }, 30000);
}

initEncuesta();
initAdmin();
