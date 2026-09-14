/**
 * Helper para registrar conversiones de Google Ads / Google Tag de manera segura
 */
export const trackConversion = (eventName = 'conversion_event_contact', params: Record<string, any> = {}) => {
  if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
    try {
      (window as any).gtag('event', eventName, params);
      console.log(`[Tracking] Evento '${eventName}' enviado a Google.`);
    } catch (err) {
      console.warn('[Tracking] Error enviando evento a Google:', err);
    }
  }
};
