import React, { useState, useEffect } from 'react';
import { MCQ, QuizHistoryItem } from '../types';

interface HistoryViewProps {
  onRetake: (questions: MCQ[], topic: string) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onRetake }) => {
  const [history, setHistory] = useState<QuizHistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('quizzle_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('quizzle_history', JSON.stringify(updated));
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (history.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 animate-fade-in text-center">
        <div className="w-24 h-24 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 animate-scale-in">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-400">
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
             </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Quiz History Yet</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
          Complete a quiz to see your results and progress here. You can retake them anytime.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white animate-fade-in-up">Quiz History</h2>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full border border-gray-200 dark:border-white/10">
                {history.length} Saved
            </div>
        </div>
        
        <div className="grid gap-4 animate-fade-in-up delay-100">
          {history.map((item, index) => {
             const percentage = Math.round((item.score / item.total) * 100);
             const isPass = percentage >= 60;
             
             return (
              <div 
                key={item.id}
                className="group relative glass-panel rounded-2xl p-5 hover:bg-white hover:border-blue-300 dark:hover:bg-white/10 dark:hover:border-blue-500/30 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer"
                onClick={() => onRetake(item.questions, item.topic)}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg line-clamp-1">{item.topic || 'Untitled Quiz'}</h3>
                    <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                       <span className="flex items-center">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 mr-1 opacity-70">
                           <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
                         </svg>
                         {formatDate(item.timestamp)}
                       </span>
                       <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                       <span>{item.questions.length} Questions</span>
                    </div>
                  </div>
                  
                  <div className={`flex flex-col items-end`}>
                     <span className={`text-xl font-bold ${isPass ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                        {percentage}%
                     </span>
                     <span className="text-[10px] uppercase font-bold text-gray-400">Score</span>
                  </div>
                </div>

                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                     {/* Action buttons could go here if we wanted them overlaid */}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                    <button 
                        className="text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center group-hover:underline"
                        onClick={() => onRetake(item.questions, item.topic)}
                    >
                        <span>Retake Quiz</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-1">
                          <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                        </svg>
                    </button>
                    
                    <button 
                        className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        onClick={(e) => handleDelete(item.id, e)}
                        title="Delete Result"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                    </button>
                </div>
              </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};

export default HistoryView;