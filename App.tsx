import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import MCQGenerator from './components/MCQGenerator';
import QuizView from './components/QuizView';
import ChatBot from './components/ChatBot';
import HistoryView from './components/HistoryView';
import Onboarding from './components/Onboarding';
import { MCQ, AppView } from './types';

// Splash Screen Component
const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-indigo-50 to-blue-50 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 transition-colors duration-500">
      <div className="relative flex flex-col items-center">
        {/* Logo Container with Glow */}
        <div className="relative mb-8">
           <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 dark:opacity-40 rounded-full animate-pulse"></div>
           <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 relative z-10 animate-splash-logo">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 md:w-16 md:h-16 text-white animate-fade-in delay-200">
                <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clipRule="evenodd" />
              </svg>
           </div>
        </div>
        
        {/* Text */}
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-white dark:to-blue-200 bg-clip-text text-transparent tracking-tight mb-3 animate-fade-in-up delay-100">
          Quizzle AI
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium text-lg animate-fade-in-up delay-200">
          Study smarter, not harder
        </p>

        {/* Loading Indicator */}
        <div className="mt-10 flex space-x-2 animate-fade-in delay-500">
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.Generator);
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [topic, setTopic] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Theme state: default to 'dark' or load from localStorage
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
      }
      // Check system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'dark'; // Default
  });

  // Handle Splash Screen and Onboarding Check
  useEffect(() => {
    // Force minimum splash screen time of 3 seconds
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Check for onboarding status after splash screen
      const onboardingDone = localStorage.getItem('quizzle_onboarding_done');
      if (!onboardingDone) {
        setShowOnboarding(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleQuestionsGenerated = (newQuestions: MCQ[], newTopic: string) => {
    setQuestions(newQuestions);
    setTopic(newTopic);
  };
  
  const handleRetake = (retakeQuestions: MCQ[], retakeTopic: string) => {
      setQuestions(retakeQuestions);
      setTopic(retakeTopic);
      setCurrentView(AppView.Quiz);
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('quizzle_onboarding_done', 'true');
    setShowOnboarding(false);
  };

  const renderContent = () => {
    switch (currentView) {
      case AppView.Generator:
        return (
          <MCQGenerator
            onQuestionsGenerated={handleQuestionsGenerated}
            switchView={setCurrentView}
          />
        );
      case AppView.Quiz:
        return (
          <QuizView
            questions={questions}
            topic={topic}
            goBack={setCurrentView}
          />
        );
      case AppView.Chat:
        return <ChatBot />;
      case AppView.History:
        return <HistoryView onRetake={handleRetake} />;
      default:
        return (
           <MCQGenerator
            onQuestionsGenerated={handleQuestionsGenerated}
            switchView={setCurrentView}
          />
        );
    }
  };

  // Render Splash Screen if loading
  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <>
      {/* Onboarding Overlay - Rendered outside Layout to sit on top of everything */}
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      
      <Layout currentView={currentView} setView={setCurrentView} theme={theme} toggleTheme={toggleTheme}>
        {/* 
           Using animate-fade-in (pure opacity) for view transitions prevents 
           the jumpy effect when switching tabs, keeping the UI stable.
        */}
        <div key={currentView} className="h-full animate-fade-in">
          {renderContent()}
        </div>
      </Layout>
    </>
  );
};

export default App;