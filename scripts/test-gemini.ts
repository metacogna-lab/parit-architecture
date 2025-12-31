/**
 * Test script to verify Gemini API integration
 *
 * Usage:
 *   GEMINI_API_KEY=your_key_here bun scripts/test-gemini.ts
 *
 * This tests:
 * - Gemini API connectivity
 * - JSON response parsing
 * - AgentResponse contract validation
 * - Streaming functionality
 */

import { callGeminiAPI, callGeminiStreamingAPI, buildPrompt } from '../packages/shared/src/gemini';
import { PRD_WORKER_PROMPT } from '../workers/prd-agent/src/systemPrompts';
import type { AgentResponse } from '../packages/shared/src/index';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY environment variable is required');
  console.error('Usage: GEMINI_API_KEY=your_key_here bun scripts/test-gemini.ts');
  process.exit(1);
}

async function testNonStreamingAPI() {
  console.log('\n🧪 Test 1: Non-Streaming Gemini API Call');
  console.log('━'.repeat(60));

  const context = {
    productSeed: 'A simple task management app for developers',
    targetAudience: 'Software engineers and product managers',
    coreFunctionality: 'Create, organize, and track development tasks'
  };

  const prompt = buildPrompt(PRD_WORKER_PROMPT, context);

  console.log('📝 Prompt length:', prompt.length, 'characters');
  console.log('🔑 Using API key:', GEMINI_API_KEY.substring(0, 10) + '...');
  console.log('⏳ Calling Gemini API (this may take 10-30 seconds)...\n');

  try {
    const startTime = Date.now();
    const response: AgentResponse = await callGeminiAPI(prompt, {
      apiKey: GEMINI_API_KEY,
      model: 'gemini-2.0-flash-exp',
      temperature: 0.7,
      maxTokens: 8192
    });

    const latency = Date.now() - startTime;

    console.log('✅ Success! Received response in', latency, 'ms\n');

    // Validate response structure
    console.log('📋 Validating AgentResponse structure...');

    if (!response.system_state) {
      throw new Error('Missing system_state in response');
    }
    if (!response.artifact) {
      throw new Error('Missing artifact in response');
    }
    if (!response.trace) {
      throw new Error('Missing trace in response');
    }

    console.log('✅ system_state:', {
      current_phase: response.system_state.current_phase,
      status: response.system_state.status,
      interrupt_signal: response.system_state.interrupt_signal,
      message: response.system_state.message.substring(0, 50) + '...'
    });

    console.log('✅ artifact:', {
      type: response.artifact.type,
      content_length: response.artifact.content.length,
      content_preview: response.artifact.content.substring(0, 100) + '...'
    });

    console.log('✅ trace:', {
      agent: response.trace.agent,
      reasoning_preview: response.trace.reasoning.substring(0, 50) + '...',
      tokens_estimated: response.trace.tokens_estimated,
      model_used: response.trace.model_used,
      latency_ms: response.trace.latency_ms
    });

    console.log('\n✅ Non-streaming test PASSED');
    return true;
  } catch (error: any) {
    console.error('❌ Non-streaming test FAILED');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    return false;
  }
}

async function testStreamingAPI() {
  console.log('\n🧪 Test 2: Streaming Gemini API Call');
  console.log('━'.repeat(60));

  const context = {
    productSeed: 'A real-time collaboration whiteboard',
    targetAudience: 'Remote teams and educators',
    coreFunctionality: 'Draw, annotate, and share ideas in real-time'
  };

  const prompt = buildPrompt(PRD_WORKER_PROMPT, context);

  console.log('📝 Prompt length:', prompt.length, 'characters');
  console.log('⏳ Calling Gemini Streaming API...\n');

  let chunkCount = 0;
  let totalChars = 0;
  const chunks: string[] = [];

  try {
    const startTime = Date.now();
    const response: AgentResponse = await callGeminiStreamingAPI(prompt, {
      apiKey: GEMINI_API_KEY,
      model: 'gemini-2.0-flash-exp',
      temperature: 0.7,
      maxTokens: 8192
    }, {
      onChunk: (chunk: string) => {
        chunkCount++;
        totalChars += chunk.length;
        chunks.push(chunk);
        process.stdout.write('.');
      },
      onStatus: (status: string) => {
        console.log('\n📊 Status update:', status);
      },
      onComplete: (response: AgentResponse) => {
        console.log('\n✅ Streaming complete!');
      },
      onError: (error: Error) => {
        console.error('\n❌ Streaming error:', error.message);
      }
    });

    const latency = Date.now() - startTime;

    console.log('\n\n✅ Streaming completed in', latency, 'ms');
    console.log('📊 Statistics:');
    console.log('  - Chunks received:', chunkCount);
    console.log('  - Total characters:', totalChars);
    console.log('  - Average chunk size:', Math.round(totalChars / chunkCount), 'chars');

    // Validate response
    if (!response.system_state || !response.artifact || !response.trace) {
      throw new Error('Invalid response structure from streaming API');
    }

    console.log('\n✅ Response structure valid');
    console.log('✅ Streaming test PASSED');
    return true;
  } catch (error: any) {
    console.error('\n❌ Streaming test FAILED');
    console.error('Error:', error.message);
    return false;
  }
}

async function testErrorHandling() {
  console.log('\n🧪 Test 3: Error Handling');
  console.log('━'.repeat(60));

  console.log('⏳ Testing with invalid API key...\n');

  try {
    await callGeminiAPI('test prompt', {
      apiKey: 'invalid_key_12345',
      model: 'gemini-2.0-flash-exp'
    });

    console.log('❌ Error handling test FAILED (should have thrown error)');
    return false;
  } catch (error: any) {
    if (error.message.includes('Gemini API error') || error.message.includes('401') || error.message.includes('403')) {
      console.log('✅ Error correctly caught:', error.message.substring(0, 100));
      console.log('✅ Error handling test PASSED');
      return true;
    } else {
      console.log('❌ Unexpected error:', error.message);
      return false;
    }
  }
}

async function main() {
  console.log('🚀 Starting Gemini API Integration Tests');
  console.log('═'.repeat(60));

  const results = {
    nonStreaming: await testNonStreamingAPI(),
    streaming: await testStreamingAPI(),
    errorHandling: await testErrorHandling()
  };

  console.log('\n' + '═'.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('═'.repeat(60));
  console.log('Non-Streaming API:  ', results.nonStreaming ? '✅ PASS' : '❌ FAIL');
  console.log('Streaming API:      ', results.streaming ? '✅ PASS' : '❌ FAIL');
  console.log('Error Handling:     ', results.errorHandling ? '✅ PASS' : '❌ FAIL');
  console.log('═'.repeat(60));

  const allPassed = Object.values(results).every(r => r);

  if (allPassed) {
    console.log('🎉 All tests PASSED! Gemini integration is working correctly.');
    process.exit(0);
  } else {
    console.log('❌ Some tests FAILED. Please check the errors above.');
    process.exit(1);
  }
}

main();
