# Script para crear estilos globales con sintaxis correcta para Angular Material 18

$stylesContent = @"
@use '@angular/material' as mat;

@include mat.core();

`$my-primary: mat.m2-define-palette(mat.`$m2-indigo-palette);
`$my-accent: mat.m2-define-palette(mat.`$m2-pink-palette, A200, A100, A400);
`$my-warn: mat.m2-define-palette(mat.`$m2-red-palette);

`$my-theme: mat.m2-define-light-theme((
  color: (
    primary: `$my-primary,
    accent: `$my-accent,
    warn: `$my-warn,
  ),
  typography: mat.m2-define-typography-config(),
  density: 0,
));

@include mat.all-component-themes(`$my-theme);

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
}

body {
  margin: 0;
  font-family: Roboto, "Helvetica Neue", sans-serif;
}

.success-snackbar {
  background-color: #4caf50 !important;
  color: white !important;
}

.error-snackbar {
  background-color: #f44336 !important;
  color: white !important;
}
"@

$stylesContent | Out-File -FilePath "src/styles.scss" -Encoding UTF8 -NoNewline

Write-Host "Estilos actualizados exitosamente"

