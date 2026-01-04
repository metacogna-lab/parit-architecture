/**
 * Cloudflare Worker for Parti Architecture Supervisor
 * Orchestrates multiple agent workers for software architecture tasks
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check
      if (url.pathname === '/health' && request.method === 'GET') {
        return new Response(JSON.stringify({
          status: 'ok',
          service: 'parti-supervisor',
          timestamp: Date.now(),
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Generate endpoint - main functionality
      if (url.pathname === '/generate' && request.method === 'POST') {
        return handleGenerate(request, env);
      }

      // Project management endpoints
      if (url.pathname.startsWith('/project/')) {
        return handleProject(request, env);
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Supervisor error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

// Handle architecture generation
async function handleGenerate(request, env) {
  try {
    const { prompt, context } = await request.json();

    // Route to appropriate agent based on task type
    const taskType = determineTaskType(prompt);

    switch (taskType) {
      case 'api':
        return routeToAgent(env.API_AGENT, request);
      case 'frontend':
        return routeToAgent(env.FRONTEND_AGENT, request);
      case 'logic':
        return routeToAgent(env.LOGIC_AGENT, request);
      case 'design':
        return routeToAgent(env.DESIGN_AGENT, request);
      case 'deployment':
        return routeToAgent(env.DEPLOYMENT_AGENT, request);
      default:
        return routeToAgent(env.PRD_AGENT, request);
    }

  } catch (error) {
    console.error('Generate error:', error);
    return new Response(JSON.stringify({ error: 'Generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

// Handle project operations
async function handleProject(request, env) {
  try {
    const url = new URL(request.url);
    const projectId = url.pathname.split('/project/')[1];

    // Store project data in D1
    if (request.method === 'POST') {
      const projectData = await request.json();
      await env.DB.prepare(
        'INSERT OR REPLACE INTO projects (id, data, created_at) VALUES (?, ?, ?)'
      ).bind(projectId, JSON.stringify(projectData), Date.now()).run();

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Retrieve project data
    if (request.method === 'GET') {
      const result = await env.DB.prepare(
        'SELECT data FROM projects WHERE id = ?'
      ).bind(projectId).first();

      if (result) {
        return new Response(result.data, {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

  } catch (error) {
    console.error('Project error:', error);
    return new Response(JSON.stringify({ error: 'Project operation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

// Determine task type from prompt
function determineTaskType(prompt) {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('api') || lowerPrompt.includes('endpoint')) {
    return 'api';
  }
  if (lowerPrompt.includes('frontend') || lowerPrompt.includes('ui') || lowerPrompt.includes('component')) {
    return 'frontend';
  }
  if (lowerPrompt.includes('logic') || lowerPrompt.includes('business') || lowerPrompt.includes('algorithm')) {
    return 'logic';
  }
  if (lowerPrompt.includes('design') || lowerPrompt.includes('architecture') || lowerPrompt.includes('structure')) {
    return 'design';
  }
  if (lowerPrompt.includes('deploy') || lowerPrompt.includes('infrastructure') || lowerPrompt.includes('ci/cd')) {
    return 'deployment';
  }

  return 'prd'; // Default to PRD agent
}

// Route request to specific agent
async function routeToAgent(agentBinding, originalRequest) {
  try {
    if (agentBinding) {
      // Create new request with routing headers
      const newRequest = new Request(originalRequest);
      newRequest.headers.set('X-Supervisor-Routed', 'true');

      return await agentBinding.fetch(newRequest);
    }

    return new Response(JSON.stringify({ error: 'Agent not available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    console.error('Agent routing error:', error);
    return new Response(JSON.stringify({ error: 'Agent error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}