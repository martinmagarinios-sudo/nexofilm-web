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

:: 3. Subir a Vercel (Preview) y asignar dominio
echo  [2/2] Publicando en URL de pruebas...
:: Redirigimos la salida a un archivo para capturar la URL exacta generada
call npx vercel --force > vercel_out.txt
set /p VERCEL_URL=<vercel_out.txt
del vercel_out.txt

echo  ✓ Venta de Preview creada: %VERCEL_URL%
echo  Asignando al dominio www.nexofilm.online...

call npx vercel alias set %VERCEL_URL% www.nexofilm.online
echo.

echo  ====================================
echo   ✓ Listo! Tu web de pruebas se actualizo.
echo   Podes verla en: https://www.nexofilm.online
echo.
echo   (Nota: Si Vercel tira error de alias, asegúrate
echo   de haber configurado los DNS en tu proveedor
echo   de dominios como vimos en el panel).
echo  ====================================
echo.
pause
