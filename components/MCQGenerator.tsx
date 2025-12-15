import React, { useState, useRef, useCallback } from 'react';
import { generateMCQs } from '../services/geminiService';
import { MCQ, AppView } from '../types';

// Declare mammoth as it is loaded from CDN in index.html
declare var mammoth: any;

interface MCQGeneratorProps {
  onQuestionsGenerated: (questions: MCQ[], topic: string) => void;
  switchView: (view: AppView) => void;
}

const MCQGenerator: React.FC<MCQGeneratorProps> = ({ onQuestionsGenerated, switchView }) => {
  const [mode, setMode] = useState<'topic' | 'file'>('topic');
  const [inputText, setInputText] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<string>('Mixed');
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // File upload specific states
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileData, setFileData] = useState<{content: string, mimeType: string} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    setError(null);
    setUploadProgress(0);
    setFileData(null);

    // Size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
        setError("File too large. Please upload a file smaller than 10MB.");
        setFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
    }

    setFileName(file.name);
    
    // Handle DOCX files
    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.toLowerCase().endsWith(".docx")) {
        const reader = new FileReader();
        
        reader.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percent);
            }
        };

        reader.onload = (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            if (!arrayBuffer) return;

            try {
                if (typeof mammoth !== 'undefined') {
                    mammoth.extractRawText({ arrayBuffer: arrayBuffer })
                        .then((result: any) => {
                            const text = result.value;
                            // Encode text to base64 for consistency with other file types
                            // Using unescape(encodeURIComponent(str)) to handle Unicode
                            const base64String = btoa(unescape(encodeURIComponent(text)));
                            
                            setFileData({
                                content: base64String,
                                mimeType: 'text/plain' // Treat extracted content as plain text
                            });
                            setUploadProgress(100);
                        })
                        .catch((err: any) => {
                            console.error("Mammoth error:", err);
                            setError("Error parsing DOCX file. Please try converting to PDF or Text.");
                            setUploadProgress(0);
                        });
                } else {
                    setError("DOCX parser not loaded. Please refresh or use PDF.");
                }
            } catch (err) {
                console.error(err);
                setError("Failed to process DOCX file.");
            }
        };

        reader.onerror = () => {
            setError("Error reading file.");
            setUploadProgress(0);
        };

        reader.readAsArrayBuffer(file);
        return;
    }

    // Handle PDF, TXT, etc.
    const reader = new FileReader();
    
    reader.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
        }
    };

    reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64String = result.split(',')[1];
        setFileData({
            content: base64String,
            mimeType: file.type
        });
        setUploadProgress(100);
    };

    reader.onerror = () => {
        setError("Error reading file.");
        setUploadProgress(0);
    };

    reader.readAsDataURL(file);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
    } else if (e.type === "dragleave") {
        setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
    }
  }, [processFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          processFile(e.target.files[0]);
      }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      let questions: MCQ[] = [];
      let currentTopic = "";

      if (mode === 'topic') {
        if (!inputText.trim()) {
          setError("Please enter a topic.");
          setLoading(false);
          return;
        }
        currentTopic = inputText.length > 50 ? inputText.substring(0, 50) + "..." : inputText;
        questions = await generateMCQs(inputText, questionCount, false, undefined, difficulty);
      } else {
        if (!fileData) {
          setError("Please upload a file first.");
          setLoading(false);
          return;
        }

        currentTopic = fileName || "Uploaded Document";
        try {
            questions = await generateMCQs(fileData.content, questionCount, true, fileData.mimeType, 'Auto');
        } catch (err) {
             setError("Failed to generate questions. The file content might be unclear or unsupported.");
             console.error(err);
        }
      }

      if (questions && questions.length > 0) {
          onQuestionsGenerated(questions, currentTopic);
          switchView(AppView.Quiz);
      } else if (!error && questions.length === 0) {
          // If no questions but no specific error yet (rare case)
          setError("The model could not generate questions from this content.");
      }
    } catch (err) {
      setError("An error occurred while generating questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = parseInt(e.target.value);
      if (isNaN(val)) val = 1;
      if (val > 100) val = 100;
      if (val < 1) val = 1;
      setQuestionCount(val);
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 relative custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 animate-fade-in-up">
        <div className="text-center space-y-2 md:space-y-3">
          <h2 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white drop-shadow-sm dark:drop-shadow-lg animate-scale-in">Generate Your Quiz</h2>
          <p className="text-sm md:text-base text-blue-800 dark:text-blue-200/80 font-medium animate-fade-in delay-100">Create academic MCQs from any topic or document instantly.</p>
        </div>

        {/* Mode Switcher */}
        <div className="glass-card p-1 rounded-xl flex shadow-lg animate-fade-in delay-200 bg-white/50 dark:bg-white/5">
          <button
            onClick={() => setMode('topic')}
            className={`flex-1 py-2.5 md:py-3 rounded-lg font-medium text-xs md:text-sm transition-all duration-300 flex items-center justify-center space-x-2 ${
              mode === 'topic' 
                ? 'bg-blue-600 shadow-md text-white' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
            <span>Enter Topic</span>
          </button>
          <button
            onClick={() => setMode('file')}
            className={`flex-1 py-2.5 md:py-3 rounded-lg font-medium text-xs md:text-sm transition-all duration-300 flex items-center justify-center space-x-2 ${
              mode === 'file' 
                ? 'bg-blue-600 shadow-md text-white' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span>Upload Document</span>
          </button>
        </div>

        {/* Input Area */}
        <div key={mode} className="glass-panel rounded-2xl p-4 md:p-8 shadow-xl animate-fade-in">
          {mode === 'topic' ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 ml-1">Topic or Paste Text</label>
                    <span className={`text-xs font-medium ${inputText.length >= 10000 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {inputText.length.toLocaleString()} / 10,000
                    </span>
                </div>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  maxLength={10000}
                  placeholder="e.g. 'Photosynthesis advanced concepts' or paste a chapter summary..."
                  className="w-full h-40 md:h-48 glass-input rounded-xl p-3 md:p-4 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition-all duration-300"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 ml-1">Difficulty</label>
                <div className="grid grid-cols-2 md:flex md:space-x-2 bg-gray-200/50 dark:bg-black/20 p-1 rounded-xl gap-1 md:gap-0">
                   {['Easy', 'Medium', 'Hard', 'Mixed'].map((level) => (
                      <button
                        key={level}
                        onClick={() => setDifficulty(level)}
                        className={`py-2 px-3 md:px-4 rounded-lg text-xs md:text-sm font-medium transition-all md:flex-1 duration-200 ${
                          difficulty === level
                          ? 'bg-blue-600 shadow text-white scale-105'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        {level}
                      </button>
                   ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 ml-1">
                Upload Material (PDF, DOCX, TXT) 
                <span className="text-gray-500 text-xs font-normal ml-2 tracking-wide block md:inline">(Max 10MB)</span>
              </label>
              <div 
                className={`border-2 border-dashed rounded-xl p-6 md:p-12 text-center transition-all duration-300 cursor-pointer relative group
                  ${dragActive 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 scale-[1.02]' 
                      : 'border-gray-400 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-500/50 bg-white/50 dark:bg-transparent hover:bg-blue-50 dark:hover:bg-white/5'
                  }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.txt,.md,.csv,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileSelect}
                />
                
                <div className={`w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-full flex items-center justify-center transition-all duration-300 ${dragActive ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-400 group-hover:scale-110 group-hover:text-blue-500 dark:group-hover:text-blue-400'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 md:w-8 md:h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 truncate px-2">
                  {fileName ? (
                      <span className="font-semibold text-blue-700 dark:text-white bg-blue-100 dark:bg-blue-500/20 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-500/30 animate-scale-in">{fileName}</span>
                  ) : (
                      <span>Click to browse or <span className="text-blue-600 dark:text-blue-400 font-medium">drag & drop</span></span>
                  )}
                </p>

                {/* Progress Bar */}
                {uploadProgress > 0 && (
                    <div className="w-full max-w-xs mx-auto mt-6 animate-fade-in">
                        <div className="flex justify-between text-xs text-blue-600 dark:text-blue-300 mb-1">
                            <span>Uploading...</span>
                            <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}
                
                {fileName && uploadProgress === 100 && (
                    <div className="flex items-center justify-center mt-4 text-xs text-green-600 dark:text-green-400 animate-scale-in space-x-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                        </svg>
                        <span>Ready to generate</span>
                    </div>
                )}
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/20 p-3 rounded-lg flex items-start space-x-3 backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8.94 6.94a.75.75 0 1 1-1.061-1.061 3 3 0 1 1 2.871 5.026v.945a.75.75 0 0 1-1.5 0v-1a1.5 1.5 0 0 1 1.434-1.487 1.5 1.5 0 1 0-1.744-2.423Z" clipRule="evenodd" />
                    <path d="M9.75 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
                  </svg>
                  <p className="text-xs text-blue-900 dark:text-blue-200/80 leading-relaxed font-medium">
                      The AI will automatically analyze your document to match its difficulty level and teaching style.
                  </p>
              </div>
            </div>
          )}
          
          <div className="mt-6 md:mt-8 mb-4">
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 ml-1">
                Number of Questions: <span className="text-blue-600 dark:text-blue-400 font-bold">{questionCount}</span>
            </label>
            <div className="flex items-center space-x-4">
                <input
                    type="range"
                    min="1"
                    max="100"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-300 dark:bg-gray-700/50 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <input
                    type="number"
                    min="1"
                    max="100"
                    value={questionCount}
                    onChange={handleCountChange}
                    className="w-16 md:w-20 glass-input rounded-lg p-2 text-center text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-bold"
                />
            </div>
            <p className="text-[10px] text-gray-500 mt-2 ml-1">Maximum 100 questions per session.</p>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-200 rounded-xl text-sm flex items-center space-x-2 animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="mt-6 md:mt-8">
            <button
              onClick={handleGenerate}
              disabled={loading || (mode === 'file' && !fileData)}
              className={`w-full py-3 md:py-4 rounded-xl font-bold text-base md:text-lg flex items-center justify-center space-x-2 transition-all duration-300 shadow-lg ${
                loading || (mode === 'file' && !fileData)
                  ? 'bg-gray-200 dark:bg-gray-700/50 cursor-not-allowed text-gray-500 border border-transparent'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400/20 hover:shadow-blue-500/20 hover:-translate-y-0.5'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                  <span>Generate Questions</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="text-center text-gray-500 text-xs font-medium pb-4 animate-fade-in delay-300">
          Uses <span className="text-indigo-600 dark:text-indigo-400 font-mono">gemini-3-pro-preview</span> for high accuracy generation.
        </div>
      </div>
    </div>
  );
};

export default MCQGenerator;