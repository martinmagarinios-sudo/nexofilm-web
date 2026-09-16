/**
 * Helper para registrar conversiones de Google Ads / Google Tag de manera segura
 */
export const trackConversion = (eventName = 'conversion_event_contact_1', params: Record<string, any> = {}) => {
  if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
    try {
      // Disparamos los nombres de evento para GA4 y Google Ads
      (window as any).gtag('event', 'conversion_event_contact', params);
      (window as any).gtag('event', 'conversion_event_contact_1', params);
      (window as any).gtag('event', 'contact', params);
      (window as any).gtag('event', 'generate_lead', params);
      (window as any).gtag('event', 'conversion', {
        send_to: 'AW-16426512171',
        ...params
      });
      console.log(`[Tracking] Evento de conversión enviado a Google Ads y GA4:`, { eventName, params });
    } catch (err) {
      console.warn('[Tracking] Error enviando evento a Google:', err);
    }
  }
};
