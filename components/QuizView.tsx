import React, { useState, useEffect, useRef } from 'react';
import { MCQ, AppView, QuizHistoryItem } from '../types';
import { generateSpeech } from '../services/geminiService';
import { decodeBase64, decodeAudioData } from '../services/audioUtils';

interface QuizViewProps {
  questions: MCQ[];
  topic: string;
  goBack: (view: AppView) => void;
}

const QuizView: React.FC<QuizViewProps> = ({ questions, topic, goBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [resultTab, setResultTab] = useState<'overview' | 'review'>('overview');
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasSavedRef = useRef(false);

  // Reset saved flag when questions change (new quiz)
  useEffect(() => {
    hasSavedRef.current = false;
  }, [questions]);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleSkip = () => {
    stopAudio();
    if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
    } else {
        setShowResult(true);
    }
  };

  const handleNext = () => {
    stopAudio();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowResult(true);
    }
  };

  const handleSelect = (optionKey: string) => {
    if (!!selectedAnswers[questions[currentIndex].id]) return; // Prevent changing answer using updated logic check
    setSelectedAnswers(prev => ({
      ...prev,
      [questions[currentIndex].id]: optionKey
    }));
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showResult || !questions || questions.length === 0) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return; // Ignore shortcuts

      const key = e.key.toUpperCase();
      const currentQ = questions[currentIndex];
      const isSel = !!selectedAnswers[currentQ.id];

      // Option Selection (A, B, C, D)
      if (['A', 'B', 'C', 'D'].includes(key)) {
        if (!isSel) {
          handleSelect(key);
        }
      }

      // Confirm / Next (Enter)
      if (key === 'ENTER') {
        if (isSel) {
          handleNext();
        }
      }

      // Navigation / Skip (ArrowRight)
      if (key === 'ARROWRIGHT') {
        if (isSel) {
          handleNext();
        } else {
          // Allow skipping with ArrowRight for smoother navigation
          handleSkip();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, selectedAnswers, showResult, questions]);

  const correctCount = questions?.reduce((acc, q) => {
      return acc + (selectedAnswers[q.id] === q.answer ? 1 : 0);
  }, 0) || 0;

  // Save Result to LocalStorage
  useEffect(() => {
    if (showResult && questions && questions.length > 0 && !hasSavedRef.current) {
        hasSavedRef.current = true;
        try {
            const newItem: QuizHistoryItem = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                topic: topic || 'Untitled Quiz',
                score: correctCount,
                total: questions.length,
                questions: questions
            };
            
            const existing = localStorage.getItem('quizzle_history');
            const history: QuizHistoryItem[] = existing ? JSON.parse(existing) : [];
            
            // Keep last 50 items to prevent storage bloat
            if (history.length >= 50) history.pop();
            
            history.unshift(newItem);
            localStorage.setItem('quizzle_history', JSON.stringify(history));
        } catch (e) {
            console.error("Failed to save history", e);
        }
    }
  }, [showResult, questions, topic, correctCount]);

  if (!questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-in">
        <div className="w-24 h-24 bg-gray-200 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 border border-gray-300 dark:border-white/10 animate-scale-in">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Questions Available</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm mx-auto">Go back to the generator to create your first quiz and start learning.</p>
        <button 
            onClick={() => goBack(AppView.Generator)}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
        >
            Create Quiz
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isSelected = !!selectedAnswers[currentQuestion.id];
  const selectedOption = selectedAnswers[currentQuestion.id];
  const isCorrect = selectedOption === currentQuestion.answer;
  
  const handleRetake = () => {
    stopAudio();
    setCurrentIndex(0);
    setSelectedAnswers({});
    setShowResult(false);
    setResultTab('overview');
    // Reset save flag for retake? Usually retaking doesn't overwrite immediately, 
    // but if they finish again it will save as a new entry.
    hasSavedRef.current = false;
  };

  const stopAudio = () => {
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    setAudioPlaying(false);
  };
  
  const handleTTS = async () => {
    if (audioPlaying) {
        stopAudio();
        return;
    }

    setAudioPlaying(true);

    try {
        const textToRead = `Question: ${currentQuestion.question}. Option A: ${currentQuestion.options.A}. Option B: ${currentQuestion.options.B}. Option C: ${currentQuestion.options.C}. Option D: ${currentQuestion.options.D}.`;
        
        const base64Audio = await generateSpeech(textToRead);
        
        if (base64Audio) {
            // Close any existing context before creating a new one
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }

            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
            const audioBuffer = await decodeAudioData(
                decodeBase64(base64Audio),
                audioContextRef.current,
                24000,
                1
            );
            
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            
            source.onended = () => {
                setAudioPlaying(false);
                // Keep context open briefly or close? Better to close to save resources.
                if (audioContextRef.current) {
                    audioContextRef.current.close();
                    audioContextRef.current = null;
                }
            };
            
            source.start(0);
        } else {
            setAudioPlaying(false);
        }
    } catch (e) {
        console.error("TTS play error", e);
        stopAudio();
    }
  };

  if (showResult) {
    const skippedCount = questions.reduce((acc, q) => {
      return acc + (!selectedAnswers[q.id] ? 1 : 0);
    }, 0);
    const incorrectCount = questions.length - correctCount - skippedCount;
    const percentage = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900/50">
        {/* Fixed Header Section */}
        <div className="shrink-0 pt-8 pb-4 px-6 flex flex-col items-center z-10 bg-gray-100/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-white/5 transition-colors duration-300">
             <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 animate-fade-in-up">Quiz Results</h2>
             
             {/* Tabs */}
             <div className="flex p-1 bg-gray-200 dark:bg-black/40 rounded-xl w-full max-w-xs animate-fade-in-up delay-100">
                <button 
                    onClick={() => setResultTab('overview')}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${resultTab === 'overview' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white scale-100' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 scale-95'}`}
                >
                    Overview
                </button>
                <button 
                    onClick={() => setResultTab('review')}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${resultTab === 'review' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white scale-100' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 scale-95'}`}
                >
                    Review Questions
                </button>
             </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
            <div className="max-w-2xl mx-auto h-full">
                {resultTab === 'overview' ? (
                    <div className="flex flex-col items-center justify-center space-y-8 animate-fade-in py-4">
                        {/* Score Circle */}
                        <div className="relative w-48 h-48 animate-scale-in">
                            {/* Inner text container */}
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                <div className="text-center">
                                    <span className="block text-5xl font-bold text-gray-900 dark:text-white drop-shadow-sm">{percentage}%</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Accuracy</span>
                                </div>
                            </div>
                            
                            {/* SVG Ring */}
                            <svg className="w-full h-full transform -rotate-90 drop-shadow-xl" viewBox="0 0 192 192">
                                {/* Background Track */}
                                <circle
                                    cx="96"
                                    cy="96"
                                    r="86"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    className="text-gray-200 dark:text-gray-700"
                                    strokeLinecap="round"
                                />
                                {/* Progress Arc */}
                                <circle
                                    cx="96"
                                    cy="96"
                                    r="86"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    strokeDasharray={2 * Math.PI * 86}
                                    strokeDashoffset={2 * Math.PI * 86 * (1 - percentage / 100)}
                                    className="text-blue-500 transition-all duration-1000 ease-out"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>
                        
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400 animate-fade-in delay-200">
                           <p>Your result has been saved to History.</p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-4 w-full animate-fade-in-up delay-100">
                            <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 text-center shadow-sm">
                                <div className="text-2xl font-bold text-green-500">{correctCount}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mt-1">Correct</div>
                            </div>
                            <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 text-center shadow-sm">
                                <div className="text-2xl font-bold text-red-500">{incorrectCount}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mt-1">Wrong</div>
                            </div>
                            <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 text-center shadow-sm">
                                <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">{skippedCount}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-500 font-medium uppercase mt-1">Skipped</div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col w-full gap-3 pt-4 animate-fade-in-up delay-200">
                             <button 
                              onClick={handleRetake}
                              className="w-full py-4 bg-white border border-gray-200 dark:bg-white/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/20 rounded-xl text-gray-900 dark:text-white font-bold shadow-sm transition-all hover:-translate-y-1 flex items-center justify-center space-x-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                              </svg>
                              <span>Retake Quiz</span>
                            </button>
                            
                            <button 
                              onClick={() => goBack(AppView.Generator)}
                              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 border border-blue-500 hover:border-blue-400 rounded-xl text-white font-bold shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-1 group flex items-center justify-center space-x-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                              <span>Generate New Quiz</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-slide-in-right pb-4">
                         {/* Question List Analysis */}
                         {questions.map((q, idx) => {
                             const userAns = selectedAnswers[q.id];
                             const isSkipped = !userAns;
                             const isCorrect = userAns === q.answer;
                             
                             return (
                                 <div key={q.id} className="bg-white dark:bg-white/5 p-5 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm transition-colors duration-200">
                                     <div className="flex justify-between items-start mb-3">
                                         <div className="flex items-center space-x-2">
                                             <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                                {idx + 1}
                                             </span>
                                             {isCorrect && <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide">Correct</span>}
                                             {!isCorrect && !isSkipped && <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide">Wrong</span>}
                                             {isSkipped && <span className="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide">Skipped</span>}
                                         </div>
                                     </div>
                                     
                                     <p className="text-sm md:text-base font-medium text-gray-900 dark:text-gray-100 mb-4 leading-relaxed">{q.question}</p>
                                     
                                     <div className="space-y-2 text-xs md:text-sm bg-gray-50 dark:bg-black/20 p-3 rounded-lg">
                                         {!isSkipped && (
                                             <div className={`flex items-start ${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                 <span className="w-20 md:w-24 opacity-70 font-medium shrink-0">Your Answer:</span>
                                                 <span className="font-bold break-words flex-1">
                                                     {userAns}) {q.options[userAns as keyof typeof q.options]}
                                                 </span>
                                                 {isCorrect && (
                                                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-2 shrink-0">
                                                       <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                                                     </svg>
                                                 )}
                                                  {!isCorrect && (
                                                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-2 shrink-0">
                                                       <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
                                                     </svg>
                                                 )}
                                             </div>
                                         )}
                                         {(!isCorrect || isSkipped) && (
                                             <div className="flex items-start text-green-700 dark:text-green-400">
                                                 <span className="w-20 md:w-24 opacity-70 font-medium shrink-0">Correct:</span>
                                                 <span className="font-bold break-words flex-1">
                                                     {q.answer}) {q.options[q.answer]}
                                                 </span>
                                             </div>
                                         )}
                                     </div>
                                 </div>
                             )
                         })}
                    </div>
                )}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto p-4 md:p-6 custom-scrollbar">
      <div className="flex justify-between items-center mb-4 md:mb-6 animate-fade-in">
        <span className="text-blue-800 dark:text-blue-200/60 text-[10px] md:text-xs font-bold tracking-widest uppercase bg-blue-100 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-500/10 transition-all duration-300">
          Question {currentIndex + 1} / {questions.length}
        </span>
        <span className={`px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-sm border transition-all duration-300
          ${currentQuestion.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20' : 
            currentQuestion.difficulty === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20' : 
            'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'}`}>
          {currentQuestion.difficulty}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Use key=currentIndex to trigger slide-in animation on question change */}
        <div key={currentIndex} className="glass-panel p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-xl dark:shadow-2xl relative mb-4 animate-slide-in-right">
          <button 
             onClick={handleTTS}
             className={`absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl transition-all border z-20 cursor-pointer ${audioPlaying ? 'text-blue-600 dark:text-blue-400 animate-pulse bg-blue-100 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border-transparent hover:border-black/5 dark:hover:border-white/10'}`}
             title={audioPlaying ? "Stop Reading" : "Read Aloud"}
          >
             {audioPlaying ? (
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                 </svg>
             ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                 </svg>
             )}
          </button>
          
          <h2 className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white leading-relaxed mb-6 md:mb-8 pr-16 md:pr-20 drop-shadow-sm">
            {currentQuestion.question}
          </h2>

          <div className="space-y-3 md:space-y-4">
            {Object.entries(currentQuestion.options).map(([key, text]) => {
              let btnClass = "glass-card hover:bg-gray-100 dark:hover:bg-white/10 border-gray-200 dark:border-white/5 text-gray-800 dark:text-gray-200";
              let icon = null;
              
              if (isSelected) {
                if (key === currentQuestion.answer) {
                  btnClass = "bg-green-100 dark:bg-green-500/20 border-green-300 dark:border-green-500/50 text-green-900 dark:text-white shadow-[0_0_15px_rgba(34,197,94,0.1)]";
                  icon = (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400 absolute right-3 md:right-4 animate-scale-in">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                      </svg>
                  );
                } else if (key === selectedOption) {
                  btnClass = "bg-red-100 dark:bg-red-500/20 border-red-300 dark:border-red-500/50 text-red-900 dark:text-white shadow-[0_0_15px_rgba(239,68,68,0.1)]";
                  icon = (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6 text-red-500 dark:text-red-400 absolute right-3 md:right-4 animate-scale-in">
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
                      </svg>
                  );
                } else {
                  btnClass = "bg-gray-50/50 dark:bg-black/20 opacity-60 border-transparent";
                }
              }

              return (
                <button
                  key={key}
                  onClick={() => handleSelect(key)}
                  disabled={isSelected}
                  className={`w-full text-left p-3 md:p-5 rounded-xl md:rounded-2xl border transition-all duration-200 flex items-center relative group ${btnClass}`}
                  aria-label={`Option ${key}: ${text}`}
                >
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center font-bold mr-3 md:mr-4 text-xs md:text-sm shadow-inner flex-shrink-0 transition-transform duration-200 group-hover:scale-105
                      ${isSelected && (key === currentQuestion.answer || key === selectedOption) ? 'bg-white/40 dark:bg-white/20 text-gray-900 dark:text-white' : 'bg-white/60 dark:bg-black/30 text-gray-500 dark:text-gray-400 group-hover:bg-white/80 dark:group-hover:bg-black/40'}
                  `}>
                      {key}
                  </div>
                  <span className="flex-1 font-medium text-sm md:text-base pr-6">{text}</span>
                  {icon}
                  
                  {/* Keyboard hint - hidden on mobile, visible on desktop */}
                  {!isSelected && (
                    <div className="absolute right-2 top-2 hidden md:block opacity-0 group-hover:opacity-30 transition-opacity">
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono border border-current rounded-md">{key}</kbd>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 md:mt-8 flex justify-between items-center pb-2 animate-fade-in delay-100 gap-4">
        <button
          onClick={handleSkip}
          disabled={isSelected}
          className={`px-6 py-3.5 rounded-xl font-bold text-base transition-all duration-300 ${
              isSelected 
              ? 'opacity-0 pointer-events-none' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
          }`}
        >
            <span className="flex items-center space-x-2">
                <span>Skip</span>
                <span className="hidden md:inline-flex opacity-40 border border-current rounded px-1 text-[9px] font-mono">→</span>
            </span>
        </button>

        <button
          onClick={handleNext}
          disabled={!isSelected}
          className={`flex-1 md:flex-none md:w-auto px-8 py-3.5 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-2 group ${
            isSelected
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50 transform hover:-translate-y-0.5'
              : 'bg-gray-300 dark:bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/5'
          }`}
        >
          <span>{currentIndex === questions.length - 1 ? "Finish Quiz" : "Next Question"}</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
          {isSelected && (
             <span className="hidden md:inline-flex items-center ml-2 opacity-60 border border-white/40 rounded px-1.5 py-0.5 text-[10px] font-mono group-hover:opacity-100 transition-opacity">
               ↵
             </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default QuizView;