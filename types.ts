
export type GestureType = 'NONE' | 'OPEN_PALM' | 'CLOSED_FIST' | 'VICTORY' | 'THREE_FINGERS';

export interface AppState {
  gesture: GestureType;
  setGesture: (g: GestureType) => void;
  mode: 'TREE' | 'GALAXY';
  setMode: (m: 'TREE' | 'GALAXY') => void;
  isPlaying: boolean;
  togglePlay: () => void;
  introFinished: boolean;
  setIntroFinished: (v: boolean) => void;
  handPosition: { x: number; y: number };
  setHandPosition: (pos: { x: number; y: number }) => void;
  activeMediaIndex: number;
  setActiveMediaIndex: (index: number) => void;
  viewMode: boolean;
  setViewMode: (v: boolean) => void;
}

export const MUSIC_PLAYLIST = [
  'https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3?filename=christmas-magic-126458.mp3',
  'https://cdn.pixabay.com/download/audio/2023/11/26/audio_4eb671c08d.mp3?filename=winter-magic-176865.mp3'
];

