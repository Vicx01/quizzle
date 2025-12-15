import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import { ImageSize } from '../types';

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<ImageSize>(ImageSize.OneK);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setImageSrc(null);

    try {
      const result = await generateImage(prompt, size);
      if (result) {
        setImageSrc(result);
      } else {
        setError("No image data returned from the model.");
      }
    } catch (err) {
      setError("Failed to generate image. Please try a different prompt.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8 flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-white drop-shadow-md">Visual Study Aids</h2>
            <p className="text-blue-200/80">Generate diagrams, charts, or illustrations to help you memorize concepts.</p>
        </div>

        <div className="glass-panel p-8 rounded-2xl shadow-2xl space-y-6 border border-white/10">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">Image Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A detailed diagram of a plant cell structure..."
              className="w-full h-32 glass-input rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none transition-all"
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-300 mb-2 ml-1">Resolution</label>
             <div className="flex space-x-3">
                 {[ImageSize.OneK, ImageSize.TwoK, ImageSize.FourK].map((s) => (
                     <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={`flex-1 py-3 rounded-xl border font-medium text-sm transition-all ${
                            size === s 
                            ? 'bg-purple-600/90 border-purple-400/50 text-white shadow-lg' 
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                     >
                         {s}
                     </button>
                 ))}
             </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg ${
              loading
                ? 'bg-gray-700/50 cursor-not-allowed text-gray-500'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white hover:shadow-purple-500/30 hover:-translate-y-0.5'
            }`}
          >
            {loading ? (
                <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Designing...
                </span>
            ) : 'Generate Visual'}
          </button>
        </div>

        {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-xl flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-400">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
            </div>
        )}

        {imageSrc && (
          <div className="mt-8 animate-fade-in flex flex-col items-center w-full">
            <div className="p-2 bg-white/5 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl">
                <img src={imageSrc} alt="Generated Study Aid" className="rounded-xl max-w-full h-auto" />
            </div>
            <a 
                href={imageSrc} 
                download={`study-aid-${Date.now()}.png`}
                className="mt-6 flex items-center space-x-2 px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all border border-white/10 hover:border-white/30"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                <span>Download Image</span>
            </a>
          </div>
        )}
        
        <div className="text-center text-[10px] text-gray-500 mt-8">
            Generated using <span className="font-mono text-purple-300">gemini-3-pro-image-preview</span>
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;