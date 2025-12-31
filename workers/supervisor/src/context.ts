
import { Env } from './index';

export async function assembleContext(env: Env, projectId: string): Promise<string> {
  if (!env.DB) {
      console.warn("DB binding not found during context assembly.");
      return "";
  }

  try {
      // 1. Get Seed from D1
      const project = await env.DB.prepare("SELECT product_seed FROM projects WHERE id = ?").bind(projectId).first<{product_seed: string}>();
      if (!project) return "";

      // 2. Get Artifacts from D1 (simpler than R2 for metadata) to build context
      // Fetch summary of recent artifacts
      const artifacts = await env.DB.prepare("SELECT agent_id, content FROM artifacts WHERE project_id = ? ORDER BY created_at ASC").bind(projectId).all<{agent_id: string, content: string}>();
      
      let context = `Project Goal: ${project.product_seed}\n\nExisting Architecture:\n`;
      if (artifacts.results) {
          artifacts.results.forEach(a => {
              // Truncate content to avoid blowing up context window, assuming content is string
              // If content is R2 key, we might need to skip or fetch, but usually artifacts table holds metadata or small content
              // For this implementation, we assume it might contain text.
              const contentPreview = a.content.length > 500 ? a.content.substring(0, 500) + "..." : a.content;
              context += `[${a.agent_id.toUpperCase()}]: ${contentPreview}\n`;
          });
      }
      
      return context;
  } catch (e) {
      console.error("Context assembly failed", e);
      return "";
  }
}
