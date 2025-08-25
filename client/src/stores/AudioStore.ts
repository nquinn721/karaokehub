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

  // Event handler methods
  private handleAudioEnded = () => {
    console.log('🎵 Audio ended for song:', this.currentlyPlaying);
    runInAction(() => {
      this.currentlyPlaying = null;
      this.audioElement = null;
      this.isPlaying = false;
      this.currentSong = null;
    });
  };

  private handleAudioPause = () => {
    console.log('⏸️ Audio paused for song:', this.currentlyPlaying);
    runInAction(() => {
      this.isPlaying = false;
    });
  };

  private handleAudioPlay = () => {
    console.log('▶️ Audio play event for song:', this.currentlyPlaying);
    runInAction(() => {
      this.isPlaying = true;
    });
  };

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
    if (!song.previewUrl) {
      return;
    }

    // If clicking the same song that's currently playing, toggle play/pause
    if (this.currentlyPlaying === song.id && this.audioElement) {
      this.togglePlayPause();
      return;
    }

    // Stop current audio if playing a different song
    if (this.currentlyPlaying && this.currentlyPlaying !== song.id) {
      this.stopAudio();
    }

    try {
      console.log('🚀 Creating new audio element for song:', song.id);
      const audio = new Audio(song.previewUrl);
      audio.volume = this.volume;

      // Add event listeners
      audio.addEventListener('ended', this.handleAudioEnded);
      audio.addEventListener('pause', this.handleAudioPause);
      audio.addEventListener('play', this.handleAudioPlay);

      // Set state before playing
      runInAction(() => {
        this.currentlyPlaying = song.id;
        this.audioElement = audio;
        this.isPlaying = false; // Will be set to true by the 'play' event
        this.currentSong = song;
      });

      console.log('▶️ Starting audio playback for song:', song.id);
      await audio.play();
      console.log('✅ Audio playback started successfully for song:', song.id);
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      // Clean up on error
      runInAction(() => {
        this.currentlyPlaying = null;
        this.audioElement = null;
        this.isPlaying = false;
        this.currentSong = null;
      });
    }
  }

  stopAudio = () => {
    console.log('🛑 Stopping audio for song:', this.currentlyPlaying);
    runInAction(() => {
      if (this.audioElement) {
        // Remove all event listeners to prevent race conditions
        this.audioElement.removeEventListener('ended', this.handleAudioEnded);
        this.audioElement.removeEventListener('pause', this.handleAudioPause);
        this.audioElement.removeEventListener('play', this.handleAudioPlay);

        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.audioElement.src = '';
        this.audioElement = null;
      }

      this.currentlyPlaying = null;
      this.isPlaying = false;
      this.currentSong = null;
    });
  };

  pauseAudio = () => {
    console.log('⏸️ pauseAudio called for song:', this.currentlyPlaying);
    runInAction(() => {
      if (this.audioElement && this.isPlaying) {
        this.audioElement.pause();
        // Note: isPlaying will be set to false by the 'pause' event handler
      }
    });
  };

  resumeAudio = () => {
    console.log('▶️ resumeAudio called for song:', this.currentlyPlaying);
    runInAction(() => {
      if (this.audioElement && !this.isPlaying && this.currentlyPlaying !== null) {
        this.audioElement.play().catch((error) => {
          console.error('Error resuming audio:', error);
          // Clean up on error
          this.stopAudio();
        });
        // Note: isPlaying will be set to true by the 'play' event handler
      }
    });
  };

  togglePlayPause = () => {
    console.log('🔄 togglePlayPause called, current state:', {
      isPlaying: this.isPlaying,
      currentlyPlaying: this.currentlyPlaying,
    });
    if (this.isPlaying) {
      this.pauseAudio();
    } else {
      this.resumeAudio();
    }
  };
}

export const audioStore = new AudioStore();
