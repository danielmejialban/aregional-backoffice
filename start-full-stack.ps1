# Script para iniciar Backend y Frontend simultáneamente

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Asamblea Regional - Full Stack" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que el backend esté disponible
$backendPath = "C:\Users\Daniel Albán\IdeaProjects\IAds\asamblea-regional"
$frontendPath = "C:\Users\Daniel Albán\IdeaProjects\IAds\asamblea-regional-backoffice"

if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Error: No se encuentra el directorio del backend" -ForegroundColor Red
    Write-Host "   Ruta esperada: $backendPath" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $frontendPath)) {
    Write-Host "❌ Error: No se encuentra el directorio del frontend" -ForegroundColor Red
    Write-Host "   Ruta esperada: $frontendPath" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Directorios encontrados" -ForegroundColor Green
Write-Host ""

# Función para iniciar el backend
function Start-Backend {
    Write-Host "🚀 Iniciando Backend (Spring Boot)..." -ForegroundColor Cyan
    Write-Host "   Puerto: 8080" -ForegroundColor White
    Write-Host "   Swagger: http://localhost:8080/swagger-ui.html" -ForegroundColor White
    Write-Host ""
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; ./gradlew bootRun"
}

# Función para iniciar el frontend
function Start-Frontend {
    Write-Host "🚀 Iniciando Frontend (Angular)..." -ForegroundColor Cyan
    Write-Host "   Puerto: 4200" -ForegroundColor White
    Write-Host "   URL: http://localhost:4200" -ForegroundColor White
    Write-Host ""
    
    Start-Sleep -Seconds 3
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm start"
}

# Iniciar ambos servicios
Write-Host "Iniciando servicios..." -ForegroundColor Yellow
Write-Host ""

Start-Backend
Start-Frontend

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ Servicios Iniciados" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:8080" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:4200" -ForegroundColor Cyan
Write-Host "Swagger:  http://localhost:8080/swagger-ui.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "Credenciales de prueba:" -ForegroundColor Magenta
Write-Host "  Admin:       12345678A / admin123" -ForegroundColor White
Write-Host "  Coordinador: 87654321B / admin123" -ForegroundColor White
Write-Host "  Voluntario:  11111111C / admin123" -ForegroundColor White
Write-Host "  Check-In:    22222222D / admin123" -ForegroundColor White
Write-Host ""
Write-Host "Presiona Ctrl+C para salir de este script" -ForegroundColor Yellow
Write-Host "Los servicios seguirán corriendo en sus propias ventanas" -ForegroundColor Yellow
Write-Host ""

# Esperar a que el usuario presione una tecla
Read-Host "Presiona Enter para cerrar este script"

