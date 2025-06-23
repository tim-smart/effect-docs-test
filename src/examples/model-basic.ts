import { Model } from "@effect/sql"
import { Schema } from "effect"

// Basic User model with generated ID
export class User extends Model.Class<User>("User")({
  // Auto-generated ID - not needed for inserts
  id: Model.Generated(Schema.Number.pipe(Schema.brand("UserId"))),

  // Basic user information
  email: Schema.String.pipe(Schema.pattern(/^\S+@\S+$/)),
  name: Schema.NonEmptyString,

  // Password only for database operations, excluded from JSON
  passwordHash: Model.Sensitive(Schema.String),

  // Auto-managed timestamps
  createdAt: Model.DateTimeInsert,
  updatedAt: Model.DateTimeUpdate,
}) {}

// Example usage of different variants
console.log("=== User Model Variants ===")
console.log("SELECT fields:", Object.keys(User.fields))
console.log("INSERT fields:", Object.keys(User.insert.fields))
console.log("UPDATE fields:", Object.keys(User.update.fields))
console.log("JSON fields:", Object.keys(User.json.fields))

// Demonstrate field exclusions
console.log("\n=== Field Exclusions ===")
console.log("ID in select:", "id" in User.fields)
console.log("ID in insert:", "id" in User.insert.fields)
console.log("Password in json:", "passwordHash" in User.json.fields)
console.log("Password in select:", "passwordHash" in User.fields)

// Example data for different operations
export const insertUserData = {
  email: "alice@example.com",
  name: "Alice Smith",
  passwordHash: "$2b$10$hashedpassword",
  createdAt: "2024-01-01T10:00:00Z",
  updatedAt: "2024-01-01T10:00:00Z",
}

export const updateUserData = {
  id: 1,
  email: "alice.updated@example.com",
  name: "Alice Johnson",
  passwordHash: "$2b$10$newhashedpassword",
  updatedAt: "2024-01-01T15:30:00Z",
}

export const jsonUserData = {
  id: 1,
  email: "alice@example.com",
  name: "Alice Smith",
  createdAt: "2024-01-01T10:00:00Z",
  updatedAt: "2024-01-01T15:30:00Z",
}

console.log("\n=== Data Examples ===")
console.log("Insert data keys:", Object.keys(insertUserData))
console.log("Update data keys:", Object.keys(updateUserData))
console.log("JSON data keys:", Object.keys(jsonUserData))
