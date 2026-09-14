/**
 * Helper para registrar conversiones de Google Ads / Google Tag de manera segura
 */
export const trackConversion = (eventName = 'conversion_event_contact_1', params: Record<string, any> = {}) => {
  if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
    try {
      // Disparamos el nombre exacto que Google Ads configuró
      (window as any).gtag('event', 'conversion_event_contact_1', params);
      // Disparamos también los nombres alternativos/estándar por compatibilidad
      (window as any).gtag('event', 'conversion_event_contact', params);
      (window as any).gtag('event', 'generate_lead', params);
      console.log(`[Tracking] Evento de conversión enviado a Google:`, { eventName, params });
    } catch (err) {
      console.warn('[Tracking] Error enviando evento a Google:', err);
    }
  }
};
