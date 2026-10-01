# Architecture Decision Records

Each subdirectory is one feature, named by its feature slug. Inside, ADRs are numbered sequentially
(`0001-...`, `0002-...`) in the order they were decided. See each feature's own `README.md` for its list.

Produced by the `feature-adr` skill during feature design — see that skill for the process.

## Purpose

ADRs are a tool for designing a feature well. The goal is a well-designed feature, not the ADRs.

They help us work through a design one decision at a time. Later, they show others how we got there and what we
thought mattered. They record how the feature was designed. They aren't a contract: when building or using the
feature shows a better answer, change the design.

## Features

- code-tag-rollout — rolling out PHP's catch-all `code` tag to the other parser packages
- plugin-customization — a designed, immutable `IPlugin`/`IParser` customization model replacing the ad hoc one
- typescript-parser-split — splitting the tree-sitter TypeScript backends into one parser per file type
