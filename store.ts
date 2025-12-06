
import { create } from 'zustand';
import { AppState, GestureType } from './types';

export const useStore = create<AppState>((set) => ({
  gesture: 'NONE',
  setGesture: (gesture: GestureType) => set({ gesture }),
  
  mode: 'TREE',
  setMode: (mode) => set({ mode }),
  
  isPlaying: true,
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  introFinished: false,
  setIntroFinished: (introFinished) => set({ introFinished }),

  handPosition: { x: 0, y: 0 },
  setHandPosition: (handPosition) => set({ handPosition }),

  activeMediaIndex: 0,
  setActiveMediaIndex: (activeMediaIndex) => set({ activeMediaIndex }),

  viewMode: false,
  setViewMode: (viewMode) => set({ viewMode }),
}));

