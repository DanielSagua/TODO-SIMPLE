# Todo Simple (Multiusuario) - Proyectos y Tareas

Stack:
- Node.js + Express
- SQL Server (mssql)
- Sesiones: express-session
- Front: HTML + Bootstrap 5.3 + JavaScript (sin motor de plantillas)
- Fechas: se guardan en **UTC** (datetimeoffset). La zona horaria se configura en `.env` con `APP_TZ`.

## 1) Base de datos
1. Crea una BD (ej: `TodoSimpleDB`) en SQL Server.
2. Ejecuta el script: `sql/001_schema.sql` en esa BD.

## 2) Configuración
1. Copia `.env.example` a `.env` y ajusta credenciales de BD + `APP_TZ`.
2. Instala dependencias:
   ```bash
   npm install
   ```

## 3) Crear admin inicial
```bash
npm run seed:admin
```

## 4) Ejecutar
```bash
npm run dev
```

Abrir:
- http://localhost:3000/login

## Notas
- La asignación de tareas se hace mediante un **selector** con los miembros del proyecto.
- En producción, considera un store de sesiones persistente (Redis/SQL) en vez de MemoryStore.
