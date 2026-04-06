@echo off
echo.
echo  ====================================
echo   NexoFilm - Publicar a Produccion
echo  ====================================
echo.
echo  ADVERTENCIA: Esta accion sobreescribira nexofilm.com
echo  con los archivos que tienes actualmente abiertos.
echo.
set /p CONFIRM="Estas seguro que quieres SOBREESCRIBIR LA WEB PUBLICA? (s/n): "
if /i not "%CONFIRM%"=="s" (
    echo  Publicacion cancelada por seguridad.
    pause
    exit /b
)

:: Ir a la carpeta del proyecto
cd /d "%~dp0"

:: 1. Guardar en GitHub
echo  [1/3] Guardando cambios en GitHub...
git add .
set /p MSG="  Descripcion del cambio: "
git commit -m "%MSG%"
git push
echo  ✓ Guardado en GitHub
echo.

:: 2. Subir a Vercel (produccion)
echo  [2/3] Publicando en nexofilm.com (PRODUCCION)...
call npx vercel --prod --force
echo  ✓ Publicado en nexofilm.com
echo.

:: 3. Verificar
echo  [3/3] Verificando...
echo.
echo  ====================================
echo   ✓ Listo! Tu web publica se actualizo.
echo   Visita: https://nexofilm.com
echo  ====================================
echo.
pause
