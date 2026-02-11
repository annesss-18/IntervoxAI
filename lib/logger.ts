// lib/logger.ts - Centralized logging utility
/* eslint-disable no-console */

const isDevelopment = process.env.NODE_ENV === "development";

export const logger = {
  /**
   * Info level - Shows in development only
   */
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info("ℹ️", ...args);
    }
  },

  /**
   * Debug level - Shows in development only
   * Use for verbose logging that helps with troubleshooting
   */
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug("🔍", ...args);
    }
  },

  /**
   * Warning level - Always shows
   */
  warn: (...args: unknown[]) => {
    console.warn("⚠️", ...args);
  },

  /**
   * Error level - Always shows
   */
  error: (...args: unknown[]) => {
    console.error("❌", ...args);
  },

  /**
   * Log level - Shows in development only
   */
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log("📝", ...args);
    }
  },

  /**
   * Success level - Shows in development only
   */
  success: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log("✅", ...args);
    }
  },
};
