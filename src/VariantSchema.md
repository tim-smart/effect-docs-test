# VariantSchema Guide

`VariantSchema` from `@effect/experimental` is a powerful module that allows you to define schemas that can have different shapes for different use cases. This is particularly useful when building applications that need to handle the same data in multiple contexts - such as database operations, API responses, and GraphQL queries.

## The Problem

When building real-world applications, you often need to represent the same data differently depending on the context:

- **Database operations**: Need all fields, including sensitive data like passwords
- **API responses**: Should exclude sensitive fields and include computed fields
- **Create operations**: Don't need auto-generated fields like IDs or timestamps
- **Update operations**: Need IDs but may exclude certain immutable fields
- **List views**: Only need essential fields for performance

Traditional approaches force you to either:
1. Create multiple separate schemas (leading to duplication and maintenance issues)
2. Use a single schema with optional fields everywhere (losing type safety)
3. Transform data manually (error-prone and verbose)

## The Solution

`VariantSchema` allows you to define a single schema with multiple "variants" - different views of the same data structure. Each variant can include, exclude, or transform fields as needed while maintaining type safety.

## Basic Usage

Let's start with a simple example:

```typescript
// src/examples/variant-schema-basic.ts
import { VariantSchema } from "@effect/experimental"
import { Schema } from "effect"

// Example 1: Basic VariantSchema setup
const { Struct, Field, Class, extract } = VariantSchema.make({
  variants: ["api", "database"],
  defaultVariant: "api"
})

// Simple user model with different representations
const UserModel = Struct({
  id: Schema.Number,
  name: Schema.String,
  // Password is only needed for database operations
  password: Field({
    database: Schema.String
  }),
  // Email is formatted differently for API vs database
  email: Field({
    api: Schema.String.pipe(Schema.pattern(/^\S+@\S+$/)),
    database: Schema.String
  })
})

// Extract different variants
const ApiUser = extract(UserModel, "api")
const DatabaseUser = extract(UserModel, "database")

// Test the schemas
console.log("API User schema includes:", Object.keys(ApiUser.fields))
console.log("Database User schema includes:", Object.keys(DatabaseUser.fields))

// Example usage
const apiUserData = {
  id: 1,
  name: "John Doe",
  email: "john@example.com"
}

const databaseUserData = {
  id: 1,
  name: "John Doe",
  email: "john@example.com",
  password: "hashed-password"
}

console.log("API user validation:", Schema.decodeUnknownSync(ApiUser)(apiUserData))
console.log("Database user validation:", Schema.decodeUnknownSync(DatabaseUser)(databaseUserData))
```

### Key Concepts

1. **Variants**: Different views of your data (e.g., "api", "database", "graphql")
2. **Default Variant**: The primary representation used when no specific variant is requested
3. **Fields**: Define which variants include which fields
4. **Extract**: Generate a specific variant schema from your model

## Working with Classes

For more complex models, you can use the `Class` constructor to create schema classes with automatic variant properties:

```typescript
// src/examples/variant-schema-classes.ts
import { VariantSchema } from "@effect/experimental"
import { Schema } from "effect"

// Example 2: Using Classes with VariantSchema
const { Class, Field, FieldOnly, FieldExcept } = VariantSchema.make({
  variants: ["create", "update", "response"],
  defaultVariant: "response"
})

// Create a Product class with different variants
class Product extends Class<Product>("Product")({
  id: FieldExcept("create")(Schema.Number.pipe(Schema.brand("ProductId"))),
  name: Schema.NonEmptyString,
  description: Schema.String,
  price: Schema.Number.pipe(Schema.positive()),
  // createdAt is only for response, generated on create
  createdAt: FieldOnly("response")(Schema.String),
  // updatedAt is for response and gets updated on update
  updatedAt: FieldExcept("create")(Schema.String)
}) {}

// The variants are automatically available
console.log("Available Product variants:")
console.log("- Default (response):", Product.fields)
console.log("- Create variant:", Product.create.fields)
console.log("- Update variant:", Product.update.fields)
```

### Field Helpers

- **`FieldOnly(variants)`**: Include field only in specified variants
- **`FieldExcept(variants)`**: Include field in all variants except specified ones
- **`Field(config)`**: Manually specify which variants include the field

## Advanced Field Manipulation

For more complex scenarios, you can use field evolution and key mapping:

```typescript
// src/examples/variant-schema-advanced.ts
import { VariantSchema } from "@effect/experimental"
import { Schema } from "effect"

// Example 3: Advanced Field Evolution and Real-world Use Case
const { Struct, Field, fieldEvolve, fieldFromKey, FieldOnly, extract } = VariantSchema.make({
  variants: ["database", "api", "graphql"],
  defaultVariant: "api"
})

// User model with complex field requirements
const UserModel = Struct({
  id: Schema.Number.pipe(Schema.brand("UserId")),
  
  // Email - same across all variants for simplicity
  email: Schema.String.pipe(Schema.pattern(/^\S+@\S+$/)),
  
  // Password only exists in database
  passwordHash: FieldOnly("database")(Schema.String),
  
  // Different field names across variants
  fullName: fieldFromKey({
    database: "full_name", // Snake case for database
    api: "fullName", // Camel case for API
    graphql: "displayName" // Different name for GraphQL
  })(Schema.String),
  
  // Created timestamp with different formats
  createdAt: Field({
    database: Schema.Number, // Unix timestamp in database
    api: Schema.String, // ISO string for API
    graphql: Schema.String // ISO string for GraphQL
  }),
  
  // Profile that's nested differently
  profile: Field({
    database: Schema.String, // JSON string in database
    api: Schema.Struct({
      bio: Schema.String,
      avatar: Schema.String
    }),
    graphql: Schema.Struct({
      biography: Schema.String,
      profilePicture: Schema.String
    })
  })
})

// Extract the variants
const DatabaseUser = extract(UserModel, "database")
const ApiUser = extract(UserModel, "api")
const GraphqlUser = extract(UserModel, "graphql")

// Show the different schemas
console.log("=== User Variants ===")
console.log("Database fields:", Object.keys(DatabaseUser.fields))
console.log("API fields:", Object.keys(ApiUser.fields))
console.log("GraphQL fields:", Object.keys(GraphqlUser.fields))
```

### Advanced Features

- **`fieldFromKey`**: Map different field names across variants
- **`fieldEvolve`**: Transform field schemas for each variant
- **Complex nesting**: Different schema structures for the same logical field

## Real-World Use Case: CRUD API

Here's a complete example showing how to build a CRUD API with proper type safety:

```typescript
// src/examples/variant-schema-crud.ts
import { VariantSchema } from "@effect/experimental"
import { Schema } from "effect"

// Example 4: Complete CRUD API with VariantSchema
const { Class, Field, FieldOnly, FieldExcept, fieldFromKey } = VariantSchema.make({
  variants: ["create", "update", "response", "list"],
  defaultVariant: "response"
})

// Task model for a project management app
class Task extends Class<Task>("Task")({
  // ID is auto-generated, not needed for create
  id: FieldExcept("create")(Schema.Number.pipe(Schema.brand("TaskId"))),
  
  // Title is required for create and update
  title: FieldExcept("list")(Schema.NonEmptyString),
  
  // Description is optional for create, can be updated
  description: FieldExcept("list")(Schema.String.pipe(Schema.optional)),
  
  // Status with different field names
  status: fieldFromKey({
    create: "initialStatus",
    update: "status", 
    response: "status",
    list: "status"
  })(Schema.Literal("todo", "in-progress", "done")),
  
  // Priority is optional for create
  priority: Field({
    create: Schema.Literal("low", "medium", "high").pipe(Schema.optional),
    update: Schema.Literal("low", "medium", "high"),
    response: Schema.Literal("low", "medium", "high"),
    list: Schema.Literal("low", "medium", "high")
  }),
  
  // Assignee - can be set on create/update
  assigneeId: FieldExcept("list")(Schema.Number.pipe(Schema.brand("UserId"), Schema.optional)),
  
  // Timestamps - auto-managed, different for list view
  createdAt: FieldOnly("response")(Schema.String),
  updatedAt: FieldOnly("response")(Schema.String),
  
  // For list view, we only show essential info
  summary: FieldOnly("list")(Schema.String)
}) {}

// Simulate CRUD operations
console.log("=== CRUD API Schemas ===")

// CREATE - What clients send to create a task
console.log("CREATE schema fields:", Object.keys(Task.create.fields))

// UPDATE - What clients send to update a task
console.log("UPDATE schema fields:", Object.keys(Task.update.fields))

// RESPONSE - What API returns for single task
console.log("RESPONSE schema fields:", Object.keys(Task.fields))

// LIST - What API returns for task lists (minimal data)
console.log("LIST schema fields:", Object.keys(Task.list.fields))
```

### CRUD Benefits

1. **Type Safety**: Each operation has its own strongly-typed interface
2. **Performance**: List endpoints only return essential data
3. **Security**: Sensitive fields can be excluded from certain operations
4. **Maintainability**: Single source of truth for your data model
5. **API Design**: Clear contracts for each endpoint

## SQL Model Integration

`VariantSchema` works particularly well with database patterns. Here's how you might structure a SQL model:

```typescript
// src/examples/variant-schema-sql.ts
import { VariantSchema } from "@effect/experimental"
import { Schema } from "effect"

// Example 5: SQL Model Pattern (inspired by @effect/sql)
const { Class, Field, FieldOnly, FieldExcept } = VariantSchema.make({
  variants: ["select", "insert", "update", "json", "jsonCreate", "jsonUpdate"],
  defaultVariant: "select"
})

// Simulate some SQL Model utilities
const Generated = <S extends Schema.Schema.Any>(schema: S) =>
  Field({
    select: schema,
    update: schema,
    json: schema
  })

const Sensitive = <S extends Schema.Schema.Any>(schema: S) =>
  Field({
    select: schema,
    insert: schema,
    update: schema
  })

// User model following SQL Model pattern
class User extends Class<User>("User")({
  // Auto-generated ID
  id: Generated(Schema.Number.pipe(Schema.brand("UserId"))),
  
  // Basic user info
  email: Schema.String.pipe(Schema.pattern(/^\S+@\S+$/)),
  username: Schema.NonEmptyString,
  
  // Sensitive data - not exposed in JSON variants
  passwordHash: Sensitive(Schema.String),
  
  // Optional profile fields
  firstName: Schema.String.pipe(Schema.optional),
  lastName: Schema.String.pipe(Schema.optional),
  
  // JSON field - different representations
  preferences: Field({
    select: Schema.String, // Stored as JSON string in DB
    insert: Schema.String,
    update: Schema.String,
    json: Schema.Struct({
      theme: Schema.Literal("light", "dark"),
      notifications: Schema.Boolean,
      language: Schema.String
    }),
    jsonCreate: Schema.Struct({
      theme: Schema.Literal("light", "dark"),
      notifications: Schema.Boolean,
      language: Schema.String
    }),
    jsonUpdate: Schema.Struct({
      theme: Schema.Literal("light", "dark"),
      notifications: Schema.Boolean,
      language: Schema.String
    })
  })
}) {}
```

### SQL Model Benefits

1. **Database Operations**: Separate schemas for SELECT, INSERT, UPDATE
2. **JSON APIs**: Clean object representations for API responses
3. **Security**: Sensitive fields excluded from JSON variants
4. **Generated Fields**: Auto-managed fields like IDs and timestamps
5. **Data Transformation**: Handle different data formats (JSON strings vs objects)

## Best Practices

### 1. Choose Meaningful Variant Names

Use names that clearly indicate the purpose:
- `create`, `update`, `response` for CRUD operations
- `database`, `api`, `graphql` for different layers
- `public`, `private`, `admin` for different access levels

### 2. Keep Default Variant as Most Common Use Case

Set your most frequently used variant as the default:

```typescript
const { Class } = VariantSchema.make({
  variants: ["create", "update", "response"],
  defaultVariant: "response" // Most common use case
})
```

### 3. Use Field Helpers for Clarity

Prefer descriptive helpers over raw `Field` definitions:

```typescript
// Good
id: FieldExcept("create")(Schema.Number)
password: FieldOnly("database")(Schema.String)

// Less clear
id: Field({ update: Schema.Number, response: Schema.Number })
```

### 4. Group Related Variants

Keep related variants together:

```typescript
// Database operations
const { Class } = VariantSchema.make({
  variants: ["select", "insert", "update", "delete"],
  defaultVariant: "select"
})

// API operations  
const { Class } = VariantSchema.make({
  variants: ["create", "read", "update", "list"],
  defaultVariant: "read"
})
```

### 5. Document Variant Purposes

Add comments explaining when each variant is used:

```typescript
class User extends Class<User>("User")({
  // ID is auto-generated, not needed for creation
  id: FieldExcept("create")(Schema.Number),
  
  // Password only stored in database, never returned
  password: FieldOnly("database")(Schema.String),
  
  // Summary field only for list views (performance)
  summary: FieldOnly("list")(Schema.String)
}) {}
```

## Common Patterns

### 1. Progressive Disclosure

Start with basic variants and add complexity as needed:

```typescript
// Start simple
const { Class } = VariantSchema.make({
  variants: ["create", "response"],
  defaultVariant: "response"
})

// Add more variants later
const { Class } = VariantSchema.make({
  variants: ["create", "update", "response", "list", "admin"],
  defaultVariant: "response"
})
```

### 2. Layered Architecture

Use variants to represent different architectural layers:

```typescript
const { Class } = VariantSchema.make({
  variants: ["persistence", "domain", "api", "ui"],
  defaultVariant: "domain"
})
```

### 3. Access Control

Use variants to implement different access levels:

```typescript
const { Class } = VariantSchema.make({
  variants: ["guest", "user", "admin", "system"],
  defaultVariant: "user"
})
```

## Conclusion

`VariantSchema` is a powerful tool for managing complex data models in TypeScript applications. It provides:

- **Type Safety**: Compile-time guarantees for different data representations
- **Maintainability**: Single source of truth with multiple views
- **Performance**: Optimized schemas for different use cases
- **Security**: Built-in support for sensitive data handling
- **Flexibility**: Easy to add new variants as requirements evolve

By using `VariantSchema`, you can build robust applications that handle data consistently across different contexts while maintaining the flexibility to adapt to changing requirements.

Start with simple use cases and gradually adopt more advanced patterns as your application grows. The type system will guide you and catch errors early, making your code more reliable and maintainable.
