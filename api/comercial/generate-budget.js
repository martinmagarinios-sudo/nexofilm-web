import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: (process.env.GROQ_API_KEY || '').trim() });

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { title, client_name, password } = req.body;

    // Validación de seguridad para Admin
    if (password !== 'Nex@2023R') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!title) {
        return res.status(400).json({ error: 'El título del proyecto es requerido' });
    }

    try {
        const systemPrompt = `Eres un experto productor audiovisual y consultor comercial de la productora NexoFilm (Argentina).
Tu tarea es generar el desglose de ítems comerciales y las condiciones de pago ideales para un proyecto audiovisual.

Genera una propuesta estética, profesional y sumamente detallada (describiendo equipamiento de gama alta, cámaras Sony FX3/FX6, ópticas de precisión, iluminación de cine, jornadas de edición, colorización, etc.).

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura (no agregues texto fuera del JSON, Markdown ni explicaciones):
{
  "items": [
    {
      "description": "Descripción muy profesional y técnica del servicio (ej: Jornada de rodaje de 8hs con 2 cámaras Sony FX3, ópticas de cine, micrófonos corbateros e iluminación LED Aputure)",
      "quantity": 1,
      "unit_price": 0
    }
  ],
  "payment_terms": "Condiciones de pago profesionales redactadas en español rioplatense (voseo), aclarando plazos de entrega, anticipo del 50%, y datos de facturación."
}`;

        const userPrompt = `Proyecto: "${title}" para el cliente "${client_name || 'Particular'}".
Generame entre 2 y 4 ítems de presupuesto detallando los servicios específicos requeridos (ej. pre-producción, jornadas de rodaje, post-producción/edición, entregas especiales) y las condiciones de pago recomendadas. Ajusta los unit_price a 0 (el usuario los ingresará manualmente).`;

        const chatCompletion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.6,
            response_format: { type: "json_object" }
        });

        const responseText = chatCompletion.choices[0].message.content;
        const generatedData = JSON.parse(responseText);

        return res.status(200).json({
            success: true,
            items: generatedData.items || [],
            payment_terms: generatedData.payment_terms || ''
        });

    } catch (error) {
        console.error('Error generando propuesta con Groq:', error);
        return res.status(500).json({ error: 'Falla al procesar la sugerencia de IA: ' + error.message });
    }
}
