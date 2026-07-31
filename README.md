# Trazli

Aplicacion gratuita para crear una pagina personal de enlaces. Cada usuario
puede registrarse, elegir una plantilla, personalizar los colores y publicar su
perfil en `/<usuario>`.

## Stack

- Astro 7 en modo servidor
- Adaptador Node en modo standalone
- PostgreSQL
- Sesiones persistentes con cookies seguras
- `bcryptjs` para el hash de contrasenas
- Resend para verificación de correo y recuperación de contraseña

## Desarrollo local

1. Copia `.env.example` a `.env`.
2. Configura una base de datos PostgreSQL en `DATABASE_URL`.
3. Ejecuta `npm run db:migrate`.
4. Arranca la aplicacion con `npm run dev`.

Sin `DATABASE_URL`, la landing, las pantallas de acceso y `/jmaledom` siguen
funcionando. El registro y el panel requieren PostgreSQL.

## Scripts

- `npm run dev`: servidor de desarrollo
- `npm run check`: validacion de Astro y TypeScript
- `npm run build`: build de produccion
- `npm run start`: migraciones y servidor Node de produccion
- `npm run db:migrate`: aplica las migraciones SQL pendientes

## Railway

1. Anade PostgreSQL al mismo proyecto de Railway.
2. En el servicio web crea `DATABASE_URL` con el valor
   `${{Postgres.DATABASE_URL}}`.
3. Anade `SITE_URL` con el dominio publico completo.
4. `PAYPAL_URL` configura el enlace de aportaciones voluntarias. Puedes ocultarlo
   en cualquier momento con `DONATIONS_ENABLED=false`.
5. Si la conexion de PostgreSQL no usa SSL, configura `DATABASE_SSL=false`.
6. Railway detectara `npm run build` y arrancara con `npm run start`.
7. Puedes usar `/api/health` como healthcheck.

## Correo transaccional

La verificación de correo, los cambios de dirección confirmados y la recuperación
de contraseña se activan al configurar estas variables:

- `RESEND_API_KEY`: clave privada de Resend.
- `EMAIL_FROM`: remitente de un dominio verificado, por ejemplo
  `Trazli <hola@trazli.com>`.
- `SITE_URL`: dominio público completo usado en los enlaces de los correos.

Sin estas variables, el registro sigue funcionando y las cuentas nuevas se
consideran verificadas para no bloquear el servicio.

No se usa `astro preview` en produccion y no hace falta configurar
`preview.allowedHosts`.

## Datos

Las migraciones estan en `database/`. Crean usuarios, perfiles, enlaces,
sesiones, límites de seguridad y el registro de aceptación de las condiciones.

El perfil historico de Jose se mantiene como respaldo en `/jmaledom`. Cuando se
registre una cuenta con ese usuario, el perfil guardado en PostgreSQL tendra
prioridad.
