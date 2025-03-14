/**
 * Example of how to use the logger utility
 * This shows how to replace console.log statements with our conditional logger
 */

import { logger } from './logger';

// Original code with console.log
function originalFunction() {
  console.log("This will show in development but be stripped in production");
  console.info("Info message that will be removed in production");
  console.warn("Warning that will be removed in production");
  console.error("Error that will remain in production"); // Errors are kept
  
  if (someCondition()) {
    console.log("Conditional log that will be stripped");
  }
}

// Updated code with logger utility
function updatedFunction() {
  logger.log("This will show in development but be stripped in production");
  logger.info("Info message that will be removed in production");
  logger.warn("Warning that will be removed in production");
  logger.error("Error that will remain in production"); // Errors are kept
  
  if (someCondition()) {
    logger.log("Conditional log that will be stripped");
  }
  
  // For important logs you want to keep in production
  logger.always.log("This important log will remain in production");
}

// Helper function for the example
function someCondition(): boolean {
  return Math.random() > 0.5;
}

export function loggerExample() {
  logger.log("Example of using the logger utility");
  logger.info("Current environment:", process.env.NODE_ENV);
  
  // Different log levels
  logger.log("Regular log message");
  logger.info("Informational message");
  logger.warn("Warning message");
  logger.error("Error message - this will show in all environments");
  logger.debug("Debug message");
  
  // Always logs (will show in production too)
  logger.always.log("Important message that will show in production");
  logger.always.info("Important info that will show in production");
}