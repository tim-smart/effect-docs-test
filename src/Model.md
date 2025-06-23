# Model Module Guide

The `Model` module from `@effect/sql` provides a powerful abstraction for creating type-safe domain models with automatic schema generation for different contexts (database operations, JSON APIs, etc.).

## The Problem

When building applications with SQL databases, you often need to handle the same data in different contexts:

- **Database operations**: Raw SQL with specific column types, nullable fields, and database-specific constraints
- **API responses**: Clean JSON without sensitive fields, with proper TypeScript types
- **Business logic**: Domain objects with validation, transformations, and computed properties

Traditional approaches require manually maintaining separate schemas, leading to:
- Type safety issues between database and application layers
- Boilerplate code for CRUD operations
- Inconsistent data validation across contexts
- Manual SQL query writing

## The Solution

The Model module solves these problems by providing:

1. **Single source of truth**: Define your domain model once
2. **Automatic schema generation**: Different schemas for select, insert, update, and JSON operations
3. **Type-safe CRUD**: Repositories with automatic SQL generation
4. **Field transformations**: Built-in support for JSON fields, timestamps, sensitive data, etc.
5. **Request batching**: Data loaders for high-performance applications

## Basic Usage

Let's start with a simple user model:

```typescript
// From: src/examples/model-basic.ts
import { Model } from "@effect/sql"
import { Schema, Brand } from "effect"

// Brand types for domain safety
type UserId = number & Brand.Brand<"UserId">
type BlogPostId = number & Brand.Brand<"BlogPostId">

// Simple User model with basic fields
export class User extends Model.Class<User>("User")({
  id: Model.Generated(Schema.Number.pipe(Schema.brand("UserId"))),
  email: Schema.String.pipe(Schema.pattern(/^\S+@\S+$/)),
  name: Schema.NonEmptyString,
  age: Schema.Number.pipe(Schema.int(), Schema.positive()),
  createdAt: Model.DateTimeInsert,
  updatedAt: Model.DateTimeUpdate,
}) {}

// Blog post with tags and user relationship
export class BlogPost extends Model.Class<BlogPost>("BlogPost")({
  id: Model.Generated(Schema.Number.pipe(Schema.brand("BlogPostId"))),
  title: Schema.NonEmptyString,
  content: Schema.String,
  published: Schema.Boolean,
  authorId: Schema.Number.pipe(Schema.brand("UserId")),
  tags: Model.JsonFromString(Schema.Array(Schema.String)),
  metadata: Model.JsonFromString(
    Schema.Struct({
      viewCount: Schema.Number,
      featured: Schema.Boolean,
      summary: Schema.String.pipe(Schema.optional),
    })
  ),
  createdAt: Model.DateTimeInsert,
  updatedAt: Model.DateTimeUpdate,
}) {}

// Using the models
console.log("User select schema:", User.fields)
console.log("User insert schema:", User.insert.fields) 
console.log("User JSON schema:", User.json.fields)
```

### Key Features Demonstrated

1. **Generated fields**: The `id` field is automatically handled by the database
2. **Branded types**: `UserId` provides type safety across your domain
3. **Automatic timestamps**: `createdAt` and `updatedAt` are managed automatically
4. **JSON fields**: Complex data structures stored as JSON in the database
5. **Schema variants**: Different field sets for different operations

### Understanding Schema Variants

Each Model class automatically generates several schema variants:

```typescript
// Available schemas for User model:
User           // Full schema (for database SELECT operations)
User.insert    // Insert schema (excludes auto-generated fields)
User.update    // Update schema (excludes auto-generated fields) 
User.json      // JSON schema (excludes sensitive fields)

// Type examples:
type FullUser = typeof User.Type           // Has id, createdAt, updatedAt
type InsertUser = typeof User.insert.Type  // No id, createdAt, updatedAt
type UpdateUser = typeof User.update.Type  // Has id, no createdAt, new updatedAt
type JsonUser = typeof User.json.Type      // Public fields only
```

These variants ensure you always use the right schema for each operation, preventing common errors like trying to insert auto-generated fields.

## Advanced Field Types

The Model module provides specialized field types for common patterns:

```typescript
// From: src/examples/model-advanced.ts
export class AdvancedUser extends Model.Class<AdvancedUser>("AdvancedUser")({
  id: Model.Generated(Schema.Number.pipe(Schema.brand("UserId"))),
  
  // Basic fields with validation
  email: Schema.String.pipe(Schema.pattern(/^\S+@\S+$/)),
  username: Schema.String.pipe(Schema.minLength(3), Schema.maxLength(50)),
  
  // Sensitive data (excluded from JSON APIs)
  passwordHash: Model.Sensitive(Schema.String),
  ssn: Model.Sensitive(Schema.String.pipe(Schema.optional)),
  
  // Optional fields with proper handling
  profileImage: Model.FieldOption(Schema.String),
  bio: Schema.String.pipe(Schema.optional),
  
  // JSON fields for complex data
  preferences: Model.JsonFromString(
    Schema.Struct({
      theme: Schema.Literal("light", "dark"),
      notifications: Schema.Boolean,
      language: Schema.String,
    })
  ),
  
  // Database boolean conversion (0/1 <-> true/false)
  isActive: Model.BooleanFromNumber,
  isVerified: Model.BooleanFromNumber,
  
  // Automatic timestamps
  createdAt: Model.DateTimeInsert,
  updatedAt: Model.DateTimeUpdate,
  lastLoginAt: Model.FieldOption(Model.DateTimeFromDate),
}) {}

// Product with field name mapping and advanced features
export class Product extends Model.Class<Product>("Product")({
  id: Model.Generated(Schema.Number.pipe(Schema.brand("ProductId"))),
  name: Schema.NonEmptyString,
  
  // Custom field mapping (database column vs. property name)
  price: Schema.Number.pipe(Schema.positive()),
  
  // Multiple JSON field types
  specifications: Model.JsonFromString(
    Schema.Record({
      key: Schema.String,
      value: Schema.Union(Schema.String, Schema.Number, Schema.Boolean)
    })
  ),
  categories: Model.JsonFromString(Schema.Array(Schema.String)),
  
  // Application-generated fields (not database-generated)
  sku: Model.GeneratedByApp(Schema.String),
  
  // Sensitive business data
  costPrice: Model.Sensitive(Schema.Number.pipe(Schema.positive())),
  supplierInfo: Model.Sensitive(
    Model.JsonFromString(
      Schema.Struct({
        name: Schema.String,
        contact: Schema.String,
      })
    )
  ),
  
  // Status tracking
  isActive: Model.BooleanFromNumber,
  createdAt: Model.DateTimeInsert,
  updatedAt: Model.DateTimeUpdate,
}) {}
```

### Field Type Reference

- **`Model.Generated`**: Database-generated fields (auto-increment IDs)
- **`Model.GeneratedByApp`**: Application-generated fields (UUIDs, SKUs)
- **`Model.Sensitive`**: Fields excluded from JSON schemas (passwords, API keys)
- **`Model.FieldOption`**: Optional fields with proper null handling
- **`Model.JsonFromString`**: Complex objects stored as JSON strings
- **`Model.BooleanFromNumber`**: Database boolean compatibility (0/1)
- **`Model.DateTimeInsert`**: Auto-generated creation timestamps
- **`Model.DateTimeUpdate`**: Auto-updated modification timestamps

## Repository Pattern

The Model module automatically generates type-safe repositories:

```typescript
// From: src/examples/model-repository.ts
import { Model, SqlClient } from "@effect/sql"
import { Effect, Schema, Option, Brand } from "effect"

// Create a CRUD repository for User
export const makeUserRepository = () =>
  Model.makeRepository(User, {
    tableName: "users",
    idColumn: "id",
    spanPrefix: "UserRepository",
  })

// Service layer with business logic
export const makeUserService = Effect.gen(function* () {
  const repo = yield* makeUserRepository()
  
  const createUser = (userData: typeof User.insert.Type) =>
    repo.insert(userData).pipe(
      Effect.tap((user) => Effect.log(`Created user: ${user.name}`))
    )
  
  const getUserById = (id: UserId) =>
    repo.findById(id).pipe(
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.fail(new Error(`User not found: ${id}`)),
          onSome: (user) => Effect.succeed(user),
        })
      )
    )
  
  const updateUser = (userData: typeof User.update.Type) =>
    repo.update(userData).pipe(
      Effect.tap((user) => Effect.log(`Updated user: ${user.name}`))
    )
  
  const deleteUser = (id: UserId) =>
    repo.delete(id).pipe(
      Effect.tap(() => Effect.log(`Deleted user: ${id}`))
    )
  
  return {
    createUser,
    getUserById,
    updateUser,
    deleteUser,
  } as const
})

// Example usage
export const exampleProgram = Effect.gen(function* () {
  const userService = yield* makeUserService
  
  // Create a new user (timestamps auto-generated)
  const newUser = yield* userService.createUser({
    email: "john@example.com",
    name: "John Doe",
    age: 30,
    createdAt: undefined, // Auto-generated
    updatedAt: undefined, // Auto-generated
  })
  
  // Update the user (updatedAt auto-generated)
  const updatedUser = yield* userService.updateUser({
    id: newUser.id,
    email: "john.updated@example.com",
    name: "John Updated",
    age: 31,
    updatedAt: undefined, // Auto-generated
  })
  
  return { user: updatedUser }
})
```

### Repository Features

- **Type-safe operations**: All CRUD methods use the correct schema types
- **Automatic SQL generation**: No manual query writing required
- **Tracing integration**: Built-in observability with span prefixes
- **Error handling**: Proper Effect error management
- **Batch operations**: Support for bulk inserts and updates

### Update Patterns and Best Practices

When updating models, use the spread pattern for full object updates:

```typescript
// ✅ Recommended: Spread pattern for updates
const updateUser = (userData: typeof User.update.Type) =>
  repo.update({
    ...existingUser,
    ...userData,
    updatedAt: undefined, // Auto-generated
  })

// ✅ Also valid: Direct field assignment
const updateUserDirect = (id: UserId, changes: Partial<typeof User.update.Type>) =>
  repo.update({
    id,
    ...changes,
    updatedAt: undefined,
  })
```

The Model system automatically handles:
- **Generated field exclusion**: Can't accidentally include auto-generated fields in updates
- **Timestamp management**: `updatedAt` is automatically set when undefined
- **Type safety**: TypeScript ensures all required fields are present

## Real-World Example: E-commerce Domain

Here's a complete e-commerce domain showing advanced Model features:

```typescript
// From: src/examples/model-ecommerce.ts
import { Model, SqlClient } from "@effect/sql"
import { Effect, Schema, pipe, Option, Brand } from "effect"

// Domain models for e-commerce
export class Category extends Model.Class<Category>("Category")({
  id: Model.Generated(Schema.Number.pipe(Schema.brand("CategoryId"))),
  name: Schema.NonEmptyString,
  slug: Schema.String,
  description: Schema.String.pipe(Schema.optional),
  parentId: Model.FieldOption(Schema.Number.pipe(Schema.brand("CategoryId"))),
  isActive: Model.BooleanFromNumber,
  createdAt: Model.DateTimeInsert,
  updatedAt: Model.DateTimeUpdate,
}) {}

export class Product extends Model.Class<Product>("Product")({
  id: Model.Generated(Schema.Number.pipe(Schema.brand("ProductId"))),
  name: Schema.NonEmptyString,
  description: Schema.String,
  price: Schema.Number.pipe(Schema.positive()),
  categoryId: Schema.Number.pipe(Schema.brand("CategoryId")),
  
  // Inventory tracking
  stockQuantity: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  stockStatus: Schema.Literal("in_stock", "low_stock", "out_of_stock"),
  
  // SEO and metadata
  slug: Schema.String,
  tags: Model.JsonFromString(Schema.Array(Schema.String)),
  specifications: Model.JsonFromString(
    Schema.Record({
      key: Schema.String,
      value: Schema.Union(Schema.String, Schema.Number, Schema.Boolean)
    })
  ),
  
  // Internal fields (excluded from JSON)
  internalSku: Model.Sensitive(Schema.String),
  costPrice: Model.Sensitive(Schema.Number.pipe(Schema.positive())),
  
  // Publishing
  isPublished: Model.BooleanFromNumber,
  isDigital: Model.BooleanFromNumber,
  publishedAt: Model.FieldOption(Model.DateTimeFromDate),
  
  // Timestamps
  createdAt: Model.DateTimeInsert,
  updatedAt: Model.DateTimeUpdate,
}) {}

export class Order extends Model.Class<Order>("Order")({
  id: Model.Generated(Schema.Number.pipe(Schema.brand("OrderId"))),
  orderNumber: Model.GeneratedByApp(Schema.String),
  customerId: Schema.Number.pipe(Schema.brand("CustomerId")),
  
  // Order status
  status: Schema.Literal("pending", "confirmed", "shipped", "delivered", "cancelled"),
  paymentStatus: Schema.Literal("pending", "paid", "failed", "refunded"),
  fulfillmentStatus: Schema.Literal("pending", "processing", "shipped", "delivered"),
  
  // Amounts
  subtotal: Schema.Number.pipe(Schema.positive()),
  taxAmount: Schema.Number.pipe(Schema.nonNegative()),
  shippingAmount: Schema.Number.pipe(Schema.nonNegative()),
  totalAmount: Schema.Number.pipe(Schema.positive()),
  
  // Addresses (stored as JSON)
  shippingAddress: Model.JsonFromString(
    Schema.Struct({
      street: Schema.String,
      city: Schema.String,
      state: Schema.String,
      postalCode: Schema.String,
      country: Schema.String,
    })
  ),
  billingAddress: Model.JsonFromString(
    Schema.Struct({
      street: Schema.String,
      city: Schema.String,
      state: Schema.String,
      postalCode: Schema.String,
      country: Schema.String,
    })
  ),
  
  // Shipping tracking
  shippedAt: Model.FieldOption(Model.DateTimeFromDate),
  deliveredAt: Model.FieldOption(Model.DateTimeFromDate),
  
  // Timestamps
  createdAt: Model.DateTimeInsert,
  updatedAt: Model.DateTimeUpdate,
}) {}

// Service layer with business logic
export const makeEcommerceService = Effect.gen(function* () {
  const categoryRepo = yield* makeCategoryRepository()
  const productRepo = yield* makeProductRepository()
  const orderRepo = yield* makeOrderRepository()
  const sql = yield* SqlClient.SqlClient
  
  // Product operations with inventory checks
  const updateProductStock = (productId: ProductId, newQuantity: number) =>
    pipe(
      productRepo.findById(productId),
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.fail(new Error("Product not found")),
          onSome: (product) =>
            productRepo.update({
              ...product, // Spread existing fields
              stockQuantity: newQuantity,
              stockStatus: newQuantity === 0 ? "out_of_stock" 
                : newQuantity < 10 ? "low_stock" 
                : "in_stock",
              updatedAt: undefined, // Auto-updated
            })
        })
      )
    )
  
  const getProductsByCategory = (categoryId: CategoryId) =>
    sql<Array<typeof Product.Type>>`
      SELECT * FROM products 
      WHERE category_id = ${categoryId}
      AND is_published = 1
      ORDER BY name
    `
  
  return {
    updateProductStock,
    getProductsByCategory,
    // ... other operations
  } as const
})
```

### Advanced Features Demonstrated

1. **Hierarchical relationships**: Categories with parent/child relationships
2. **Complex JSON fields**: Product specifications, order addresses
3. **Business logic integration**: Stock status calculation, inventory management
4. **Sensitive field handling**: Internal SKUs and cost prices excluded from APIs
5. **Multiple status enums**: Order status, payment status, fulfillment status
6. **Mixed SQL and repository patterns**: Custom queries alongside generated CRUD

## Data Loaders for Performance

For high-performance applications, use data loaders to batch requests and prevent N+1 query problems:

```typescript
import { SqlResolver } from "@effect/sql"
import { Schema, Effect, RequestResolver } from "effect"

// Define request types for batching
export class GetUserById extends Schema.TaggedRequest<GetUserById>()(
  "GetUserById",
  {
    failure: Schema.String,
    success: User,
    payload: { id: Schema.Number.pipe(Schema.brand("UserId")) }
  }
) {}

// Create batched resolver
export const UserLoader = RequestResolver.makeBatched(
  (requests: readonly GetUserById[]) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const ids = requests.map(req => req.id)
      
      // Single query for all requested users
      const users = yield* sql<Array<typeof User.Type>>`
        SELECT * FROM users WHERE id IN ${sql.in(ids)}
      `
      
      // Map results back to requests
      return requests.map(request => {
        const user = users.find(u => u.id === request.id)
        return user 
          ? RequestResolver.succeed(user)
          : RequestResolver.fail("User not found")
      })
    })
)

// Usage in your service
export const makeUserServiceWithLoader = Effect.gen(function* () {
  const getUser = (id: UserId) =>
    Effect.request(new GetUserById({ id }), UserLoader)
  
  // This will automatically batch multiple requests
  const getUsersForDashboard = (userIds: UserId[]) =>
    Effect.all(userIds.map(getUser)) // Batched into single query!
  
  return { getUser, getUsersForDashboard }
})
```

### Performance Benefits

Data loaders provide several key benefits:

1. **Request batching**: Multiple individual requests are batched into single queries
2. **Caching**: Results are cached within a single request context
3. **Deduplication**: Identical requests are deduplicated automatically
4. **N+1 prevention**: Eliminates the classic N+1 query problem

### When to Use Data Loaders

Use data loaders when you have:
- GraphQL APIs with nested resolvers
- Dashboard queries that load related data
- Report generation that aggregates multiple entities
- Any scenario where you might load the same data multiple times

## Best Practices

### 1. Use Brand Types for Domain Safety
Always use branded types for IDs to prevent mixing different entity IDs:

```typescript
type UserId = number & Brand.Brand<"UserId">
type ProductId = number & Brand.Brand<"ProductId">

// This prevents errors like:
// const user = await getUserById(productId) // ❌ Type error!
```

### 2. Leverage Automatic Timestamps
Let the Model handle timestamps automatically:

```typescript
// ✅ Good - automatic timestamp management
createdAt: Model.DateTimeInsert,   // Set once on creation
updatedAt: Model.DateTimeUpdate,   // Updated on every modification

// ❌ Avoid manual timestamp management
```

### 3. Choose the Right Field Types
Use the appropriate Model field type for your use case:

```typescript
// Database-generated values
id: Model.Generated(Schema.Number),

// Application-generated values (UUIDs, SKUs)
sku: Model.GeneratedByApp(Schema.String),

// Sensitive data (excluded from JSON APIs)
passwordHash: Model.Sensitive(Schema.String),

// Optional with proper null handling
profileImage: Model.FieldOption(Schema.String),

// Complex data as JSON
preferences: Model.JsonFromString(PreferencesSchema),
```

### 4. Organize Complex JSON Fields
Use structured schemas for JSON fields:

```typescript
// ✅ Good - structured data with validation
specifications: Model.JsonFromString(
  Schema.Record({
    key: Schema.String,
    value: Schema.Union(Schema.String, Schema.Number, Schema.Boolean)
  })
),

// ❌ Avoid - unstructured JSON
data: Model.JsonFromString(Schema.Unknown)
```

### 5. Handle Updates Correctly
Use the spread pattern for safe updates:

```typescript
// ✅ Recommended update pattern
const updateUser = (updates: Partial<typeof User.update.Type>) =>
  repo.update({
    id: userId,
    ...updates,
    updatedAt: undefined, // Auto-generated
  })

// ✅ Also valid for full updates
const replaceUser = (userData: typeof User.update.Type) =>
  repo.update(userData) // All fields provided
```

### 6. Design for Different Contexts
Consider how your model will be used across different contexts:

```typescript
// The model automatically generates appropriate schemas:
User          // Database operations (all fields)
User.insert   // Creation (no auto-generated fields)
User.update   // Updates (excludes creation-only fields)
User.json     // API responses (no sensitive fields)
```

## Schema Variants

Each Model class provides multiple schema variants:

- **`Model`**: Complete schema for database selection
- **`Model.insert`**: Schema for database insertion (excludes generated fields)
- **`Model.update`**: Schema for database updates (excludes generated fields)
- **`Model.json`**: Schema for JSON APIs (excludes sensitive fields)
- **`Model.jsonCreate`**: Schema for JSON creation APIs
- **`Model.jsonUpdate`**: Schema for JSON update APIs

## Integration with Effect Ecosystem

The Model module integrates seamlessly with the broader Effect ecosystem:

- **Effect**: All operations return Effect types for composable error handling
- **Schema**: Full Schema validation and transformation support
- **SqlClient**: Automatic SQL generation and execution
- **Tracing**: Built-in observability and debugging support
- **Option**: Proper handling of optional/nullable values

## Common Patterns and Troubleshooting

### Pattern: Conditional Updates
```typescript
const updateUserConditionally = (id: UserId, updates: Partial<typeof User.update.Type>) =>
  pipe(
    repo.findById(id),
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.fail(new Error("User not found")),
        onSome: (user) =>
          repo.update({
            ...user,
            ...updates,
            updatedAt: undefined, // Auto-generated
          })
      })
    )
  )
```

### Pattern: Batch Operations
```typescript
const createManyUsers = (userData: Array<typeof User.insert.Type>) =>
  Effect.all(userData.map(repo.insert))

// Or use SQL directly for better performance
const bulkInsertUsers = (userData: Array<typeof User.insert.Type>) =>
  sql`INSERT INTO users ${sql.insert(userData)}`
```

### Troubleshooting: Type Errors

**Problem**: TypeScript errors when updating models
```typescript
// ❌ Error: Property 'id' is missing
repo.update({ name: "New Name" })
```

**Solution**: Always include the ID for updates
```typescript
// ✅ Correct
repo.update({ id: userId, name: "New Name", updatedAt: undefined })
```

**Problem**: Trying to insert generated fields
```typescript
// ❌ Error: 'id' should not be provided
repo.insert({ id: 1, name: "User", createdAt: new Date() })
```

**Solution**: Use the insert schema type
```typescript
// ✅ Correct
const newUser: typeof User.insert.Type = {
  name: "User",
  email: "user@example.com",
  age: 30,
  createdAt: undefined, // Auto-generated
  updatedAt: undefined, // Auto-generated
}
repo.insert(newUser)
```

## Summary

The Model module provides:

✅ **Type Safety**: End-to-end type safety from database to API  
✅ **Automatic SQL**: Generated CRUD operations with no boilerplate  
✅ **Schema Variants**: Different schemas for different contexts  
✅ **Field Transformations**: JSON, timestamps, sensitive data handling  
✅ **Performance**: Request batching with data loaders  
✅ **Observability**: Built-in tracing and error handling  
✅ **Composability**: Full integration with Effect ecosystem  

This makes the Model module ideal for building robust, type-safe applications with SQL databases while maintaining clean separation between database concerns and business logic.
