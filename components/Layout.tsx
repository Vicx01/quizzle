import React, { useState } from 'react';
import { AppView } from '../types';

interface LayoutProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  children: React.ReactNode;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Layout: React.FC<LayoutProps> = ({ currentView, setView, children, theme, toggleTheme }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { 
      id: AppView.Generator, 
      label: 'MCQ Generator', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      )
    },
    { 
      id: AppView.Quiz, 
      label: 'Take Quiz', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          {/* Bulb Outline including base */}
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25a7.5 7.5 0 0 0-7.5 7.5c0 2.501 1.146 4.75 3 6.206V19.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5v-3.544c1.854-1.456 3-3.705 3-6.206a7.5 7.5 0 0 0-7.5-7.5Z" />
          {/* Question Mark */}
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25a2.25 2.25 0 0 1 2.25 2.25c0 .9-.5 1.5-1.25 2.25-.5.5-.75 1-.75 1.75" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75h.008v.008H12v-.008Z" />
        </svg>
      )
    },
    { 
      id: AppView.History, 
      label: 'History', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      )
    },
    { 
      id: AppView.Chat, 
      label: 'AI Tutor', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
        </svg>
      )
    }
  ];

  const handleNavClick = (view: AppView) => {
      setView(view);
      setIsMobileOpen(false);
  };

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-500 ease-in-out
        bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] 
        from-blue-50 via-indigo-50 to-blue-50 
        dark:from-slate-900 dark:via-purple-950 dark:to-slate-900
        text-gray-900 dark:text-white
    `}>
      
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 animate-fade-in"
            onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 glass-panel border-r border-gray-200 dark:border-white/5 flex flex-col transition-transform duration-300 ease-out
        md:relative md:translate-x-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                  <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clipRule="evenodd" />
                </svg>
            </div>
            <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-white dark:to-blue-200 bg-clip-text text-transparent tracking-tight leading-none">
                    Quizzle AI
                </h1>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-none mt-1">Study smarter</p>
            </div>
          </div>
          
          {/* Close button - Mobile only */}
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                currentView === item.id
                  ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-500/25 border border-blue-500/50'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white hover:border hover:border-black/5 dark:hover:border-white/5 border border-transparent'
              }`}
            >
              <span className={`transition-transform duration-300 ${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/20 transition-colors duration-300">
            {/* Theme Toggle */}
           <button 
             onClick={toggleTheme}
             className="w-full flex items-center justify-between px-4 py-2 mb-4 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-sm active:scale-95"
           >
             <span className="flex items-center space-x-2">
                {theme === 'dark' ? (
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                   </svg>
                ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-orange-500">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                   </svg>
                )}
                <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
             </span>
           </button>

          <div className="space-y-2">
            <div className="text-[10px] text-gray-400 dark:text-gray-500 text-center uppercase tracking-widest font-semibold transition-colors duration-300">
              Powered by Gemini
            </div>
             <div className="text-[9px] text-gray-500 dark:text-gray-400 text-center italic font-mono opacity-70 hover:opacity-100 transition-opacity duration-300 select-none cursor-default">
              built by Vicx
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative h-full">
        
        {/* Mobile Header */}
        <header className="md:hidden h-16 glass-panel border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-4 z-30 shrink-0 transition-all duration-300">
            <button 
                onClick={() => setIsMobileOpen(true)}
                className="p-2 -ml-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
            </button>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-white dark:to-blue-200 bg-clip-text text-transparent">
                Quizzle AI
            </span>
            <div className="w-8"></div> {/* Spacer to center title */}
        </header>

        {/* Main View */}
        <main className="flex-1 overflow-hidden relative flex flex-col z-0">
            {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;