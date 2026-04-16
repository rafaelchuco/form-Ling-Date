const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();
const TABLE_NAME = 'respuestas_encuesta';

function logInfo(req, message, extra = {}) {
  const requestId = req.requestId || 'n/a';
  console.log(`[API] id=${requestId} ${message}`, extra);
}

function logError(req, message, error) {
  const requestId = req.requestId || 'n/a';
  console.error(`[API_ERROR] id=${requestId} ${message}`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint
  });
}

function parseBoolean(value) {
  if (value === true || value === false) return value;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return null;
}

function parseNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isScale1to5(value) {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

function validatePayload(body) {
  const payload = {
    nombre: String(body.nombre || '').trim(),
    edad: parseNumber(body.edad),
    pais: String(body.pais || '').trim(),
    ha_usado_apps_citas: parseBoolean(body.ha_usado_apps_citas),
    tuvo_problemas_idioma: parseBoolean(body.tuvo_problemas_idioma),
    interes_conocer_extranjeros: parseBoolean(body.interes_conocer_extranjeros),
    interes_app_traduccion: parseNumber(body.interes_app_traduccion),
    funcion_mas_valiosa: String(body.funcion_mas_valiosa || '').trim(),
    pagaria: parseBoolean(body.pagaria),
    precio_dispuesto: String(body.precio_dispuesto || '').trim(),
    frecuencia_uso: String(body.frecuencia_uso || '').trim(),
    confianza_app_nueva: parseNumber(body.confianza_app_nueva),
    recomendaria: parseBoolean(body.recomendaria),
    comentario: String(body.comentario || '').trim()
  };

  const errors = [];

  if (!payload.nombre) errors.push('nombre es obligatorio');
  if (!Number.isInteger(payload.edad) || payload.edad < 18 || payload.edad > 100) {
    errors.push('edad debe ser un entero entre 18 y 100');
  }
  if (!payload.pais) errors.push('pais es obligatorio');
  if (payload.ha_usado_apps_citas === null) errors.push('ha_usado_apps_citas inválido');
  if (payload.tuvo_problemas_idioma === null) errors.push('tuvo_problemas_idioma inválido');
  if (payload.interes_conocer_extranjeros === null) errors.push('interes_conocer_extranjeros inválido');
  if (!isScale1to5(payload.interes_app_traduccion)) {
    errors.push('interes_app_traduccion debe estar entre 1 y 5');
  }

  const funcionesValidas = ['chat_traducido', 'voz', 'video', 'ia'];
  if (!funcionesValidas.includes(payload.funcion_mas_valiosa)) {
    errors.push('funcion_mas_valiosa inválida');
  }

  if (payload.pagaria === null) errors.push('pagaria inválido');

  const preciosValidos = ['0', '10', '20', '30', '50'];
  if (!preciosValidos.includes(payload.precio_dispuesto)) {
    errors.push('precio_dispuesto inválido');
  }

  const frecuenciasValidas = ['diario', 'semanal', 'ocasional'];
  if (!frecuenciasValidas.includes(payload.frecuencia_uso)) {
    errors.push('frecuencia_uso inválido');
  }

  if (!isScale1to5(payload.confianza_app_nueva)) {
    errors.push('confianza_app_nueva debe estar entre 1 y 5');
  }

  if (payload.recomendaria === null) errors.push('recomendaria inválido');

  return { payload, errors };
}

router.post('/respuestas', async (req, res) => {
  try {
    logInfo(req, 'POST /respuestas received');

    const { payload, errors } = validatePayload(req.body);

    if (errors.length > 0) {
      logInfo(req, 'POST /respuestas validation_failed', { errors });
      return res.status(400).json({
        ok: false,
        message: 'Validación fallida',
        errors
      });
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      logError(req, 'POST /respuestas supabase_insert_failed', error);
      throw error;
    }

    logInfo(req, 'POST /respuestas inserted', {
      id: data.id,
      pais: data.pais,
      edad: data.edad
    });

    return res.status(201).json({ ok: true, data });
  } catch (error) {
    logError(req, 'POST /respuestas failed', error);
    return res.status(500).json({
      ok: false,
      message: 'No se pudo guardar la respuesta',
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      requestId: req.requestId || null
    });
  }
});

router.get('/respuestas', async (req, res) => {
  try {
    const { pais, order = 'desc' } = req.query;
    logInfo(req, 'GET /respuestas received', { pais: pais || null, order });

    let query = supabase.from(TABLE_NAME).select('*');

    if (pais && String(pais).trim()) {
      query = query.ilike('pais', `%${String(pais).trim()}%`);
    }

    query = query.order('created_at', { ascending: order === 'asc' });

    const { data, error } = await query;
    if (error) {
      logError(req, 'GET /respuestas supabase_select_failed', error);
      throw error;
    }

    logInfo(req, 'GET /respuestas ok', { total: data.length });

    return res.json({ ok: true, total: data.length, data });
  } catch (error) {
    logError(req, 'GET /respuestas failed', error);
    return res.status(500).json({
      ok: false,
      message: 'No se pudieron listar las respuestas',
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      requestId: req.requestId || null
    });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const req = _req;
    logInfo(req, 'GET /stats received');

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select(
        'edad, ha_usado_apps_citas, tuvo_problemas_idioma, interes_conocer_extranjeros, pagaria'
      );

    if (error) {
      logError(req, 'GET /stats supabase_select_failed', error);
      throw error;
    }

    const total = data.length;

    if (total === 0) {
      return res.json({
        ok: true,
        data: {
          total_respuestas: 0,
          porcentaje_necesidad: 0,
          porcentaje_problema_idioma: 0,
          porcentaje_interes: 0,
          porcentaje_pago: 0,
          promedio_edad: 0
        }
      });
    }

    const countTrue = (field) => data.filter((row) => row[field] === true).length;
    const averageAge = data.reduce((acc, row) => acc + Number(row.edad || 0), 0) / total;
    const pct = (count) => Number(((count / total) * 100).toFixed(2));

    return res.json({
      ok: true,
      data: {
        total_respuestas: total,
        porcentaje_necesidad: pct(countTrue('ha_usado_apps_citas')),
        porcentaje_problema_idioma: pct(countTrue('tuvo_problemas_idioma')),
        porcentaje_interes: pct(countTrue('interes_conocer_extranjeros')),
        porcentaje_pago: pct(countTrue('pagaria')),
        promedio_edad: Number(averageAge.toFixed(2))
      }
    });
  } catch (error) {
    logError(_req, 'GET /stats failed', error);
    return res.status(500).json({
      ok: false,
      message: 'No se pudieron calcular las métricas',
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      requestId: _req.requestId || null
    });
  }
});

module.exports = router;
