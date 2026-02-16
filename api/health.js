export default function handler(req, res) {
    res.status(200).json({
        status: 'ok',
        service: 'NexoFilm WhatsApp Bot',
        timestamp: new Date().toISOString(),
    });
}
