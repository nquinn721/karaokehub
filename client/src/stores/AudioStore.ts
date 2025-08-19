import { makeAutoObservable, runInAction } from 'mobx';

export class AudioStore {
  public audioElement: HTMLAudioElement | null = null;
  public currentlyPlaying: string | null = null;
  public volume: number = 0.7; // Default volume 70%
  public isPlaying: boolean = false;
  public currentSong: any = null;

  constructor() {
    makeAutoObservable(this);

    // Load saved volume from localStorage
    const savedVolume = localStorage.getItem('karaoke-hub-volume');
    if (savedVolume) {
      this.volume = parseFloat(savedVolume);
    }
  }

  setVolume(volume: number) {
    runInAction(() => {
      this.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
      if (this.audioElement) {
        this.audioElement.volume = this.volume;
      }
      // Save to localStorage
      localStorage.setItem('karaoke-hub-volume', this.volume.toString());
    });
  }

  async playPreview(song: any) {
    if (!song.previewUrl) return;

    // If clicking the same song that's currently playing, toggle play/pause
    if (this.currentlyPlaying === song.id && this.audioElement) {
      this.togglePlayPause();
      return;
    }

    // Stop current audio if playing a different song
    this.stopAudio();

    try {
      const audio = new Audio(song.previewUrl);
      audio.volume = this.volume;

      audio.addEventListener('ended', () => {
        runInAction(() => {
          this.currentlyPlaying = null;
          this.audioElement = null;
          this.isPlaying = false;
          this.currentSong = null;
        });
      });

      audio.addEventListener('pause', () => {
        runInAction(() => {
          this.isPlaying = false;
        });
      });

      audio.addEventListener('play', () => {
        runInAction(() => {
          this.isPlaying = true;
        });
      });

      await audio.play();

      runInAction(() => {
        this.currentlyPlaying = song.id;
        this.audioElement = audio;
        this.isPlaying = true;
        this.currentSong = song;
      });
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }

  stopAudio() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }

    runInAction(() => {
      this.currentlyPlaying = null;
      this.audioElement = null;
      this.isPlaying = false;
      this.currentSong = null;
    });
  }

  pauseAudio() {
    if (this.audioElement && this.isPlaying) {
      this.audioElement.pause();
    }
  }

  resumeAudio() {
    if (this.audioElement && !this.isPlaying) {
      this.audioElement.play();
    }
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.pauseAudio();
    } else {
      this.resumeAudio();
    }
  }
}

export const audioStore = new AudioStore();
