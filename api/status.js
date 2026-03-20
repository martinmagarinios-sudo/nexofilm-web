export default async function handler(req, res) {
    if (req.method === 'GET') {
        const token = process.env.WHATSAPP_TOKEN || 'ERROR_NO_TOKEN';
        const groqToken = process.env.GROQ_API_KEY ? 'OK' : 'MISSING';
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL ? 'OK' : 'MISSING';

        let tokenPreview = token.length > 15 ? token.substring(0, 10) + '...' + token.substring(token.length - 5) : token;

        return res.status(200).json({
            status: "Online",
            whatsapp_token_preview: tokenPreview,
            groq_status: groqToken,
            supabase_status: supabaseUrl,
            time: new Date().toISOString()
        });
    }
    return res.status(405).json({ error: 'Method Not Allowed' });
}
