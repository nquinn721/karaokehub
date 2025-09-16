import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { makeAutoObservable, runInAction } from 'mobx';
import { MusicSearchResult } from '../types';

export class AudioStore {
  public audioSound: Audio.Sound | null = null;
  public currentlyPlaying: string | null = null;
  public volume: number = 0.7; // Default volume 70%
  public isPlaying: boolean = false;
  public isLoading: boolean = false;
  public currentSong: MusicSearchResult | null = null;
  public position: number = 0;
  public duration: number = 0;

  private updateTimer: NodeJS.Timeout | null = null;

  constructor() {
    makeAutoObservable(this);
    this.initializeAudio();
    this.loadSavedVolume();
  }

  private async initializeAudio() {
    try {
      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }

  private async loadSavedVolume() {
    try {
      const savedVolume = await AsyncStorage.getItem('karaoke-hub-volume');
      if (savedVolume) {
        const volume = parseFloat(savedVolume);
        runInAction(() => {
          this.volume = Math.max(0, Math.min(1, volume));
        });
      }
    } catch (error) {
      console.warn('Failed to load saved volume:', error);
    }
  }

  private async saveVolume() {
    try {
      await AsyncStorage.setItem('karaoke-hub-volume', this.volume.toString());
    } catch (error) {
      console.warn('Failed to save volume:', error);
    }
  }

  private setupAudioCallbacks(sound: Audio.Sound) {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded) {
        runInAction(() => {
          this.isPlaying = status.isPlaying || false;
          this.position = status.positionMillis || 0;
          this.duration = status.durationMillis || 0;
          this.isLoading = status.isBuffering || false;
        });

        // Handle playback end
        if (status.didJustFinish && !status.isLooping) {
          this.handleAudioEnded();
        }
      } else if (status.error) {
        console.error('Audio playback error:', status.error);
        this.handleAudioError();
      }
    });
  }

  private handleAudioEnded = () => {
    console.log('🎵 Audio ended for song:', this.currentlyPlaying);
    runInAction(() => {
      this.currentlyPlaying = null;
      this.audioSound = null;
      this.isPlaying = false;
      this.currentSong = null;
      this.position = 0;
      this.duration = 0;
    });
  };

  private handleAudioError = () => {
    console.error('❌ Audio error for song:', this.currentlyPlaying);
    runInAction(() => {
      this.currentlyPlaying = null;
      this.audioSound = null;
      this.isPlaying = false;
      this.currentSong = null;
      this.position = 0;
      this.duration = 0;
      this.isLoading = false;
    });
  };

  async setVolume(volume: number) {
    const clampedVolume = Math.max(0, Math.min(1, volume));

    runInAction(() => {
      this.volume = clampedVolume;
    });

    if (this.audioSound) {
      try {
        await this.audioSound.setVolumeAsync(clampedVolume);
      } catch (error) {
        console.warn('Failed to set volume:', error);
      }
    }

    await this.saveVolume();
  }

  async playPreview(song: MusicSearchResult) {
    if (!song.previewUrl) {
      console.warn('No preview URL available for song:', song.title);
      return { success: false, error: 'No preview available' };
    }

    try {
      // If clicking the same song that's currently playing, toggle play/pause
      if (this.currentlyPlaying === song.id && this.audioSound) {
        return this.togglePlayPause();
      }

      // Stop current audio if playing a different song
      if (this.currentlyPlaying && this.currentlyPlaying !== song.id) {
        await this.stopAudio();
      }

      runInAction(() => {
        this.isLoading = true;
        this.currentSong = song;
        this.currentlyPlaying = song.id;
      });

      console.log('🚀 Creating new audio for song:', song.id);

      // Create new Audio.Sound instance
      const { sound } = await Audio.Sound.createAsync(
        { uri: song.previewUrl },
        {
          shouldPlay: true,
          volume: this.volume,
          rate: 1.0,
          shouldCorrectPitch: true,
        },
      );

      // Set up callbacks
      this.setupAudioCallbacks(sound);

      runInAction(() => {
        this.audioSound = sound;
        this.isLoading = false;
      });

      console.log('✅ Audio playback started successfully for song:', song.id);
      return { success: true };
    } catch (error) {
      console.error('❌ Error playing audio:', error);

      runInAction(() => {
        this.currentlyPlaying = null;
        this.audioSound = null;
        this.isPlaying = false;
        this.currentSong = null;
        this.isLoading = false;
        this.position = 0;
        this.duration = 0;
      });

      return {
        success: false,
        error: 'Failed to play preview',
      };
    }
  }

  async togglePlayPause() {
    if (!this.audioSound) {
      return { success: false, error: 'No audio loaded' };
    }

    try {
      if (this.isPlaying) {
        await this.audioSound.pauseAsync();
        console.log('⏸️ Audio paused for song:', this.currentlyPlaying);
      } else {
        await this.audioSound.playAsync();
        console.log('▶️ Audio resumed for song:', this.currentlyPlaying);
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to toggle play/pause:', error);
      return { success: false, error: 'Failed to toggle playback' };
    }
  }

  async stopAudio() {
    if (this.audioSound) {
      try {
        console.log('⏹️ Stopping audio for song:', this.currentlyPlaying);
        await this.audioSound.stopAsync();
        await this.audioSound.unloadAsync();
      } catch (error) {
        console.warn('Error stopping audio:', error);
      }
    }

    runInAction(() => {
      this.currentlyPlaying = null;
      this.audioSound = null;
      this.isPlaying = false;
      this.currentSong = null;
      this.position = 0;
      this.duration = 0;
      this.isLoading = false;
    });
  }

  async seekTo(positionMillis: number) {
    if (!this.audioSound) {
      return { success: false, error: 'No audio loaded' };
    }

    try {
      await this.audioSound.setPositionAsync(positionMillis);
      return { success: true };
    } catch (error) {
      console.error('Failed to seek:', error);
      return { success: false, error: 'Failed to seek' };
    }
  }

  // Utility getters
  get progressPercentage(): number {
    if (this.duration === 0) return 0;
    return (this.position / this.duration) * 100;
  }

  get remainingTime(): number {
    return Math.max(0, this.duration - this.position);
  }

  get formattedPosition(): string {
    return this.formatTime(this.position);
  }

  get formattedDuration(): string {
    return this.formatTime(this.duration);
  }

  get formattedRemainingTime(): string {
    return this.formatTime(this.remainingTime);
  }

  private formatTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Check if a specific song is currently playing
  isSongPlaying(songId: string): boolean {
    return this.currentlyPlaying === songId && this.isPlaying;
  }

  // Check if a specific song is loaded (playing or paused)
  isSongLoaded(songId: string): boolean {
    return this.currentlyPlaying === songId;
  }

  // Cleanup method for when the store is destroyed
  async cleanup() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    await this.stopAudio();
  }
}

export const audioStore = new AudioStore();
