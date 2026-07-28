export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            title = 'Jornada NexoFilm',
            date = '',
            start = '09:00',
            end = '',
            location = '',
            role = '',
            format = ''
        } = req.query;

        const eventTitle = role ? `${title} — ${role}` : title;
        const dateClean = date.replace(/-/g, '');
        const startClean = (start || '08:00').replace(':', '').padEnd(4, '0') + '00';
        
        let endClean = '';
        if (end) {
            endClean = end.replace(':', '').padEnd(4, '0') + '00';
        } else {
            const startHour = parseInt(startClean.substring(0, 2), 10) || 8;
            endClean = (startHour + 4).toString().padStart(2, '0') + '0000';
        }

        const dtstart = dateClean ? `${dateClean}T${startClean}` : '';
        const dtend = dateClean ? `${dateClean}T${endClean}` : '';

        // Google Calendar Link
        const googleUrl = `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(eventTitle)}&dates=${dtstart}/${dtend}&location=${encodeURIComponent(location)}&details=${encodeURIComponent('Confirmación de Jornada NexoFilm. Por favor estar 30 min antes.')}`;

        // Outlook Link
        const startIso = dateClean ? `${date.substring(0,4)}-${date.substring(5,7)}-${date.substring(8,10)}T${start}:00` : '';
        const endHourVal = (parseInt((start || '08').split(':')[0], 10) + 4).toString().padStart(2, '0');
        const endIso = dateClean ? `${date.substring(0,4)}-${date.substring(5,7)}-${date.substring(8,10)}T${end || (endHourVal + ':00')}:00` : '';
        const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(eventTitle)}&startdt=${encodeURIComponent(startIso)}&enddt=${encodeURIComponent(endIso)}&location=${encodeURIComponent(location)}`;

        // Direct ICS Export
        if (format === 'ics' || format === 'apple' || format === 'samsung') {
            const icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//NexoFilm//Jornada Calendar//ES',
                'CALSCALE:GREGORIAN',
                'METHOD:PUBLISH',
                'BEGIN:VEVENT',
                `UID:nexofilm-${dateClean || 'event'}-${Date.now()}@nexofilm.com`,
                `DTSTAMP:${dateClean || '20260101'}T000000Z`,
                `DTSTART:${dtstart || '20260101T080000'}`,
                `DTEND:${dtend || '20260101T120000'}`,
                `SUMMARY:${eventTitle}`,
                `LOCATION:${location}`,
                `DESCRIPTION:Confirmación de Jornada NexoFilm. Se solicita estar 30 minutos antes.`,
                'STATUS:CONFIRMED',
                'END:VEVENT',
                'END:VCALENDAR'
            ].join('\r\n');

            res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="jornada-nexofilm.ics"`);
            return res.status(200).send(icsContent);
        }

        // Direct Google Redirect if specified
        if (format === 'google') {
            return res.redirect(302, googleUrl);
        }

        // Direct Outlook Redirect if specified
        if (format === 'outlook') {
            return res.redirect(302, outlookUrl);
        }

        // Universal HTML Selection Page (High Aesthetics for NexoFilm)
        const icsSelfUrl = `/api/calendar?title=${encodeURIComponent(title)}&role=${encodeURIComponent(role)}&date=${encodeURIComponent(date)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&location=${encodeURIComponent(location)}&format=ics`;

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agregar Jornada a tu Agenda | NexoFilm</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #050505;
      color: #f4f4f5;
      font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: rgba(18, 18, 20, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      max-width: 440px;
      width: 100%;
      padding: 28px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.8);
      backdrop-filter: blur(12px);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #bfe023;
      text-transform: uppercase;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #ffffff;
    }
    .subtitle {
      font-size: 12px;
      color: #a1a1aa;
      margin-bottom: 20px;
    }
    .details {
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .detail-item {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }
    .detail-item:last-child { margin-bottom: 0; }
    .detail-label { color: #71717a; font-weight: 700; min-width: 70px; }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 14px 18px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s ease;
      margin-bottom: 12px;
      border: 1px solid transparent;
    }
    .btn:last-child { margin-bottom: 0; }
    .btn-apple {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.15);
    }
    .btn-apple:hover { background: rgba(255, 255, 255, 0.15); }
    .btn-google {
      background: rgba(66, 133, 244, 0.15);
      color: #60a5fa;
      border-color: rgba(66, 133, 244, 0.3);
    }
    .btn-google:hover { background: rgba(66, 133, 244, 0.25); }
    .btn-samsung {
      background: rgba(191, 224, 35, 0.12);
      color: #bfe023;
      border-color: rgba(191, 224, 35, 0.3);
    }
    .btn-samsung:hover { background: rgba(191, 224, 35, 0.22); }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 11px;
      color: #52525b;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <span style="font-size: 20px;">🎬</span>
      <span class="brand-title">NexoFilm</span>
    </div>
    <h1>Agendar Jornada</h1>
    <p class="subtitle">Elegí tu aplicación de calendario preferida para guardar el evento:</p>

    <div class="details">
      <div class="detail-item"><span class="detail-label">Evento:</span> <span>${eventTitle}</span></div>
      ${date ? `<div class="detail-item"><span class="detail-label">Fecha:</span> <span>${date}</span></div>` : ''}
      ${start ? `<div class="detail-item"><span class="detail-label">Horario:</span> <span>${start}${end ? ' a ' + end : ''} hs</span></div>` : ''}
      ${location ? `<div class="detail-item"><span class="detail-label">Lugar:</span> <span>${location}</span></div>` : ''}
    </div>

    <a href="${icsSelfUrl}" class="btn btn-apple">
      <span>🍏</span> iPhone / Apple Calendar (.ics)
    </a>

    <a href="${icsSelfUrl}" class="btn btn-samsung">
      <span>📱</span> Samsung Calendar / Android (.ics)
    </a>

    <a href="${googleUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-google">
      <span>🔵</span> Google Calendar
    </a>

    <div class="footer">NexoFilm Productora Audiovisual</div>
  </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(html);

    } catch (error) {
        console.error('Error en api/calendar:', error);
        return res.status(500).send('Error procesando calendario');
    }
}
