import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { makeAutoObservable, runInAction } from 'mobx';
import { MusicSearchResult } from '../types';

export class AudioStore {
  public sound: Audio.Sound | null = null;
  public currentlyPlaying: string | null = null;
  public volume: number = 0.7; // Default volume 70%
  public isPlaying: boolean = false;
  public isLoading: boolean = false;
  public currentSong: MusicSearchResult | null = null;
  public position: number = 0;
  public duration: number = 0;
  public isBuffering: boolean = false;

  constructor() {
    makeAutoObservable(this);
    this.loadSavedVolume();
    this.setupAudioMode();
  }

  // Setup audio mode for React Native
  private async setupAudioMode() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error('Error setting up audio mode:', error);
    }
  }

  // Load saved volume from AsyncStorage
  private async loadSavedVolume() {
    try {
      const savedVolume = await AsyncStorage.getItem('karaoke-hub-volume');
      if (savedVolume) {
        runInAction(() => {
          this.volume = parseFloat(savedVolume);
        });
      }
    } catch (error) {
      console.error('Error loading saved volume:', error);
    }
  }

  // Set volume and save to storage
  async setVolume(volume: number) {
    const clampedVolume = Math.max(0, Math.min(1, volume));

    runInAction(() => {
      this.volume = clampedVolume;
    });

    if (this.sound) {
      try {
        await this.sound.setVolumeAsync(clampedVolume);
      } catch (error) {
        console.error('Error setting volume:', error);
      }
    }

    // Save volume to storage
    try {
      await AsyncStorage.setItem('karaoke-hub-volume', clampedVolume.toString());
    } catch (error) {
      console.error('Error saving volume:', error);
    }
  }

  // Play audio from URL
  async playAudio(song: MusicSearchResult, previewUrl: string) {
    try {
      // Stop current audio if playing
      await this.stopAudio();

      runInAction(() => {
        this.isLoading = true;
        this.currentSong = song;
        this.currentlyPlaying = song.id;
      });

      console.log('🎵 Loading audio for song:', song.title, 'URL:', previewUrl);

      // Create new sound object
      const { sound } = await Audio.Sound.createAsync(
        { uri: previewUrl },
        {
          shouldPlay: true,
          volume: this.volume,
          isLooping: false,
          progressUpdateIntervalMillis: 1000,
        },
        this.onPlaybackStatusUpdate,
      );

      runInAction(() => {
        this.sound = sound;
        this.isPlaying = true;
        this.isLoading = false;
      });

      console.log('🎵 Audio loaded and playing for song:', song.title);
    } catch (error) {
      console.error('🎵 Error playing audio:', error);
      runInAction(() => {
        this.isLoading = false;
        this.currentlyPlaying = null;
        this.currentSong = null;
        this.isPlaying = false;
      });
    }
  }

  // Pause audio
  async pauseAudio() {
    if (this.sound && this.isPlaying) {
      try {
        await this.sound.pauseAsync();
        runInAction(() => {
          this.isPlaying = false;
        });
        console.log('⏸️ Audio paused for song:', this.currentSong?.title);
      } catch (error) {
        console.error('Error pausing audio:', error);
      }
    }
  }

  // Resume audio
  async resumeAudio() {
    if (this.sound && !this.isPlaying) {
      try {
        await this.sound.playAsync();
        runInAction(() => {
          this.isPlaying = true;
        });
        console.log('▶️ Audio resumed for song:', this.currentSong?.title);
      } catch (error) {
        console.error('Error resuming audio:', error);
      }
    }
  }

  // Stop audio
  async stopAudio() {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        console.log('🛑 Audio stopped for song:', this.currentSong?.title);
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
    }

    runInAction(() => {
      this.sound = null;
      this.currentlyPlaying = null;
      this.isPlaying = false;
      this.currentSong = null;
      this.position = 0;
      this.duration = 0;
      this.isBuffering = false;
    });
  }

  // Toggle play/pause
  async togglePlayPause() {
    if (this.isPlaying) {
      await this.pauseAudio();
    } else if (this.sound) {
      await this.resumeAudio();
    }
  }

  // Seek to position
  async seekTo(positionMillis: number) {
    if (this.sound) {
      try {
        await this.sound.setPositionAsync(positionMillis);
      } catch (error) {
        console.error('Error seeking audio:', error);
      }
    }
  }

  // Playback status update callback
  private onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      runInAction(() => {
        this.position = status.positionMillis || 0;
        this.duration = status.durationMillis || 0;
        this.isBuffering = status.isBuffering || false;

        if (status.didJustFinish) {
          this.isPlaying = false;
          this.position = 0;
          console.log('🎵 Audio finished for song:', this.currentSong?.title);
        }
      });
    } else if (status.error) {
      console.error('Audio playback error:', status.error);
      runInAction(() => {
        this.isLoading = false;
        this.isPlaying = false;
      });
    }
  };

  // Check if a specific song is currently playing
  isSongPlaying(songId: string): boolean {
    return this.currentlyPlaying === songId && this.isPlaying;
  }

  // Check if a specific song is the current song (playing or paused)
  isCurrentSong(songId: string): boolean {
    return this.currentlyPlaying === songId;
  }

  // Get current playback position as percentage
  get positionPercentage(): number {
    if (this.duration === 0) return 0;
    return (this.position / this.duration) * 100;
  }

  // Get formatted time strings
  get formattedPosition(): string {
    return this.formatTime(this.position);
  }

  get formattedDuration(): string {
    return this.formatTime(this.duration);
  }

  // Format milliseconds to MM:SS
  private formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Cleanup audio when app goes to background
  async cleanup() {
    await this.stopAudio();
  }

  // Get current audio state for debugging
  getAudioState() {
    return {
      currentlyPlaying: this.currentlyPlaying,
      isPlaying: this.isPlaying,
      isLoading: this.isLoading,
      volume: this.volume,
      position: this.position,
      duration: this.duration,
      currentSong: this.currentSong?.title,
    };
  }
}

export const audioStore = new AudioStore();
