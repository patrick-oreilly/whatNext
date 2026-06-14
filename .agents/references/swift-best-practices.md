# Swift Best Practices

This document outlines up-to-date best practices for Swift development, particularly focusing on Swift 5.0+ and modern app architecture.

## 1. Value Types over Reference Types
- Prefer `struct` and `enum` (value types) over `class` (reference types) unless you explicitly need reference semantics, inheritance, or Objective-C interoperability.
- Value types are inherently thread-safe and avoid retain cycles.

## 2. Protocol-Oriented Programming (POP)
- Use protocols and protocol extensions to define shared behavior rather than relying on class inheritance.
- Design small, focused protocols (e.g., `Decodable`, `Equatable`).

## 3. Safe Optional Handling
- Never use forced unwrapping (`!`) unless you are absolutely certain the value will never be nil.
- Use `if let` or `guard let` to safely unwrap optionals.
- Use `guard let` early in functions to handle failure scenarios gracefully and avoid nested `if` statements.
- Provide default values using the nil-coalescing operator (`??`).

## 4. Modern Concurrency
- Use `async` and `await` over completion handlers, GCD (`DispatchQueue`), or Combine publishers for cleaner asynchronous code and better error propagation.
- Use `Task` for unstructured concurrency or structured execution contexts.
- Use `actor` types to safely isolate state in concurrent environments and prevent data races.

## 5. Error Handling
- Use Swift's native `throw`, `do-catch`, and `try` statements instead of `NSError` pointers.
- Define custom `Error` enums for domain-specific errors.
- Use `try?` when you only care whether an operation succeeded (resulting in an optional), but prefer `do-catch` when the specific error reason matters.

## 6. Naming Conventions and Style
- **Types and Protocols**: `PascalCase` (e.g., `UserRepository`, `NetworkService`).
- **Variables and Functions**: `camelCase` (e.g., `fetchUserData()`, `userName`).
- Prefer descriptive variable names over abbreviations.
- Group related methods and conformances using `extension` blocks, and annotate them with `// MARK: - Section Name` for clarity in Xcode's minimap and symbol navigator.

## 7. Memory Management
- Understand retain cycles inside closures.
- Use `[weak self]` in closures, particularly in non-escaping network requests or asynchronous tasks, to prevent strong reference cycles.
- Only use `[unowned self]` if you are absolutely guaranteed that `self` will outlive the closure's execution context.

## 8. SwiftUI State Management (for iOS 15.0+)
- Use `@State` for local, view-specific primitive states.
- Use `@Binding` for passing state down the view hierarchy.
- Use `@StateObject` to instate and own a reference type (`ObservableObject`).
- Use `@ObservedObject` for a reference type passed into a view.
- Use `@EnvironmentObject` for global data needed deeply across the view hierarchy.
*(Note: If targeting purely iOS 17+, prefer the `@Observable` macro and `@Environment`, but remain compatible with `@StateObject` for older targets).*
