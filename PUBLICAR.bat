@echo off
echo.
echo  ====================================
echo   NexoFilm - Publicar cambios
echo  ====================================
echo.

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
echo  [2/3] Publicando en nexofilm.com...
call npx vercel --prod --force
echo  ✓ Publicado
echo.

:: 3. Verificar
echo  [3/3] Verificando...
echo.
echo  ====================================
echo   ✓ Listo! Tu web se actualizo.
echo   Visita: https://nexofilm.com
echo  ====================================
echo.
pause
