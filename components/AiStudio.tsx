
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

type ToolType = 'analyze' | 'generate' | 'edit' | 'veo';

const AiStudio: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolType>('analyze');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState('');
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setResult(null); 
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const startProgressSimulation = (target: number, duration: number) => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    const startTime = Date.now();
    const startProgress = progress;
    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const factor = Math.min(elapsed / duration, 1);
      const nextProgress = startProgress + (target - startProgress) * factor;
      setProgress(nextProgress);
      if (factor >= 1) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      }
    }, 50);
  };

  const runTool = async () => {
    if (activeTool === 'analyze' && !selectedFile) return;
    setLoading(true);
    setResult(null);
    setProgress(0);
    setProgressMessage('Iniciando proceso...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      if (activeTool === 'analyze' && selectedFile) {
        startProgressSimulation(90, 3000);
        setProgressMessage('Estudiando composición visual...');
        const base64 = await fileToBase64(selectedFile);
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: {
            parts: [
              { inlineData: { data: base64, mimeType: selectedFile.type } },
              { text: prompt || "Analiza esta imagen profesionalmente. Centrate en: Composición, Iluminación, Colorimetría y Narrativa visual." }
            ]
          },
        });
        setProgress(100);
        setResult(response.text || "Error en el análisis.");
      } else if (activeTool === 'generate') {
        startProgressSimulation(90, 5000);
        setProgressMessage('Renderizando concepto...');
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: { parts: [{ text: prompt }] },
          config: { imageConfig: { imageSize: '1K', aspectRatio: "16:9" } },
        });
        const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (part?.inlineData) {
          setProgress(100);
          setResult(`data:image/png;base64,${part.inlineData.data}`);
        }
      }
    } catch (error) {
      console.error(error);
      setResult("Error en la conexión AI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-24 bg-[#050505] overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-block px-3 py-1 border border-nexo-lime text-nexo-lime text-[10px] font-black uppercase tracking-[0.4em] mb-6">Laboratorio AI</div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-6">Nexo Vision AI</h2>
          <p className="text-zinc-500 text-lg font-light max-w-2xl mx-auto">
            Herramientas de inteligencia artificial entrenadas para el análisis y creación de estética cinematográfica profesional.
          </p>
        </div>

        <div className="max-w-6xl mx-auto glass rounded-sm overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[650px] border-white/5">
          {/* Tabs */}
          <div className="w-full md:w-72 bg-black/80 p-8 flex flex-col gap-2 border-r border-white/5">
            {[
              { id: 'analyze', label: 'Estudio de Foto', icon: '🔍' },
              { id: 'generate', label: 'Concept Art', icon: '✨' },
              { id: 'veo', label: 'Animar (Veo)', icon: '🎬' },
            ].map(tool => (
              <button
                key={tool.id}
                onClick={() => { setActiveTool(tool.id as ToolType); setResult(null); setPrompt(''); setProgress(0); }}
                className={`flex items-center gap-4 p-5 rounded-sm transition-all text-[10px] font-black uppercase tracking-[0.2em] ${activeTool === tool.id ? 'bg-nexo-lime text-black scale-105' : 'text-zinc-500 hover:bg-white/5 hover:text-white'}`}
              >
                <span>{tool.icon}</span>
                {tool.label}
              </button>
            ))}
          </div>

          {/* Workspace Area */}
          <div className="flex-1 p-8 lg:p-16 flex flex-col">
            <div className="flex-1">
              <div className="space-y-8">
                {activeTool !== 'generate' && (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-sm p-12 text-center cursor-pointer transition-all ${previewUrl ? 'border-nexo-lime/50 bg-nexo-lime/5' : 'border-white/10 hover:border-nexo-lime/30'}`}
                  >
                    {previewUrl ? (
                      <img src={previewUrl} className="max-h-64 mx-auto rounded-sm shadow-2xl border border-white/10" alt="Frame" />
                    ) : (
                      <div className="text-zinc-500 space-y-4">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-nexo-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <p className="text-xs uppercase tracking-widest font-bold">Subir fotograma para estudio</p>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-black">Instrucciones del Director</label>
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-sm p-6 focus:outline-none focus:border-nexo-lime transition-all h-28 resize-none text-zinc-200 placeholder:text-zinc-700 font-light"
                    placeholder="Describe el análisis o visión cinematográfica..."
                  />
                </div>

                <button 
                  onClick={runTool}
                  disabled={loading || (activeTool !== 'generate' && !selectedFile)}
                  className={`w-full py-6 rounded-sm font-black uppercase tracking-[0.4em] text-[11px] transition-all ${loading ? 'bg-zinc-900 text-zinc-600' : 'bg-nexo-lime text-black hover:bg-white shadow-xl'}`}
                >
                  {loading ? 'Procesando Visión...' : 'Ejecutar Nexo AI'}
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="mt-16 pt-16 border-t border-white/5">
              {loading && (
                <div className="space-y-4 text-center">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-nexo-lime">
                        <span>{progressMessage}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-[2px] bg-white/5 overflow-hidden">
                        <div className="h-full bg-nexo-lime transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
              )}
              {result && !loading && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                  {activeTool === 'analyze' ? (
                    <div className="p-10 bg-white/[0.02] border border-nexo-lime/20 text-zinc-300 whitespace-pre-wrap leading-relaxed font-light text-lg">
                      <div className="text-[10px] uppercase tracking-widest font-black text-nexo-lime mb-6">Análisis Finalizado</div>
                      {result}
                    </div>
                  ) : (
                    <div className="relative">
                      <img src={result} className="w-full rounded-sm border border-white/10" alt="AI result" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AiStudio;
