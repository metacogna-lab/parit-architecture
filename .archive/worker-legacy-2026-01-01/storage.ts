
/**
 * Worker Logic for R2 Interaction and D1 Metadata.
 * This file is intended to run on the Cloudflare Worker, not the Browser.
 */

// --- Cloudflare Worker Type Definitions ---
// These interfaces ensure TS compilation without needing @cloudflare/workers-types in the browser project

interface R2Object {
  writeHttpMetadata(headers: Headers): void;
  httpEtag: string;
  body: ReadableStream;
}

interface R2Bucket {
  put(key: string, value: string | ReadableStream | ArrayBuffer | ArrayBufferView, options?: any): Promise<R2Object | null>;
  get(key: string): Promise<R2Object | null>;
}

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  error?: string;
  meta: any;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  exec(query: string): Promise<D1Result>;
}

export interface Env {
  STORAGE: R2Bucket;
  DB: D1Database;
  ENVIRONMENT: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GEMINI_API_KEY?: string;
  DEFAULT_PROVIDER: string;
}

/**
 * Saves a heavy artifact (Markdown, Code, or JSON) to R2.
 */
export async function saveArtifactToR2(
  env: Env, 
  projectId: string, 
  stageId: string, 
  content: string, 
  extension: string = 'md'
) {
  const timestamp = Date.now();
  const key = `projects/${projectId}/${stageId}/${timestamp}.${extension}`;
  
  try {
    // Fire and forget upload
    await env.STORAGE.put(key, content, {
      httpMetadata: {
        contentType: extension === 'json' ? 'application/json' : 'text/markdown',
      },
      customMetadata: {
        stage: stageId,
        environment: env.ENVIRONMENT,
        projectId: projectId // Critical for session tracking
      }
    });
    
    return { success: true, key };
  } catch (error) {
    console.error(`R2 Write Error: ${error}`);
    // We don't throw here to prevent crashing the response if storage fails (optional)
    return { success: false, error: String(error) };
  }
}

/**
 * Saves project metadata/checkpoints to D1.
 */
export async function saveCheckpointToD1(
  env: Env,
  projectId: string,
  phase: string,
  snapshot: any
) {
  if (!env.DB) {
      console.warn("D1 binding (DB) not found.");
      return;
  }

  const id = crypto.randomUUID();
  const query = `INSERT INTO checkpoints (id, project_id, phase, snapshot) VALUES (?, ?, ?, ?)`;
  
  try {
    await env.DB.prepare(query)
      .bind(id, projectId, phase, JSON.stringify(snapshot))
      .run();
    return { success: true, id };
  } catch (error) {
    console.error(`D1 Write Error: ${error}`);
    return { success: false, error: String(error) };
  }
}

/**
 * Retrieves an artifact from R2.
 */
export async function getArtifactFromR2(env: Env, key: string) {
  const object = await env.STORAGE.get(key);

  if (object === null) {
    return null;
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);

  return {
    headers,
    body: object.body
  };
}
