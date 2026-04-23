import { useRef, useEffect, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface FlowSectionProps {
  number: number;
  title: string;
  summary?: string;
  isOpen: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function FlowSection({ number, title, summary, isOpen, isCompleted, isLocked, onToggle, children }: FlowSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isOpen]);

  return (
    <div className={`border rounded-xl transition-all duration-300 ${
      isOpen ? 'border-blue-500/40 bg-[#181a20]' :
      isCompleted ? 'border-green-500/20 bg-[#181a20]/50' :
      'border-[#2a2d35] bg-[#181a20]/30'
    }`}>
      {/* Header cliquable */}
      <button
        onClick={onToggle}
        disabled={isLocked}
        className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
          isLocked ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-[#252830]/30'
        }`}
      >
        {/* Numéro / Check */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
          isOpen ? 'bg-blue-600 text-white' :
          isCompleted ? 'bg-green-600 text-white' :
          'bg-[#252830] text-gray-500'
        }`}>
          {isCompleted && !isOpen ? <Check size={14} /> : number}
        </div>

        {/* Titre + résumé */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${isOpen ? 'text-white' : isCompleted ? 'text-gray-300' : 'text-gray-500'}`}>
            {title}
          </h3>
          {summary && !isOpen && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{summary}</p>
          )}
        </div>

        {/* Chevron */}
        {!isLocked && (
          <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Contenu dépliable */}
      {isOpen && (
        <div ref={contentRef} className="px-5 pb-5 pt-1">
          {children}
        </div>
      )}
    </div>
  );
}
