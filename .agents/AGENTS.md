# Reglas de NexoFilm

## Supabase y GitHub
- **Cuenta de Supabase:** La cuenta correcta de Supabase para este proyecto está vinculada al inicio de sesión de GitHub que utiliza el correo de Gmail de Martín (`martinmagarinios@gmail.com`). Evitar iniciar sesión con otros correos o cuentas de GitHub que resulten en organizaciones vacías como `martinmagarinios-sudo's Project`.

## Despliegues y Producción
- **Entorno de Producción por Defecto:** Como regla estricta, todos los despliegues de cambios deben realizarse directamente sobre el entorno de producción en `nexofilm.com` (`npx vercel --prod --force`). No desplegar únicamente a URLs de prueba/staging de forma aislada.
