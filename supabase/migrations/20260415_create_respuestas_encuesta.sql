create extension if not exists "pgcrypto";

create table if not exists public.respuestas_encuesta (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  edad int not null,
  pais text not null,
  ha_usado_apps_citas boolean not null,
  tuvo_problemas_idioma boolean not null,
  interes_conocer_extranjeros boolean not null,
  interes_app_traduccion int not null check (interes_app_traduccion between 1 and 5),
  funcion_mas_valiosa text not null,
  pagaria boolean not null,
  precio_dispuesto text not null,
  frecuencia_uso text not null,
  confianza_app_nueva int not null check (confianza_app_nueva between 1 and 5),
  recomendaria boolean not null,
  comentario text,
  created_at timestamp with time zone default now()
);
