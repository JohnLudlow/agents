# Code Quality Standards

## Overview
This skill defines code quality expectations for features implemented by johnludlow agents across C#, TypeScript, and C++.

## General Principles
- Follow SOLID principles
- Keep functions small and focused (single responsibility)
- Use meaningful names for variables, functions, and classes
- Include comments for "why", not "what"
- Maintain consistent style with existing codebase

## Performance Considerations
- Avoid unnecessary allocations
- Use appropriate data structures
- Profile before optimizing
- Document performance-critical sections
- Consider memory usage in loops

## Maintainability
- Write self-documenting code
- Keep cyclomatic complexity low
- Use dependency injection where appropriate
- Extract reusable components
- Maintain consistent patterns

## Testability
- Design code to be testable
- Avoid static dependencies
- Use interfaces for external dependencies
- Keep functions pure when possible
- Provide meaningful test error messages

## C# Specific
- Use async/await for I/O operations
- Leverage LINQ appropriately
- Use dependency injection containers
- Follow naming conventions (PascalCase for public members)
- Use nullable reference types

## TypeScript Specific
- Use strict mode
- Leverage TypeScript types fully
- Avoid `any` type
- Use interfaces for public APIs
- Include JSDoc comments for public functions

## C++ Specific
- Use modern C++ (C++17+)
- Use smart pointers for memory management
- Avoid raw pointers
- Use const correctly
- Include proper exception handling

## Testing Requirements
- Write tests for all public APIs
- Aim for > 80% code coverage for critical paths
- Use descriptive test names
- Include edge case tests
- Follow arrange-act-assert pattern
