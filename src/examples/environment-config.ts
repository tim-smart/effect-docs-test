import * as Schema from "effect/Schema"
import * as VariantSchema from "@effect/experimental/VariantSchema"

// Create a variant schema for different API environments
const Environment = VariantSchema.make({
  variants: ["development", "staging", "production"] as const,
  defaultVariant: "development"
})

// Define API configuration with environment-specific settings
const ApiConfig = Environment.Struct({
  baseUrl: Schema.String,
  timeout: Environment.Field({
    development: Schema.Number,
    staging: Schema.Number, 
    production: Schema.Number
  }),
  retries: Environment.FieldOnly("production", "staging")(Schema.Number),
  debug: Environment.FieldExcept("production")(Schema.Boolean),
  rateLimitPerMinute: Environment.Field({
    development: Schema.Number,
    staging: Schema.Number,
    production: Schema.Number
  })
})

// Extract specific environment schemas
const DevConfig = Environment.extract(ApiConfig, "development")
const StagingConfig = Environment.extract(ApiConfig, "staging") 
const ProductionConfig = Environment.extract(ApiConfig, "production")

// Valid development configuration (includes debug, no retries needed)
const devConfig = {
  baseUrl: "http://localhost:3000/api",
  timeout: 5000,
  debug: true,
  rateLimitPerMinute: 100
}

// Valid staging configuration (includes debug and retries)
const stagingConfig = {
  baseUrl: "https://staging-api.example.com",
  timeout: 10000,
  retries: 3,
  debug: true,
  rateLimitPerMinute: 500
}

// Valid production configuration (no debug, but has retries)
const productionConfig = {
  baseUrl: "https://api.example.com",
  timeout: 15000,
  retries: 5,
  rateLimitPerMinute: 1000
}

console.log("Development config valid:", Schema.is(DevConfig)(devConfig))
console.log("Staging config valid:", Schema.is(StagingConfig)(stagingConfig))
console.log("Production config valid:", Schema.is(ProductionConfig)(productionConfig))

// Demonstrate decoding/encoding
console.log("Decoded dev config:", Schema.decodeUnknownSync(DevConfig)(devConfig))
console.log("Decoded production config:", Schema.decodeUnknownSync(ProductionConfig)(productionConfig))
