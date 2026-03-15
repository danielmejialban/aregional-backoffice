# Script para crear estilos globales

$stylesContent = @"
@use '@angular/material' as mat;

@include mat.core();

`$primary-palette: mat.define-palette(mat.`$indigo-palette);
`$accent-palette: mat.define-palette(mat.`$pink-palette, A200, A100, A400);
`$warn-palette: mat.define-palette(mat.`$red-palette);

`$theme: mat.define-light-theme((
  color: (
    primary: `$primary-palette,
    accent: `$accent-palette,
    warn: `$warn-palette,
  ),
  typography: mat.define-typography-config(),
  density: 0,
));

@include mat.all-component-themes(`$theme);

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

Write-Host "Estilos creados exitosamente"

