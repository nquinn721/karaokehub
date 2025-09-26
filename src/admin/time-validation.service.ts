/**
 * Time Validation Service
 * Handles detection and correction of karaoke show time issues
 * Focuses on AM/PM errors and impossible time ranges
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Show } from '../show/show.entity';

interface TimeValidationResult {
  showId: string;
  venueName: string;
  day: string;
  originalStartTime: string;
  originalEndTime: string;
  correctedStartTime?: string;
  correctedEndTime?: string;
  issues: string[];
  confidence: number;
  wasFixed: boolean;
}

export interface BatchTimeValidationResult {
  success: boolean;
  totalShows: number;
  issuesFound: number;
  fixesApplied: number;
  results: TimeValidationResult[];
  summary: {
    amPmErrors: number;
    impossibleRanges: number;
    crossMidnightIssues: number;
    otherIssues: number;
  };
}

@Injectable()
export class TimeValidationService {
  constructor(
    @InjectRepository(Show)
    private readonly showRepository: Repository<Show>,
  ) {}

  /**
   * Validate and fix all show times in the database
   */
  async validateAllShowTimes(): Promise<BatchTimeValidationResult> {
    try {
      const shows = await this.showRepository.find({
        where: { isActive: true },
        relations: ['venue'],
      });

      const results: TimeValidationResult[] = [];
      let issuesFound = 0;
      let fixesApplied = 0;
      const summary = {
        amPmErrors: 0,
        impossibleRanges: 0,
        crossMidnightIssues: 0,
        otherIssues: 0,
      };

      for (const show of shows) {
        const result = this.validateShowTime(show);

        if (result.issues.length > 0) {
          issuesFound++;
          results.push(result);

          // Categorize issues
          for (const issue of result.issues) {
            if (issue.includes('AM/PM')) {
              summary.amPmErrors++;
            } else if (issue.includes('impossible') || issue.includes('range')) {
              summary.impossibleRanges++;
            } else if (issue.includes('midnight') || issue.includes('cross')) {
              summary.crossMidnightIssues++;
            } else {
              summary.otherIssues++;
            }
          }

          // Apply fix if confidence is high
          if (result.wasFixed && result.confidence >= 0.8) {
            await this.applyTimeFix(show, result);
            fixesApplied++;
          }
        }
      }

      return {
        success: true,
        totalShows: shows.length,
        issuesFound,
        fixesApplied,
        results,
        summary,
      };
    } catch (error) {
      throw new Error(`Time validation failed: ${error.message}`);
    }
  }

  /**
   * Validate a single show's time and suggest corrections
   */
  validateShowTime(show: Show): TimeValidationResult {
    const result: TimeValidationResult = {
      showId: show.id,
      venueName: show.venue?.name || 'Unknown Venue',
      day: show.day || 'Unknown',
      originalStartTime: show.startTime || '',
      originalEndTime: show.endTime || '',
      issues: [],
      confidence: 0,
      wasFixed: false,
    };

    if (!show.startTime && !show.endTime) {
      return result; // No times to validate
    }

    // Parse times
    const startTime = this.parseTime(show.startTime);
    const endTime = this.parseTime(show.endTime);

    if (!startTime && !endTime) {
      return result; // Unable to parse times
    }

    // Check for obvious AM/PM errors
    const amPmIssues = this.detectAmPmErrors(startTime, endTime);
    if (amPmIssues.length > 0) {
      result.issues.push(...amPmIssues);

      // Try to fix AM/PM errors
      const fixedTimes = this.fixAmPmErrors(startTime, endTime);
      if (fixedTimes) {
        result.correctedStartTime = this.formatTime(fixedTimes.startTime);
        result.correctedEndTime = this.formatTime(fixedTimes.endTime);
        result.confidence = 0.9; // High confidence for obvious AM/PM fixes
        result.wasFixed = true;
      }
    }

    // Check for impossible time ranges
    const rangeIssues = this.detectImpossibleRanges(startTime, endTime);
    if (rangeIssues.length > 0) {
      result.issues.push(...rangeIssues);

      if (!result.wasFixed) {
        // Try to fix range issues if AM/PM wasn't already fixed
        const fixedRange = this.fixTimeRange(startTime, endTime);
        if (fixedRange) {
          result.correctedStartTime = this.formatTime(fixedRange.startTime);
          result.correctedEndTime = this.formatTime(fixedRange.endTime);
          result.confidence = 0.7; // Medium confidence for range fixes
          result.wasFixed = true;
        }
      }
    }

    // Check for cross-midnight issues
    const midnightIssues = this.detectCrossMidnightIssues(startTime, endTime);
    if (midnightIssues.length > 0) {
      result.issues.push(...midnightIssues);
    }

    return result;
  }

  /**
   * Parse time string into hour/minute components
   */
  private parseTime(timeStr?: string): { hour: number; minute: number } | null {
    if (!timeStr) return null;

    // Handle various time formats: HH:MM, H:MM, HH:MM:SS
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!timeMatch) return null;

    const hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2]);

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }

    return { hour, minute };
  }

  /**
   * Detect obvious AM/PM errors in karaoke times
   */
  private detectAmPmErrors(
    startTime: { hour: number; minute: number } | null,
    endTime: { hour: number; minute: number } | null,
  ): string[] {
    const issues: string[] = [];

    if (!startTime || !endTime) return issues;

    // Karaoke rarely happens before 6 PM (18:00)
    if (startTime.hour < 18 && startTime.hour > 5) {
      issues.push(
        `Start time ${this.formatTime(startTime)} appears to be AM instead of PM - karaoke rarely starts before 6 PM`,
      );
    }

    // If start time is in morning hours (6 AM - 12 PM) and end time suggests evening
    if (startTime.hour >= 6 && startTime.hour < 12 && endTime.hour < 6) {
      issues.push(
        `Time range ${this.formatTime(startTime)} - ${this.formatTime(endTime)} suggests AM/PM error - likely should be PM start time`,
      );
    }

    // If end time is very early (2-6 AM) but start time is also early, it's probably wrong
    if (startTime.hour >= 6 && startTime.hour < 12 && endTime.hour >= 2 && endTime.hour < 6) {
      issues.push(
        `Time range appears to have AM/PM confusion - karaoke doesn't typically run ${this.formatTime(startTime)} - ${this.formatTime(endTime)}`,
      );
    }

    return issues;
  }

  /**
   * Fix obvious AM/PM errors
   */
  private fixAmPmErrors(
    startTime: { hour: number; minute: number } | null,
    endTime: { hour: number; minute: number } | null,
  ): {
    startTime: { hour: number; minute: number };
    endTime: { hour: number; minute: number };
  } | null {
    if (!startTime || !endTime) return null;

    // Convert morning start times to evening (add 12 hours)
    if (startTime.hour >= 6 && startTime.hour < 12) {
      const fixedStartTime = {
        hour: startTime.hour + 12,
        minute: startTime.minute,
      };

      // If end time is early morning (after midnight), keep it
      // If end time is also morning, convert it too
      let fixedEndTime = endTime;
      if (endTime.hour >= 6 && endTime.hour < 18) {
        fixedEndTime = {
          hour: endTime.hour === 12 ? 0 : endTime.hour + 12,
          minute: endTime.minute,
        };
      }

      return {
        startTime: fixedStartTime,
        endTime: fixedEndTime,
      };
    }

    return null;
  }

  /**
   * Detect impossible time ranges for karaoke
   */
  private detectImpossibleRanges(
    startTime: { hour: number; minute: number } | null,
    endTime: { hour: number; minute: number } | null,
  ): string[] {
    const issues: string[] = [];

    if (!startTime || !endTime) return issues;

    // Check if start time is after end time (without crossing midnight)
    const startMinutes = startTime.hour * 60 + startTime.minute;
    const endMinutes = endTime.hour * 60 + endTime.minute;

    if (startMinutes > endMinutes && !(endTime.hour >= 0 && endTime.hour <= 6)) {
      issues.push(
        `Start time ${this.formatTime(startTime)} is after end time ${this.formatTime(endTime)} - this seems impossible`,
      );
    }

    // Check for very short durations (less than 1 hour) during prime karaoke time
    if (startTime.hour >= 18 && endTime.hour >= 18) {
      const duration = endMinutes - startMinutes;
      if (duration > 0 && duration < 60) {
        issues.push(
          `Very short karaoke duration (${Math.round(duration)} minutes) - might be incorrect`,
        );
      }
    }

    // Check for extremely long durations (more than 8 hours)
    let duration = endMinutes - startMinutes;
    if (duration < 0) {
      // Account for crossing midnight
      duration = 24 * 60 + duration;
    }
    if (duration > 8 * 60) {
      issues.push(
        `Extremely long karaoke duration (${Math.round(duration / 60)} hours) - might be incorrect`,
      );
    }

    return issues;
  }

  /**
   * Fix impossible time ranges
   */
  private fixTimeRange(
    startTime: { hour: number; minute: number } | null,
    endTime: { hour: number; minute: number } | null,
  ): {
    startTime: { hour: number; minute: number };
    endTime: { hour: number; minute: number };
  } | null {
    if (!startTime || !endTime) return null;

    const startMinutes = startTime.hour * 60 + startTime.minute;
    const endMinutes = endTime.hour * 60 + endTime.minute;

    // If start is after end and neither is early morning, fix by adjusting end to next day
    if (startMinutes > endMinutes && endTime.hour > 6) {
      // Assume end time should be next day (add 24 hours conceptually)
      // For database storage, we keep the time but note it crosses midnight
      return {
        startTime,
        endTime,
      };
    }

    return null;
  }

  /**
   * Detect cross-midnight timing issues
   */
  private detectCrossMidnightIssues(
    startTime: { hour: number; minute: number } | null,
    endTime: { hour: number; minute: number } | null,
  ): string[] {
    const issues: string[] = [];

    if (!startTime || !endTime) return issues;

    // If end time is early morning (12 AM - 6 AM) and start is evening, it's crossing midnight
    if (startTime.hour >= 18 && endTime.hour >= 0 && endTime.hour <= 6) {
      // This is actually normal for karaoke, but note it
      issues.push(
        `Show crosses midnight: ${this.formatTime(startTime)} - ${this.formatTime(endTime)} (next day)`,
      );
    }

    return issues;
  }

  /**
   * Format time object back to string
   */
  private formatTime(time: { hour: number; minute: number }): string {
    return `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;
  }

  /**
   * Apply time fix to database
   */
  private async applyTimeFix(show: Show, result: TimeValidationResult): Promise<void> {
    try {
      if (result.correctedStartTime) {
        show.startTime = result.correctedStartTime;
      }
      if (result.correctedEndTime) {
        show.endTime = result.correctedEndTime;
      }

      await this.showRepository.save(show);
      console.log(
        `✅ Fixed times for show ${show.id}: ${result.originalStartTime} - ${result.originalEndTime} → ${result.correctedStartTime} - ${result.correctedEndTime}`,
      );
    } catch (error) {
      console.error(`❌ Failed to apply time fix for show ${show.id}:`, error);
    }
  }
}
