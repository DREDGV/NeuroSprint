---
name: create-skill-from-conversation
description: 'Create or refine a reusable SKILL.md from chat history. Use when user asks to capture a repeatable workflow, checklist, or methodology into a skill file with clear triggers, branching, and completion criteria.'
argument-hint: 'What should the skill produce, and should it be workspace or personal?'
user-invocable: true
disable-model-invocation: false
---

# Create Skill From Conversation

## What This Skill Produces
- A reusable `SKILL.md` that turns a chat-derived workflow into a repeatable procedure.
- Explicit decision points (if/then branches) for ambiguous cases.
- Quality gates and completion checks so execution can be validated.

## When To Use
- User asks to create a new skill from an existing process.
- Team wants to standardize how recurring tasks are performed.
- A multi-step conversation should become reusable instructions.

## Inputs To Collect
- Desired outcome of the skill.
- Scope: workspace (`.github/skills/...`) or personal (`~/.copilot/skills/...`).
- Depth: quick checklist or full multi-step workflow.

## Procedure
1. Review the conversation and extract a concrete workflow.
2. Capture the workflow as:
   - Ordered steps.
   - Decision points and branches.
   - Completion checks.
3. If workflow evidence is weak, ask focused clarifying questions:
   - What artifact should the skill produce?
   - Where should the skill live (workspace or personal)?
   - How detailed should it be (checklist vs full workflow)?
4. Draft `SKILL.md` with a discovery-friendly YAML header:
   - `name` must match the folder name.
   - `description` must include trigger keywords.
   - Keep instructions concise and executable.
5. Save the draft in the target path.
6. Identify weak or ambiguous sections and request confirmation.
7. Finalize based on feedback.

## Branching Logic
- If no repeatable pattern exists in chat:
  - Create a minimal draft from stated goal and ask for examples.
- If user asks for personal scope:
  - Move target path to `~/.copilot/skills/<name>/SKILL.md`.
- If user asks for slash-only behavior:
  - Set `disable-model-invocation: true`.
- If user does not want slash command visibility:
  - Set `user-invocable: false`.

## Quality Criteria
- `name` matches folder name exactly.
- Description is specific and keyword-rich.
- Procedure can be followed without hidden assumptions.
- Decision points are explicit for uncertain scenarios.
- File is short enough for progressive loading.

## Completion Checklist
- [ ] Header fields validated.
- [ ] Triggers and use cases documented.
- [ ] Step-by-step workflow included.
- [ ] Branching logic included.
- [ ] Quality checks included.
- [ ] User reviewed ambiguous points.

## Suggested Prompt Examples
- "Create a skill from our deployment workflow."
- "Turn this debugging method into a reusable SKILL.md."
- "Make a project skill for code review with pass/fail gates."
