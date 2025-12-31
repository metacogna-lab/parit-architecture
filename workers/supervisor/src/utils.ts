/**
 * Utility functions for Parit Supervisor Worker
 */

/**
 * Generate a UUID v4
 * Uses crypto.randomUUID() which is available in Cloudflare Workers
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Get current timestamp in milliseconds (Unix epoch)
 */
export function now(): number {
  return Date.now();
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Standardized error response
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Standardized success response
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
}

/**
 * Create error response
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 500,
  details?: any,
  corsHeaders: Record<string, string> = {}
): Response {
  const payload: ErrorResponse = {
    success: false,
    error: { code, message, details }
  };

  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Create success response
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
  corsHeaders: Record<string, string> = {}
): Response {
  const payload: SuccessResponse<T> = {
    success: true,
    data
  };

  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Parse and validate request JSON body
 */
export async function parseRequestBody<T>(request: Request): Promise<T> {
  try {
    return await request.json() as T;
  } catch (e) {
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * Sanitize project name
 */
export function sanitizeProjectName(name: string): string {
  // Trim whitespace and limit length
  return name.trim().substring(0, 255);
}

/**
 * Sanitize product seed
 */
export function sanitizeProductSeed(seed: string): string {
  // Trim whitespace and limit length to 10KB
  return seed.trim().substring(0, 10000);
}

/**
 * Check if stage requires HITL interrupt
 */
export function requiresInterrupt(stage: string): boolean {
  const INTERRUPT_STAGES = ['data', 'logic'];
  return INTERRUPT_STAGES.includes(stage);
}

/**
 * Estimate artifact size in bytes
 */
export function estimateSize(content: string): number {
  // Rough estimate: each character = 1 byte (ASCII) or up to 4 bytes (UTF-8)
  return new Blob([content]).size;
}

/**
 * Should artifact be stored in R2?
 */
export function shouldUseR2(content: string): boolean {
  const SIZE_THRESHOLD = 100 * 1024; // 100KB
  return estimateSize(content) >= SIZE_THRESHOLD;
}
