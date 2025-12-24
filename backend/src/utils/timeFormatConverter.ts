export class TimeFormatConverter {
  /**
   * Convert 12-hour format to 24-hour format
   * @param time12h - Time in 12-hour format "9:00 AM"
   * @returns Time in 24-hour format "09:00"
   */
  static convert12to24(time12h: string): string {
    const timeRegex = /^(\d{1,2}):([0-5][0-9])\s*(AM|PM)$/i;
    const match = time12h.match(timeRegex);

    if (!match) {
      throw new Error(
        `Invalid time format: ${time12h}. Expected format: "9:00 AM"`
      );
    }

    let hour = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    if (hour === 12) {
      hour = period === "AM" ? 0 : 12;
    } else if (period === "PM") {
      hour += 12;
    }

    return `${hour.toString().padStart(2, "0")}:${minutes}`;
  }

  /**
   * Convert 24-hour format to 12-hour format
   * @param time24h - Time in 24-hour format "09:00" or "14:30"
   * @returns Time in 12-hour format "9:00 AM" or "2:30 PM"
   */
  static convert24to12(time24h: string): string {
    const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    const match = time24h.match(timeRegex);

    if (!match) {
      throw new Error(
        `Invalid time format: ${time24h}. Expected format: "09:00"`
      );
    }

    let hour = parseInt(match[1]);
    const minutes = match[2];
    const period = hour >= 12 ? "PM" : "AM";

    hour = hour % 12;
    hour = hour === 0 ? 12 : hour;

    return `${hour}:${minutes} ${period}`;
  }

  /**
   * Validate 12-hour time format
   * @param time12h - Time to validate
   * @returns Validation result
   */
  static validate12HourTime(time12h: string): {
    valid: boolean;
    error?: string;
  } {
    const timeRegex = /^(\d{1,2}):([0-5][0-9])\s*(AM|PM)$/i;

    if (!timeRegex.test(time12h)) {
      return {
        valid: false,
        error: 'Invalid format. Use "9:00 AM" or "2:30 PM"',
      };
    }

    const match = time12h.match(timeRegex)!;
    const hour = parseInt(match[1]);

    if (hour < 1 || hour > 12) {
      return { valid: false, error: "Hour must be between 1 and 12" };
    }

    const minutes = parseInt(match[2]);
    if (minutes < 0 || minutes > 59) {
      return {
        valid: false,
        error: "Minutes must be between 00 and 59",
      };
    }

    return { valid: true };
  }

  /**
   * Convert array of 12-hour times to 24-hour format and sort them
   * @param times12h - Array of times in 12-hour format
   * @returns Sorted array in 24-hour format
   */
  static convertAndSortTimes(times12h: string[]): string[] {
    // Convert to 24-hour format
    const times24h = times12h.map((time) => this.convert12to24(time));

    // Sort in 24-hour format
    times24h.sort((a, b) => {
      const [aHour, aMin] = a.split(":").map(Number);
      const [bHour, bMin] = b.split(":").map(Number);

      if (aHour !== bHour) return aHour - bHour;
      return aMin - bMin;
    });

    return times24h;
  }

  /**
   * Convert sorted 24-hour times back to 12-hour format for display
   * @param times24h - Sorted array in 24-hour format
   * @returns Sorted array in 12-hour format
   */
  static convertTo12HourDisplay(times24h: string[]): string[] {
    return times24h.map((time) => this.convert24to12(time));
  }

  /**
   * Extract hour from 12-hour time
   * @param time12h - Time in 12-hour format
   * @returns Hour as number (0-23)
   */
  static extractHourFrom12Hour(time12h: string): number {
    const time24h = this.convert12to24(time12h);
    return parseInt(time24h.split(":")[0]);
  }

  /**
   * Validate and process times array with auto-sorting
   * @param times12h - Array of times in 12-hour format
   * @returns Processed result with warnings
   */
  static processTimeArray(times12h: string[]): {
    valid: boolean;
    sortedTimes24h: string[];
    sortedTimes12h: string[];
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for duplicates
    const uniqueTimes = [...new Set(times12h)];
    if (uniqueTimes.length !== times12h.length) {
      warnings.push("Duplicate times were removed");
    }

    // Validate each time
    for (const time of uniqueTimes) {
      const validation = this.validate12HourTime(time);
      if (!validation.valid) {
        errors.push(`${time}: ${validation.error}`);
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        sortedTimes24h: [],
        sortedTimes12h: [],
        warnings,
        errors,
      };
    }

    // Convert and sort
    const sortedTimes24h = this.convertAndSortTimes(uniqueTimes);
    const sortedTimes12h = this.convertTo12HourDisplay(sortedTimes24h);

    // Check if times were reordered
    if (JSON.stringify(uniqueTimes) !== JSON.stringify(sortedTimes12h)) {
      warnings.push(
        `Times were automatically sorted to: ${sortedTimes12h.join(", ")}`
      );
    }

    return {
      valid: true,
      sortedTimes24h,
      sortedTimes12h,
      warnings,
      errors,
    };
  }

  /**
   * Format datetime with 12-hour time
   * @param date - Date object
   * @param time12h - Time in 12-hour format
   * @returns ISO string for backend
   */
  static createDateTimeISO(date: Date, time12h: string): string {
    const time24h = this.convert12to24(time12h);
    const [hours, minutes] = time24h.split(":").map(Number);

    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);

    return result.toISOString();
  }

  /**
   * Parse ISO datetime to 12-hour format for display
   * @param isoString - ISO datetime string
   * @returns Object with date and 12-hour time
   */
  static parseISOTo12Hour(isoString: string): { date: Date; time12h: string } {
    const date = new Date(isoString);
    const hours = date.getHours();
    const minutes = date.getMinutes();

    const time24h = `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
    const time12h = this.convert24to12(time24h);

    return { date, time12h };
  }

  /**
   * Parse date string to Date object
   * @param dateString - Date string in YYYY-MM-DD format
   * @returns Date object
   */
  static parseDateString(dateString: string): Date {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  /**
   * Format date for display
   * @param date - Date object
   * @returns Date string in YYYY-MM-DD format
   */
  static formatDateForDisplay(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Convert 12-hour hours array to 24-hour hours array
   * @param times12h - Array of times in 12-hour format
   * @returns Array of hours (0-23)
   */
  static convert12HourTimesToHoursArray(times12h: string[]): number[] {
    return times12h.map((time) => this.extractHourFrom12Hour(time));
  }

  /**
   * Convert 24-hour hours array to 12-hour format for display
   * @param hours - Array of hours (0-23)
   * @returns Array of times in 12-hour format
   */
  static convertHoursArrayTo12HourDisplay(hours: number[]): string[] {
    return hours.map((hour) =>
      this.convert24to12(`${hour.toString().padStart(2, "0")}:00`)
    );
  }
}
