import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Step } from 'react-joyride';

type TutorialKey = 'dashboard' | 'pos' | 'inventory';

interface TutorialState {
  hasSeenTutorials: Record<TutorialKey, boolean>;
  isTutorialRunning: boolean;
  currentTutorialKey: TutorialKey | null;
  tutorialSteps: Step[];
  
  // Actions
  startTutorial: (key: TutorialKey, steps: Step[]) => void;
  stopTutorial: () => void;
  markTutorialSeen: (key: TutorialKey) => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      hasSeenTutorials: {
        dashboard: false,
        pos: false,
        inventory: false,
      },
      isTutorialRunning: false,
      currentTutorialKey: null,
      tutorialSteps: [],

      startTutorial: (key, steps) => set({
        isTutorialRunning: true,
        currentTutorialKey: key,
        tutorialSteps: steps
      }),

      stopTutorial: () => set((state) => {
        if (state.currentTutorialKey) {
          return {
            isTutorialRunning: false,
            currentTutorialKey: null,
            tutorialSteps: [],
            hasSeenTutorials: {
              ...state.hasSeenTutorials,
              [state.currentTutorialKey]: true
            }
          };
        }
        return { isTutorialRunning: false };
      }),

      markTutorialSeen: (key) => set((state) => ({
        hasSeenTutorials: {
          ...state.hasSeenTutorials,
          [key]: true
        }
      }))
    }),
    {
      name: 'tutorial-storage',
      partialize: (state) => ({ hasSeenTutorials: state.hasSeenTutorials }),
    }
  )
);
