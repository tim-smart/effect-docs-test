import { VariantSchema } from "@effect/experimental"
import { Schema } from "effect"

// Example 5: SQL Model Pattern (inspired by @effect/sql)
const { Class, Field, FieldOnly, FieldExcept } = VariantSchema.make({
  variants: ["select", "insert", "update", "json", "jsonCreate", "jsonUpdate"],
  defaultVariant: "select",
})

// Simulate some SQL Model utilities
const Generated = <S extends Schema.Schema.Any>(schema: S) =>
  Field({
    select: schema,
    update: schema,
    json: schema,
  })

const Sensitive = <S extends Schema.Schema.Any>(schema: S) =>
  Field({
    select: schema,
    insert: schema,
    update: schema,
  })

const DateTimeInsert = Field({
  select: Schema.String,
  insert: Schema.String, // Would be auto-generated in real implementation
  json: Schema.String,
})

const DateTimeUpdate = Field({
  select: Schema.String,
  insert: Schema.String,
  update: Schema.String, // Would be auto-updated in real implementation
  json: Schema.String,
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
      language: Schema.String,
    }),
    jsonCreate: Schema.Struct({
      theme: Schema.Literal("light", "dark"),
      notifications: Schema.Boolean,
      language: Schema.String,
    }),
    jsonUpdate: Schema.Struct({
      theme: Schema.Literal("light", "dark"),
      notifications: Schema.Boolean,
      language: Schema.String,
    }),
  }),

  // Auto-managed timestamps
  createdAt: DateTimeInsert,
  updatedAt: DateTimeUpdate,
}) {}

// Demonstrate the different variants
console.log("=== SQL Model Variants ===")

// Database operations
console.log("SELECT fields:", Object.keys(User.fields))
console.log("INSERT fields:", Object.keys(User.insert.fields))
console.log("UPDATE fields:", Object.keys(User.update.fields))

// JSON API operations
console.log("JSON fields:", Object.keys(User.json.fields))
console.log("JSON CREATE fields:", Object.keys(User.jsonCreate.fields))
console.log("JSON UPDATE fields:", Object.keys(User.jsonUpdate.fields))

// Show security features
console.log("\n=== Security Features ===")
console.log("Password in select:", "passwordHash" in User.fields)
console.log("Password in json:", "passwordHash" in User.json.fields)
console.log("Password in insert:", "passwordHash" in User.insert.fields)

// Show generated fields
console.log("\n=== Generated Fields ===")
console.log("ID in select:", "id" in User.fields)
console.log("ID in insert:", "id" in User.insert.fields)
console.log("CreatedAt in insert:", "createdAt" in User.insert.fields)
console.log("UpdatedAt in update:", "updatedAt" in User.update.fields)

// Example data for different operations
const insertUserData = {
  email: "alice@example.com",
  username: "alice123",
  passwordHash: "$2b$10$hashedpassword",
  firstName: "Alice",
  preferences: JSON.stringify({
    theme: "dark",
    notifications: true,
    language: "en",
  }),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const jsonCreateUserData = {
  email: "alice@example.com",
  username: "alice123",
  firstName: "Alice",
  preferences: {
    theme: "dark" as const,
    notifications: true,
    language: "en",
  },
}

console.log("\n=== Usage Examples ===")
console.log("Database insert data:", Object.keys(insertUserData))
console.log("JSON API create data:", Object.keys(jsonCreateUserData))
console.log(
  "Password handling: Included in DB operations, excluded from JSON APIs",
)

export { User, insertUserData, jsonCreateUserData }
