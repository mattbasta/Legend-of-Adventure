// Minimal typings for the buzz HTML5 audio library (no upstream types),
// covering only the surface this codebase uses.
declare module "buzz" {
  interface SoundOptions {
    formats?: string[];
    preload?: boolean;
    autoload?: boolean;
    autoplay?: boolean;
    loop?: boolean;
  }

  class sound {
    constructor(src: string, options?: SoundOptions);
    getStateCode(): number;
    play(): sound;
    pause(): sound;
    stop(): sound;
    setVolume(volume: number): sound;
    getVolume(): number;
    fadeTo(volume: number, duration?: number): sound;
    fadeOut(duration: number, callback?: () => void): sound;
  }

  const buzz: { sound: typeof sound };
  export default buzz;
}
