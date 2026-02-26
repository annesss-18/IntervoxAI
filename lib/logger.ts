/* eslint-disable no-console */

const isDevelopment = process.env.NODE_ENV === "development";

export const logger = {
  info: (...args: unknown[]) => {
    console.info("[INFO]", ...args);
  },

  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug("[DEBUG]", ...args);
    }
  },

  warn: (...args: unknown[]) => {
    console.warn("[WARN]", ...args);
  },

  error: (...args: unknown[]) => {
    console.error("[ERROR]", ...args);
  },

  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log("[LOG]", ...args);
    }
  },

  success: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log("[SUCCESS]", ...args);
    }
  },
};
