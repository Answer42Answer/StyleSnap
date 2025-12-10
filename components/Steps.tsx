import React from 'react';
import { AppStep } from '../types';
import { Check } from 'lucide-react';

interface StepsProps {
  currentStep: AppStep;
}

const stepsOrder: AppStep[] = ['upload', 'generating', 'selection', 'describing', 'result'];

export const Steps: React.FC<StepsProps> = ({ currentStep }) => {
  const currentIdx = stepsOrder.indexOf(currentStep === 'validating' ? 'upload' : currentStep);

  return (
    <div className="w-full max-w-lg mx-auto mb-8 px-4">
      {/* Container */}
      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full p-1.5 relative flex justify-between items-center">
        
        {/* Progress Line Background */}
        <div className="absolute top-1/2 left-4 right-4 h-[2px] bg-white/10 -z-10 -translate-y-1/2"></div>
        
        {/* Active Progress Line */}
        <div 
          className="absolute top-1/2 left-4 h-[2px] bg-gold-400 -z-10 -translate-y-1/2 transition-all duration-700 ease-in-out shadow-[0_0_10px_rgba(251,191,36,0.5)]"
          style={{ width: `calc(${(currentIdx / (stepsOrder.length - 1)) * 100}% - 2rem)` }}
        ></div>

        {stepsOrder.map((step, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;

          if (step === 'validating') return null; 

          return (
            <div key={step} className="relative z-10 group">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ease-out border ${
                  isCompleted 
                    ? 'bg-gold-400 border-gold-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.4)]' 
                    : isCurrent 
                      ? 'bg-black border-gold-400 text-gold-400 ring-2 ring-gold-400/20 scale-110 shadow-[0_0_20px_rgba(251,191,36,0.2)]' 
                      : 'bg-neutral-900 border-white/10 text-neutral-600'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};