# Script para iniciar la aplicación Angular

Write-Host "=== Iniciando Asamblea Regional Backoffice ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend debe estar corriendo en: http://localhost:8080" -ForegroundColor Yellow
Write-Host "Frontend estará disponible en: http://localhost:4200" -ForegroundColor Green
Write-Host ""
Write-Host "Credenciales de prueba:" -ForegroundColor Magenta
Write-Host "  Admin:       12345678A / admin123" -ForegroundColor White
Write-Host "  Coordinador: 87654321B / admin123" -ForegroundColor White
Write-Host "  Voluntario:  11111111C / admin123" -ForegroundColor White
Write-Host "  Check-In:    22222222D / admin123" -ForegroundColor White
Write-Host ""
Write-Host "Iniciando servidor de desarrollo..." -ForegroundColor Cyan
Write-Host ""

npm start

