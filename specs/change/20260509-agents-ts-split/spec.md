---
id: "20260509-agents-ts-split"
name: "Agents Ts Split"
status: new
created: "2026-05-09"
---

## Overview

### 目标

- 根据 specs/change/20260509-agents-ts-split/agents-merge-conflict-report.md 中的思路拆分 agents.ts 和 agents.test.ts，同时实现其中的三个阶段
- 在拆分的时候，保持 agents.ts 名字不变，但是新增的目录名使用 runtimes，后续逐步把 agents 的概念改名到 runtimes。
- 由于缺少测试保障，拆分重构的时候尽量以代码搬迁为主，不过逻辑重写。如果有确实需要逻辑重写的地方，先不处理，降低整体改动风险。

## Research

<!-- What have we found out? What are the alternatives considered? -->

## Design

<!-- Technical approach, architecture decisions, and test strategy. Each design decision should cite a fact source. -->

## Plan

<!-- Optional: Step breakdown for complex features that need multiple implementation steps.
     Decided during Design. Checked off during Implement.
     Keep this section compact and step-based.
     Use markdown checkboxes for all step and substep items, for example:
     - [ ] Step 1: Foo
       - [ ] Substep 1.1 Implement: Foo foundation
       - [ ] Substep 1.2 Implement: Foo integration
       - [ ] Substep 1.3 Implement: Foo edge handling
       - [ ] Substep 1.4 Verify: Foo automated coverage
       - [ ] Substep 1.5 Verify: Foo manual workflow
     - [ ] Step 2: Bar
       - [ ] Substep 2.1 Implement: Bar
       - [ ] Substep 2.2 Verify: Bar
     - [ ] Step 3: Baz
       - [ ] Substep 3.1 Implement: Baz
       - [ ] Substep 3.2 Verify: Baz
     Use a capability-based step breakdown with reviewable, meaningful increments.
     Good boundaries align with one user-visible workflow, one subsystem/integration boundary, one migration/rollout step, or one stabilization milestone.
     Each step must include small, independent substeps for implementation and immediate testing/verification.
     Within each step, list implementation substeps before verification substeps.
     The final step may focus on overall testing/verification, edge cases, regression coverage, and coverage improvements.
     A step is complete only when relevant tests pass.
     Size steps so one coding agent can implement + validate in a single session.
     Write each substep as one small, independent task. -->

## Notes

<!-- Optional sections — add what's relevant. -->

### Implementation

<!-- Files created/modified, decisions made during coding, deviations from design -->

### Verification

<!-- How the feature was verified: tests written, manual testing steps, results -->
