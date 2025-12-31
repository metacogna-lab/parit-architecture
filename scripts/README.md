# Test Scripts

## Gemini API Integration Test

### Quick Start

```bash
# Set your Gemini API key
export GEMINI_API_KEY="your_gemini_api_key_here"

# Run the test
bun scripts/test-gemini.ts
```

### What It Tests

1. **Non-Streaming API Call**
   - Validates Gemini API connectivity
   - Verifies JSON response parsing
   - Checks AgentResponse contract structure
   - Measures latency

2. **Streaming API Call**
   - Tests Server-Sent Events (SSE) streaming
   - Counts chunks and characters
   - Verifies real-time chunk delivery
   - Validates final response structure

3. **Error Handling**
   - Tests invalid API key handling
   - Verifies proper error messages
   - Ensures graceful failure

### Expected Output

```
🚀 Starting Gemini API Integration Tests
════════════════════════════════════════════════════════════

🧪 Test 1: Non-Streaming Gemini API Call
────────────────────────────────────────────────────────────
📝 Prompt length: 2847 characters
🔑 Using API key: AIzaSyBXXX...
⏳ Calling Gemini API (this may take 10-30 seconds)...

✅ Success! Received response in 12453 ms

📋 Validating AgentResponse structure...
✅ system_state: { current_phase: 'prd', status: 'complete', ... }
✅ artifact: { type: 'markdown', content_length: 3245, ... }
✅ trace: { agent: 'prd-agent', tokens_estimated: 1200, ... }

✅ Non-streaming test PASSED

🧪 Test 2: Streaming Gemini API Call
────────────────────────────────────────────────────────────
📝 Prompt length: 2891 characters
⏳ Calling Gemini Streaming API...

..................................................
✅ Streaming complete!

✅ Streaming completed in 15234 ms
📊 Statistics:
  - Chunks received: 48
  - Total characters: 3156
  - Average chunk size: 65 chars

✅ Response structure valid
✅ Streaming test PASSED

🧪 Test 3: Error Handling
────────────────────────────────────────────────────────────
⏳ Testing with invalid API key...

✅ Error correctly caught: Gemini API error (403): API key not valid...
✅ Error handling test PASSED

════════════════════════════════════════════════════════════
📊 Test Results Summary
════════════════════════════════════════════════════════════
Non-Streaming API:   ✅ PASS
Streaming API:       ✅ PASS
Error Handling:      ✅ PASS
════════════════════════════════════════════════════════════
🎉 All tests PASSED! Gemini integration is working correctly.
```

### Troubleshooting

**Error: "GEMINI_API_KEY environment variable is required"**
- Solution: Set your API key: `export GEMINI_API_KEY="your_key"`

**Error: "Gemini API error (401)"**
- Solution: Your API key is invalid. Get a valid key from https://aistudio.google.com/app/apikey

**Error: "Gemini API error (429)"**
- Solution: Rate limit exceeded. Wait a few minutes and try again.

**Error: "Failed to parse Gemini response as JSON"**
- Solution: The model may not have returned valid JSON. Try using a different model or adjust the prompt.

### Getting a Gemini API Key

1. Visit https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and set it in your environment:
   ```bash
   export GEMINI_API_KEY="AIzaSy..."
   ```

### Notes

- The test uses `gemini-2.0-flash-exp` model (fast, experimental)
- First test may take 10-30 seconds (cold start)
- Subsequent tests are usually faster (warm API)
- Streaming test shows real-time progress with dots (.)
