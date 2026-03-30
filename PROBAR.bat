@echo off
echo.
echo  ====================================
echo   NexoFilm - Probar cambios (STAGING)
echo  ====================================
echo.

:: Ir a la carpeta del proyecto
cd /d "%~dp0"

:: 1. Girar a rama staging si no estamos en ella
git branch --show-current > current_branch.txt
set /p BRANCH=<current_branch.txt
del current_branch.txt

if not "%BRANCH%"=="staging" (
    echo.
    echo  Cambiando de %BRANCH% a rama de pruebas...
    git checkout staging 2>nul
    if %errorlevel% neq 0 (
        git checkout -b staging
    )
)

:: 2. Guardar en GitHub (Rama Staging)
echo.
echo  [1/2] Guardando cambios en GitHub (Branch: staging)...
git add .
set /p MSG="  Descripcion del cambio (Staging): "
if "%MSG%"=="" set MSG=Prueba de cambios
git commit -m "[STAGING] %MSG%"
git push origin staging
echo  ✓ Guardado en GitHub
echo.

:: 3. Subir a Vercel (Preview)
echo  [2/2] Publicando en URL de pruebas...
:: Usamos vercel SIN --prod para generar una URL de Preview aislada
call npx vercel --force
echo  ✓ Publicado en Staging
echo.

echo  ====================================
echo   ✓ Listo! Tu web de pruebas se actualizo.
echo   Podes ver la URL en la consola arriba.
echo   Recorda configurar las variables de 
echo   entorno (PREVIEW) en tu panel de Vercel.
echo  ====================================
echo.
pause
