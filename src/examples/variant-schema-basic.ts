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
