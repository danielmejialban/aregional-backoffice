# Asamblea Regional - Backoffice

Aplicación Angular 18 para la gestión de voluntarios de la Asamblea Regional.

## 🚀 Características

- **Autenticación JWT**: Login seguro con tokens Bearer
- **Gestión completa**: Departamentos, Roles, Voluntarios, Eventos, Asignaciones y Check-Ins
- **Angular Material**: UI moderna y responsive
- **Guards y Interceptors**: Protección de rutas y manejo automático de tokens
- **Tipado fuerte**: Interfaces TypeScript para todos los DTOs del backend

## 📋 Requisitos

- Node.js v20.18.0 o superior
- npm 10.8.2 o superior
- Backend corriendo en `http://localhost:8080`

## 🔧 Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start
```

La aplicación estará disponible en `http://localhost:4200`

## 🔐 Credenciales de Prueba

| Usuario | DNI | Contraseña | Rol |
|---------|-----|------------|-----|
| Admin | `12345678A` | `admin123` | ADMIN |
| Coordinador | `87654321B` | `admin123` | COORDINADOR |
| Voluntario | `11111111C` | `admin123` | VOLUNTARIO |
| Check-In | `22222222D` | `admin123` | CHECK_IN |

## 📁 Estructura del Proyecto

```
src/app/
├── components/          # Componentes de la aplicación
│   ├── login/          # Página de login
│   ├── layout/         # Layout principal con sidebar
│   ├── dashboard/      # Dashboard principal
│   ├── departamentos/  # Gestión de departamentos
│   ├── roles/          # Gestión de roles
│   ├── voluntarios/    # Gestión de voluntarios
│   ├── eventos/        # Gestión de eventos
│   ├── evento-voluntarios/  # Asignaciones
│   └── check-in/       # Check-ins
├── core/
│   ├── guards/         # Guards de autenticación y roles
│   └── interceptors/   # JWT y error interceptors
├── models/             # Interfaces TypeScript (DTOs)
├── services/           # Servicios de API
├── app.routes.ts       # Configuración de rutas
└── app.config.ts       # Configuración de la aplicación
```

## 🎨 Funcionalidades por Rol

### ADMIN
- Acceso completo a todas las funcionalidades
- Gestión de departamentos, roles, voluntarios, eventos
- Asignaciones de voluntarios a eventos
- Visualización de check-ins

### COORDINADOR
- Gestión de voluntarios
- Gestión de eventos
- Asignaciones de voluntarios a eventos

### VOLUNTARIO
- Visualización del dashboard
- Consulta de información personal

### CHECK_IN
- Escaneo de códigos QR
- Registro de check-ins
- Visualización de check-ins

## 🔌 Integración con el Backend

La aplicación se conecta al backend Spring Boot en `http://localhost:8080` y consume los siguientes endpoints:

- `/api/auth/login` - Autenticación
- `/api/departamentos` - CRUD de departamentos
- `/api/roles` - CRUD de roles
- `/api/voluntarios` - CRUD de voluntarios
- `/api/eventos` - CRUD de eventos
- `/api/evento-voluntarios` - Asignaciones (incluye generación de QR)
- `/api/check-in` - Check-ins y escaneo de QR

## 🛠️ Comandos Disponibles

```bash
# Desarrollo
npm start                 # Inicia el servidor de desarrollo

# Build
npm run build            # Compila la aplicación para producción

# Tests
npm test                 # Ejecuta los tests unitarios
npm run test:coverage    # Ejecuta tests con cobertura

# Linting
npm run lint             # Ejecuta el linter
```

## 🎯 Próximas Mejoras

- [ ] Formularios de creación/edición para todas las entidades
- [ ] Visualización de códigos QR
- [ ] Escáner de QR con cámara
- [ ] Exportación de datos a Excel/PDF
- [ ] Gráficos y estadísticas en el dashboard
- [ ] Notificaciones en tiempo real
- [ ] Modo oscuro

## 📝 Notas

- Asegúrate de que el backend esté corriendo antes de iniciar la aplicación
- Los interceptors manejan automáticamente los errores y tokens JWT
- Las rutas están protegidas según el rol del usuario

