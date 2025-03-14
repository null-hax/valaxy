/**
 * Logger utility that only logs in development environment
 * Use this instead of console.* methods for conditional logging
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  info: (...args: any[]): void => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  warn: (...args: any[]): void => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]): void => {
    // We keep error logs in all environments for critical issues
    console.error(...args);
  },
  
  debug: (...args: any[]): void => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  
  // For cases where you want to conditionally log in production too
  // Useful for important but non-critical information
  always: {
    log: (...args: any[]): void => {
      console.log(...args);
    },
    info: (...args: any[]): void => {
      console.info(...args);
    }
  }
};