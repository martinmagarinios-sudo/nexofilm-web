import { Project, Client, Testimonial, HeroSlide } from '../types';

// =============================================================================
// CONFIGURACIÓN GENERAL DE NEXOFILM
// =============================================================================
// Aquí puedes editar los textos, enlaces e imágenes de la web fácilmente.

export const CONFIG = {
    // --- DATOS DE CONTACTO ---
    whatsappNumber: "5491151191964", // Número internacional sin '+' (ej: 54911...)
    whatsappMessage: "Hola Nexo! Me gustaría consultar por un proyecto.",
    social: {
        instagram: "https://instagram.com/nexofilm.co",
        linkedin: "https://www.linkedin.com/in/martin-magarinios/",
        behance: "https://www.behance.net/NexoFilm",
        email: "hola@nexofilm.com"
    },

    // --- SECCIÓN HERO (PORTADA) ---
    heroSlides: [
        {
            id: 1,
            title: "Producción Audiovisual",
            subtitle: "Contamos historias a través de imágenes en movimiento con una estética cinematográfica de alto impacto.",
            image: "https://images.unsplash.com/photo-1492691523567-6170f0295dbd?auto=format&fit=crop&q=80&w=2000",
            gallery: [
                "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=400",
                "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&q=80&w=400",
                "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400"
            ]
        },
        {
            id: 2,
            title: "Fotografía Profesional",
            subtitle: "Capturamos la esencia de tu marca con una mirada artística y una técnica impecable en cada disparo.",
            image: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&q=80&w=2000",
            gallery: [
                "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=400",
                "https://images.unsplash.com/photo-1516724562728-afc824a36e84?auto=format&fit=crop&q=80&w=400",
                "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?auto=format&fit=crop&q=80&w=400"
            ]
        },
        {
            id: 3,
            title: "Streaming",
            subtitle: "Transmisiones en vivo con calidad broadcast para eventos que necesitan conectar con el mundo en tiempo real.",
            image: "https://images.unsplash.com/photo-1516035010450-488669e4695b?auto=format&fit=crop&q=80&w=2000",
            gallery: [
                "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=400",
                "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&q=80&w=400",
                "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=400"
            ]
        }
    ] as HeroSlide[],

    // --- PORTFOLIO (BEHANCE) ---
    projects: [
        {
            id: "1",
            title: "Copa Airlines",
            category: "Video Comercial",
            imageUrl: "",
            videoUrl: "/video/portfolio/Copa.mp4",
            description: "25 años operando en Argentina",
            behanceUrl: "https://www.behance.net/gallery/233427891/25-anos-de-Copa-Airlines-operando-en-Argentina"
        },
        {
            id: "2",
            title: "Bahia Principe",
            category: "Video Institucional",
            imageUrl: "",
            videoUrl: "/video/portfolio/BP.mp4",
            description: "Video institucional para Bahia Principe.",
            behanceUrl: "https://www.behance.net/NexoFilm"
        },
        {
            id: "3",
            title: "Cerámica San Lorenzo",
            category: "Video Comercial",
            imageUrl: "",
            videoUrl: "/video/portfolio/CSL.mp4",
            description: "Producción audiovisual para Cerámica San Lorenzo.",
            behanceUrl: "https://www.behance.net/NexoFilm"
        },
        {
            id: "4",
            title: "Droguería del Sud",
            category: "Video Comercial",
            imageUrl: "",
            videoUrl: "/video/portfolio/DDS.mp4",
            description: "Producción audiovisual para Droguería del Sud.",
            behanceUrl: "https://www.behance.net/NexoFilm"
        },
        {
            id: "5",
            title: "GEA",
            category: "Video Institucional",
            imageUrl: "",
            videoUrl: "/video/portfolio/GEA.mp4",
            description: "Producción audiovisual para GEA.",
            behanceUrl: "https://www.behance.net/NexoFilm"
        },
        {
            id: "6",
            title: "TS Tour Operador",
            category: "Video Comercial",
            imageUrl: "",
            videoUrl: "/video/portfolio/TS.mp4",
            description: "Producción audiovisual para TS Tour Operador.",
            behanceUrl: "https://www.behance.net/NexoFilm"
        },
        {
            id: "7",
            title: "Vista Sol",
            category: "Video Institucional",
            imageUrl: "",
            videoUrl: "/video/portfolio/Vista.mp4",
            description: "Producción audiovisual para Vista Sol.",
            behanceUrl: "https://www.behance.net/NexoFilm"
        }
    ] as Project[],

    // --- CLIENTES ---
    // NOTA: Los logos de clientes se cargan automáticamente desde la carpeta "src/assets/clients".
    // La lista a continuación se mantiene por compatibilidad o si se desea volver al método manual.
    clients: [
        { id: "c1", name: "Bahia Principe", logo: "/img/clientes/BP_Logo.png" },
        { id: "c2", name: "Copa Airlines", logo: "/img/clientes/Copa_logo.png" },
        { id: "c3", name: "Drogueria del Sud", logo: "/img/clientes/DDS_logo.png" },
        { id: "c4", name: "Eseade", logo: "/img/clientes/Eseade_Logo.png" },
        { id: "c5", name: "GEA", logo: "/img/clientes/GEA_logo.png" },
        { id: "c6", name: "Iberostar", logo: "/img/clientes/iberostar_logo.png" },
        { id: "c7", name: "Julia Tours", logo: "/img/clientes/Julia Tours_logo.png" },
        { id: "c8", name: "RIU Hotels", logo: "/img/clientes/RIU_Logo.png" },
        { id: "c9", name: "Ceramica San Lorenzo", logo: "/img/clientes/San Lorenzo_logo.png" },
        { id: "c10", name: "TS Tour Operador", logo: "/img/clientes/TS_logo.png" },
        { id: "c11", name: "Vista Sol", logo: "/img/clientes/Vista Sol Blanco_logo.png" },
        { id: "c12", name: "Pacific Ocean", logo: "/img/clientes/PACIFIC-OCEAN_logo.png" },
        { id: "c13", name: "Namida nikei", logo: "/img/clientes/namida logo.png" },
        { id: "c14", name: "Jazz operador mayorista", logo: "/img/clientes/Jazz logo.png" },
        { id: "c15", name: "Circunda Travel", logo: "/img/clientes/circunda_logo.png" }
    ] as Client[],

    // --- TESTIMONIOS (LINKEDIN) ---
    testimonials: [
        {
            id: "t1",
            author: "Alba Mingo",
            role: "Director of Marketing at Bahia Principe Hotels&Resorts",
            company: "Bahia Principe",
            text: "Martin es el mejor en Latam… Su predisposición, creatividad, amabilidad y cercanía lo hacen unico en su profesión. Ha hecho numerosos trabajos con nosotros y siempre han sido de 10. Lo recomiendo totalmente y lo volveríamos a escoger 100 veces… Gracias @MartinMagariños",
            avatar: "https://media.licdn.com/dms/image/v2/C5603AQGsSw-S_v1zKw/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1516881726365?e=1772668800&v=beta&t=8z6VI_PcA8rEpuHpXAAOYA_MG58psxlLSkozElAfkS0",
            linkedinUrl: "https://www.linkedin.com/in/martin-magarinios/"
        },
        {
            id: "t2",
            author: "Erick Garnica",
            role: "Vice President Global Leisure Sales",
            company: "Palm Beach",
            text: "Martin Magariños es un gran profesional, tuve la fortuna de trabajar con él durante mi tiempo en Visit Lauderdale y The Palm Beaches- Organismos de Turismo, donde se creó una estrategia de contenido eficaz, con objetivos y público definido. Los tiempos y proceso de producción, fueron excelentes. Es un placer poder recomendar su gran trabajo y espero tener la oportunidad de volver a colaborar con el.",
            avatar: "https://media.licdn.com/dms/image/v2/D4E03AQHbCk3NDkicdQ/profile-displayphoto-crop_800_800/B4EZoskAWbIwAI-/0/1761684227855?e=1772668800&v=beta&t=t1ZDj3WobAsHcl_PT_orFlXijHGAfkhYZeJQ3KVvHIo",
            linkedinUrl: "https://www.linkedin.com/in/martin-magarinios/"
        },
        {
            id: "t3",
            author: "Hector Alvarez",
            role: "Business Development Director Latam | Hospitality Strategy & Revenue Growth | Strategic Partnerships",
            company: "Iberostar Hotels & Resorts",
            text: "Excelente profesional con gran creatividad y compromiso con el cliente !",
            avatar: "https://media.licdn.com/dms/image/v2/D4D03AQHXXEVJHr9BRQ/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1683608025727?e=1772668800&v=beta&t=fFeWYTJqGnIIdZmlSG2se2PaiszkFDQq4rZgKmusZOg",
            linkedinUrl: "https://www.linkedin.com/in/martin-magarinios/"
        },
        {
            id: "t4",
            author: "Marcelo Capdevila",
            role: "Presidente en Grupo Gea Latam",
            company: "Grupo Gea Latam",
            text: "Es de los mejores profesionales para coberturas de medios audiovisuales vinculados al turismo, la cálida de sus trabajos, la velocidad en la entrega y el conocimiento del sector lo hacen único",
            avatar: "https://media.licdn.com/dms/image/v2/D4D03AQF8H2rbLWn0qA/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1723980863038?e=1772668800&v=beta&t=WysFqXdCBFfUpIZHt7HxYMAObUHtaqSjjW4olJG6810",
            linkedinUrl: "https://www.linkedin.com/in/martin-magarinios/"
        },
        {
            id: "t5",
            author: "Nicolas Bortagaray",
            role: "Gerente Comercial - Europa",
            company: "AMV Travel DMC",
            text: "Trabaje con Martín de manera directa en eventos y algunas promociones y es además de un gusto, un profesional que sabe brindarte los consejos exactos para que las cosas salgan de manera excepcional. También he visto su trabajo de manera indirecta en reels o videos promocionales y debo de destacar la originalidad que maneja en todo lo que hace.",
            avatar: "https://media.licdn.com/dms/image/v2/D4D03AQHcWuxOwDiNgA/profile-displayphoto-shrink_800_800/B4DZaxdo4aG4Ao-/0/1746734059523?e=1772668800&v=beta&t=ZoEDlHI9Zzud64Rn_vssbQOb_JymH3tj4K7lvaBPBWk",
            linkedinUrl: "https://www.linkedin.com/in/martin-magarinios/"
        },
        {
            id: "t6",
            author: "Flor Blanco",
            role: "Productora Integral de Eventos",
            company: "Flor Blanco Producciones",
            text: "Hemos contratado a Martin Magariños para cubrir en foto y video diferentes proyectos como Expo Comerciales, Lanzamientos de Producto, Viajes, Inauguraciones de Plantas, etc, trabajos muy diversos en los cuales siempre aportó una mirada \u201Ccinematográfica\u201D acompañando la narrativa del evento. Comparte siempre propuestas creativas y suma con el drone un toque extra a todas las coberturas. Lo volveriamos a elegir SIEMPRE !!",
            avatar: "https://media.licdn.com/dms/image/v2/D4D03AQG7ttRFMR_55w/profile-displayphoto-crop_800_800/B4DZxJGOuRJ8AI-/0/1770752898353?e=1772668800&v=beta&t=flT3o6MN3854R1_C5HrzOtYfGno9esPKQFel-5LXn8U",
            linkedinUrl: "https://www.linkedin.com/in/martin-magarinios/"
        }
    ] as Testimonial[],

    // --- SECCIÓN HISTORIA (APP.TSX) ---
    // Podés usar imagen, video, o ambos (el video tiene prioridad, la imagen es fallback/poster)
    history: {
        title: "Somos", // El logo se insertará en el componente visualmente o se dejará 'Somos' y el logo al lado
        subtitle: "conectamos marcas",
        subtitle2: "con historias.",
        description1: "En NexoFilm entendemos que cada proyecto es una oportunidad para crear un vínculo visual poderoso. Utilizamos tecnología de vanguardia y ópticas de precisión para garantizar una nitidez y colorimetría que definen el estándar de la industria.",
        description2: "Nuestra misión trasciende lo técnico: somos el puente creativo que une la identidad de tu empresa con narrativas que emocionan y perduran. Cada fotograma, cada streaming y cada captura fija es un eslabón en esa conexión vital.",
        image: "https://images.unsplash.com/photo-1580231417088-72412e6e3cc7?auto=format&fit=crop&q=80&w=1200",
        video: "/video/historia/toma en la playa.mp4",
    } as { title: string; subtitle: string; subtitle2: string; description1: string; description2: string; image: string; video?: string },

    // --- FOOTER ---
    footer: {
        text: "Somos NexoFilm, conectamos marcas con historias. Fotografía, Streaming y Cine para marcas que trascienden.",
        copyright: "NexoFilm. Productora Audiovisual."
    }
};
