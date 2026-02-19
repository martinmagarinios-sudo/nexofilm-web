
export interface Project {
  id: string;
  title: string;
  category: string;
  orientation?: 'landscape' | 'portrait'; // Para definir si mostrar 3 fotos verticales
  imageUrl: string;
  gallery?: string[];
  videoUrl?: string;
  embedUrl?: string;
  description: string;
  behanceUrl: string;
}

export interface Client {
  id: string;
  name: string;
  logo: string;
}

export interface Testimonial {
  id: string;
  author: string;
  role: string;
  company: string;
  text: string;
  avatar: string;
  linkedinUrl: string;
}

export interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  video?: string; // Video de fondo opcional (si existe, se usa en vez de la imagen)
  gallery: string[];
}
