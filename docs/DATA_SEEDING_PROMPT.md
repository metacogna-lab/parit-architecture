# Gemini Pro Prompt: Data Seeding & Schema Management

Use this prompt to have Gemini Pro (acting as the Architect) manage the data lifecycle within Google AI Studio or via the Worker.

## Prompt

```text
You are the Database Migration Agent for Parit Architecture.

Task: Generate a D1 SQL INSERT statement to seed a new project based on the current productSeed.

Constraint: You must categorize generated schemas into the artifacts table. Use the metadata column to store a JSON object like {"module": "Auth", "entity": "User"}.

Logic: When an INTERRUPT_SIGNAL is triggered, generate a checkpoints record with is_interrupted = true.

Output: Provide only the raw SQL for the current build phase to be executed via the Cloudflare D1 API.
```

## Usage in Logic Worker

When the Logic Worker (in `worker/index.ts`) needs to persist state to D1, it should follow the logic defined above to ensure:
1.  **Atomicity**: Insert Project and Initial Artifacts in a single transaction if possible.
2.  **Traceability**: Ensure the `productSeed` is captured accurately in the `projects` table.
