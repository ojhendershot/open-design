---
id: "20260509-token-first-tailwind"
name: "Token First Tailwind"
status: new
created: "2026-05-09"
---

## Overview

### Problem Statement

- 当前前端样式集中在 `index.css`，贡献者改 UI 时容易集中修改同一个全局 CSS 文件，增加代码冲突概率。
- 项目已经有 CSS variable token 体系，需要把它作为视觉源头接入 Tailwind，让贡献者主要在 TSX 中用 Tailwind utilities 表达样式。
- 重构过程中需要保持现有前端展示稳定，尤其是整体页面风格和视觉调性。

### Goals

- 实现 token-first Tailwind：Tailwind 作为样式书写和组合工具，视觉 token 继续来自现有 CSS variables。
- 让新增和迁移中的组件样式主要写在 TSX 的 `className` 中，减少日常改动对 `index.css` 的依赖。
- 降低多人贡献时由全局 CSS 热点文件引起的冲突概率。
- 保持现有页面风格、明暗主题、暖色纸感调性和整体展示效果稳定。

### Scope

- 参考 `frontend-token-first-tailwind-research.md` 的调研结论推进。
- 接入 Tailwind，并将现有设计 token 映射为可用的 Tailwind token classes。
- 保留 `index.css` 中的基础 token、全局基础样式和必须全局管理的内容样式。
- 建立约束，让贡献者优先使用项目 token 和基础 UI primitives。
- 采用渐进迁移方式，优先治理高冲突、高偏离或新增代码路径。

### Constraints

- 迁移期间前端展示不能漂移，整体页面风格保持一致。
- 不进行一次性全量重写。
- `index.css` 继续承载全局 token 和基础样式，不把视觉源头迁移到 Tailwind 默认 palette。
- `frontend-token-first-tailwind-research.md` 作为参考思路和初始假设使用；Research / Design 阶段需要用当前代码事实逐条验证其中结论。

### Success Criteria

- 新代码可以主要通过 TSX 中的 token-first Tailwind classes 完成样式表达。
- 贡献者通常无需修改 `index.css` 即可完成普通组件 UI 改动。
- 默认 Tailwind 颜色和随意硬编码色值有明确约束或拦截机制。
- 关键页面在迁移前后保持视觉一致，整体风格无明显漂移。

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
