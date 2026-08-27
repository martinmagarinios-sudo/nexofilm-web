import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
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
    
    float noise(vec2 p) {
        return sin(p.x * 10.0 + uTime) * cos(p.y * 10.0 + uTime) * 0.02;
    }

    void main() {
        vec2 uv = vUv;
        float dist = noise(uv * 2.0) * uHoverState * 3.0;
        vec2 center = vec2(0.5, 0.5);
        vec2 toCenter = center - uv;
        float distToCenter = length(toCenter);
        uv += toCenter * sin(distToCenter * 15.0 - uTime * 3.0) * 0.15 * uHoverState;
        uv += dist;
        vec4 color = texture2D(uTexture, uv);
        gl_FragColor = color;
    }
`;

const ShaderPlane = ({ imageSrc, isHovering }: { imageSrc: string, isHovering: boolean }) => {
    const texture = useTexture(imageSrc);

    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const targetHover = useRef(0);
    const currentHover = useRef(0);

    targetHover.current = isHovering ? 1.0 : 0.0;

    const uniforms = useMemo(() => ({
        uTexture: { value: texture },
        uHoverState: { value: 0.0 },
        uTime: { value: 0.0 }
    }), [texture]);

    useFrame((state, delta) => {
        if (!materialRef.current) return;
        currentHover.current += (targetHover.current - currentHover.current) * 0.08;
        materialRef.current.uniforms.uHoverState.value = currentHover.current;
        materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    });

    return (
        <mesh scale={[2, 2, 1]}>
            <planeGeometry args={[1, 1, 32, 32]} />
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

// Error Boundary para WebGL
class WebGLErrorBoundary extends React.Component<{ fallback: React.ReactNode, children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: { fallback: React.ReactNode, children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error: any) {
        console.warn("WebGL Shader error, rendering static image fallback:", error);
    }
    render() {
        if (this.state.hasError) return this.props.fallback;
        return this.props.children;
    }
}

// Componente principal
const WebGLHoverImage: React.FC<WebGLHoverImageProps> = ({ imageSrc, isHovering, className, alt }) => {
    // Si no hay imagen válida, no montar canvas para evitar cuelgues
    if (!imageSrc || typeof imageSrc !== 'string' || imageSrc.trim() === '') {
        return <div className={`w-full h-full bg-zinc-900 ${className || ''}`} />;
    }

    const staticFallback = (
        <img
            src={imageSrc}
            alt={alt || "Proyecto NexoFilm"}
            className={`w-full h-full object-cover transition-transform duration-700 ${isHovering ? 'scale-105' : 'scale-100'} ${className || ''}`}
            loading="lazy"
        />
    );

    return (
        <div 
            className={`w-full h-full relative ${className || ''}`}
            role="img"
            aria-label={alt || "Proyecto NexoFilm"}
        >
            <WebGLErrorBoundary fallback={staticFallback}>
                <Canvas
                    gl={{ antialias: false, powerPreference: "high-performance" }}
                    camera={{ position: [0, 0, 1] }}
                >
                    <React.Suspense fallback={null}>
                        <ShaderPlane imageSrc={imageSrc} isHovering={isHovering} />
                    </React.Suspense>
                </Canvas>
            </WebGLErrorBoundary>
        </div>
    );
};

export default WebGLHoverImage;
