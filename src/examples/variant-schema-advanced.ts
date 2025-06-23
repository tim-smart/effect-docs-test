import { VariantSchema } from "@effect/experimental"
import { Schema } from "effect"

// Example 3: Advanced Field Evolution and Real-world Use Case
const { Struct, Field, fieldEvolve, fieldFromKey, FieldOnly, extract } =
  VariantSchema.make({
    variants: ["database", "api", "graphql"],
    defaultVariant: "api",
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
    graphql: "displayName", // Different name for GraphQL
  })(Schema.String),

  // Created timestamp with different formats
  createdAt: Field({
    database: Schema.Number, // Unix timestamp in database
    api: Schema.String, // ISO string for API
    graphql: Schema.String, // ISO string for GraphQL
  }),

  // Profile that's nested differently
  profile: Field({
    database: Schema.String, // JSON string in database
    api: Schema.Struct({
      bio: Schema.String,
      avatar: Schema.String,
    }),
    graphql: Schema.Struct({
      biography: Schema.String,
      profilePicture: Schema.String,
    }),
  }),
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

// Example data for each variant
const databaseUser = {
  id: 1,
  email: "john.doe@example.com",
  passwordHash: "$2b$10$...",
  full_name: "John Doe",
  createdAt: 1640995200,
  profile: JSON.stringify({ bio: "Software developer", avatar: "avatar.jpg" }),
}

const apiUser = {
  id: 1,
  email: "john.doe@example.com",
  fullName: "John Doe",
  createdAt: "2022-01-01T00:00:00Z",
  profile: {
    bio: "Software developer",
    avatar: "avatar.jpg",
  },
}

const graphqlUser = {
  id: 1,
  email: "john.doe@example.com",
  displayName: "John Doe",
  createdAt: "2022-01-01T00:00:00Z",
  profile: {
    biography: "Software developer",
    profilePicture: "avatar.jpg",
  },
}

// Show field differences
console.log("\n=== Field Analysis ===")
console.log("Database uses snake_case:", "full_name" in DatabaseUser.fields)
console.log("API uses camelCase:", "fullName" in ApiUser.fields)
console.log("GraphQL uses displayName:", "displayName" in GraphqlUser.fields)
console.log(
  "Only database has password:",
  "passwordHash" in DatabaseUser.fields,
)
console.log("API profile is nested object:", typeof ApiUser.fields.profile)
console.log("GraphQL profile has different field names")

export { UserModel, DatabaseUser, ApiUser, GraphqlUser }
