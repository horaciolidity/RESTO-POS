import { Joyride, EventData, STATUS, TooltipRenderProps } from 'react-joyride';
import { useTutorialStore } from '../../store/useTutorialStore';
import { MessageCircle, X, ChevronRight, ChevronLeft } from 'lucide-react';

const CustomTooltip = ({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  isLastStep,
}: TooltipRenderProps) => {
  return (
    <div 
      {...tooltipProps} 
      className="bg-card border border-border shadow-2xl shadow-primary/20 rounded-2xl p-5 max-w-sm flex flex-col gap-4 w-80 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-600"></div>
      
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        {step.title && <h3 className="font-extrabold text-lg text-foreground leading-tight">{step.title}</h3>}
        <button {...closeProps} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="text-sm text-muted-foreground leading-relaxed">
        {step.content}
      </div>

      {/* WhatsApp Fallback */}
      <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-border/50">
        <p className="text-[11px] font-medium text-muted-foreground">¿Se complicó? Hablá con soporte:</p>
        <a 
          href="https://wa.me/5492617048835" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 rounded-xl py-2 px-3 transition-colors w-full"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="font-bold text-xs">+54 9 261 704-8835</span>
        </a>
      </div>

      {/* Footer / Controls */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md">
          Paso {index + 1}
        </span>
        <div className="flex gap-2">
          {index > 0 && (
            <button {...backProps} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
              Atrás
            </button>
          )}
          {continuous && !isLastStep && (
            <button {...primaryProps} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
              Siguiente
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          {isLastStep && (
            <button {...primaryProps} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500 text-white hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20">
              Finalizar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function TutorialRunner() {
  const { isTutorialRunning, tutorialSteps, stopTutorial } = useTutorialStore();

  const handleEvent = (data: EventData) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      stopTutorial();
    }
  };

  return (
    <Joyride
      onEvent={handleEvent}
      continuous
      run={isTutorialRunning}
      scrollToFirstStep
      steps={tutorialSteps}
      tooltipComponent={CustomTooltip}
      options={{
        zIndex: 10000,
        overlayColor: 'rgba(0,0,0,0.65)',
        showProgress: true,
        skipBeacon: false,
      }}
    />
  );
}
