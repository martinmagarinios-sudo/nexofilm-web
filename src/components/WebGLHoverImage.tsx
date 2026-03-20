import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface WebGLHoverImageProps {
    imageSrc: string;
    isHovering: boolean;
    className?: string;
    alt?: string;
}

// Vertex shader para pasar UVs
const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// Fragment shader con la distorsión líquida
const fragmentShader = `
    uniform sampler2D uTexture;
    uniform float uHoverState;
    uniform float uTime;
    
    varying vec2 vUv;
    
    // Función de ruido simple para darle un aspecto orgánico
    float noise(vec2 p) {
        return sin(p.x * 10.0 + uTime) * cos(p.y * 10.0 + uTime) * 0.02;
    }

    void main() {
        // Coordenadas base
        vec2 uv = vUv;
        
        // Calcular la distorsión basada en el hover y el tiempo
        float dist = noise(uv * 2.0) * uHoverState * 3.0; // Aumentado el ruido y multiplicador general
        
        // Abombamiento o efecto de onda hacia el centro al hacer hover
        vec2 center = vec2(0.5, 0.5);
        vec2 toCenter = center - uv;
        float distToCenter = length(toCenter);
        
        // Onda más intensa y evidente
        uv += toCenter * sin(distToCenter * 15.0 - uTime * 3.0) * 0.15 * uHoverState;
        uv += dist; // Añadir el ruido orgánico

        // Solo distorsión, sin desaturar (Portfolio a todo color)
        vec4 color = texture2D(uTexture, uv);
        gl_FragColor = color;
    }
`;

const ShaderPlane = ({ imageSrc, isHovering }: { imageSrc: string, isHovering: boolean }) => {
    // Cargar la textura
    const texture = useTexture(imageSrc);

    // Referencia al material para animar los uniforms
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    // Configurar uniforms
    const uniforms = useMemo(
        () => ({
            uTexture: { value: texture },
            uHoverState: { value: 0.0 }, // 0 = sin hover, 1 = con hover
            uTime: { value: 0.0 },
        }),
        [texture]
    );

    useFrame((state, delta) => {
        if (materialRef.current) {
            // Actualizar el tiempo para la animación fluida
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;

            // Interpolar suavemente el estado de hover (Easing)
            const targetHover = isHovering ? 1.0 : 0.0;
            const currentHover = materialRef.current.uniforms.uHoverState.value;
            materialRef.current.uniforms.uHoverState.value = THREE.MathUtils.lerp(currentHover, targetHover, 0.1);
        }
    });

    return (
        <mesh>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent={true}
            />
        </mesh>
    );
};

// Componente principal
const WebGLHoverImage: React.FC<WebGLHoverImageProps> = ({ imageSrc, isHovering, className, alt }) => {
    return (
        <div className={`w-full h-full relative ${className || ''}`}>
            {/* 
              Usamos la cámara ortográfica para que el plano llene exactamente la pantalla
              sin perspectivas raras, funcionando exactamente igual que una <img> cover
            */}
            <Canvas
                gl={{ antialias: false, powerPreference: "high-performance" }}
                camera={{ position: [0, 0, 1] }}
            >
                {/* Fallback interno mientras carga la textura */}
                <React.Suspense fallback={null}>
                    <ShaderPlane imageSrc={imageSrc} isHovering={isHovering} />
                </React.Suspense>
            </Canvas>
        </div>
    );
};

export default WebGLHoverImage;
