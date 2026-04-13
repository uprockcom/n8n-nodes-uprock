# Todo Instructions

The `todo/` folder is the planning source for implementation work. Treat it as a set of epics and tasks, not as scratch notes.

## Epics

- Each Markdown file in this folder is one epic.
- Epic filenames use the format `NN-kebab-case-name.md`, where `NN` is a two-digit ordering prefix.
- Keep the numeric prefix stable unless the user explicitly asks to reorganize the roadmap.
- Add new epics only when the work is meaningfully separate from the existing epic files.
- New epic files should follow the same checklist-only format used by the current files.

## Tasks

- Each checklist item inside an epic is one task.
- Write tasks as concrete, actionable statements.
- Keep tasks small enough that completion can be verified from code, docs, configuration, tests, or an explicit decision.
- Use unchecked items for open work:

  ```md
  - [ ] Define the package naming policy.
  ```

- Use checked items only after the work is actually done and verified:

  ```md
  - [x] Define the package naming policy.
  ```

- Do not mark a task complete just because related work started.
- Do not delete completed tasks during normal work; checked tasks are the project history.
- If a task is too broad, split it into smaller checklist items instead of hiding assumptions in prose.

## Working From Todo

- Before implementing a feature, read the relevant epic files and identify the tasks being addressed.
- Prefer completing existing tasks over creating duplicate tasks.
- When implementation reveals missing work, add a new task to the most relevant epic.
- When a task depends on a decision that has not been made, keep it unchecked and add or preserve a decision task instead of guessing silently.
- Update todo items in the same change set as the implementation when the implementation completes or invalidates those items.
- Only check a task when the repository state now satisfies that task.

## Status And Scope

- The `todo/` folder tracks project work at epic and task level; it should not contain long-form design docs, temporary notes, or command logs.
- Keep implementation details in code, README, or dedicated documentation files once they become durable project knowledge.
- If a task becomes obsolete, change it into the correct task or ask the user before removing it.
- If multiple epics are affected by one implementation, update every relevant checklist item.
