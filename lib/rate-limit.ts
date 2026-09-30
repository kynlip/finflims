/**
 * Rate Limiting Module
 * 
 * Captain Media Ecosystem Standard
 * Simple in-memory rate limiting (works out of the box)
 * Optional: Upgrade to Upstash Redis for production persistence
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (resets on server restart - acceptable for most cases)
const store: RateLimitStore = {};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Simple in-memory rate limiter
 * 
 * @param key - Unique identifier (e.g., "login:192.168.1.1")
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function rateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const entry = store[key];

  // No entry or expired - create new
  if (!entry || entry.resetTime < now) {
    store[key] = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    return {
      success: true,
      remaining: config.maxAttempts - 1,
      reset: store[key].resetTime,
    };
  }

  // Increment count
  entry.count++;

  // Check if exceeded
  if (entry.count > config.maxAttempts) {
    return {
      success: false,
      remaining: 0,
      reset: entry.resetTime,
    };
  }

  return {
    success: true,
    remaining: config.maxAttempts - entry.count,
    reset: entry.resetTime,
  };
}

/**
 * Get client IP from request
 */
export function getClientIP(req: Request): string {
  // Try various headers (Cloudflare, Vercel, etc.)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return 'unknown';
}

/**
 * Apply rate limit with standard error response
 */
export async function applyRateLimit(
  key: string,
  rateLimitFn: (key: string, config: RateLimitConfig) => Promise<RateLimitResult>,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  return rateLimitFn(key, config);
}

// Pre-configured rate limiters
export const loginRateLimit = rateLimit;
export const registerRateLimit = rateLimit;
