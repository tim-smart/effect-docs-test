import { VariantSchema } from "@effect/experimental"
import { Schema, DateTime } from "effect"

// Example 2: Using Classes with VariantSchema
const { Class, Field, FieldOnly, FieldExcept } = VariantSchema.make({
  variants: ["create", "update", "response"],
  defaultVariant: "response",
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
  updatedAt: FieldExcept("create")(Schema.String),
}) {}

// The variants are automatically available
console.log("Available Product variants:")
console.log("- Default (response):", Product.fields)
console.log("- Create variant:", Product.create.fields)
console.log("- Update variant:", Product.update.fields)

// Example data for each variant
const createProductData = {
  name: "Gaming Laptop",
  description: "High-performance gaming laptop",
  price: 1299.99,
}

const updateProductData = {
  id: 1,
  name: "Gaming Laptop Pro",
  description: "Updated high-performance gaming laptop",
  price: 1399.99,
  updatedAt: new Date().toISOString(),
}

const responseProductData = {
  id: 1,
  name: "Gaming Laptop Pro",
  description: "Updated high-performance gaming laptop",
  price: 1399.99,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Validate each variant
try {
  const createProduct = Schema.decodeUnknownSync(Product.create)(
    createProductData,
  )
  console.log("Create product validated:", createProduct)

  const updateProduct = Schema.decodeUnknownSync(Product.update)(
    updateProductData,
  )
  console.log("Update product validated:", updateProduct)

  const responseProduct = Schema.decodeUnknownSync(Product)(responseProductData)
  console.log("Response product validated:", responseProduct)
} catch (error) {
  console.error("Validation error:", error)
}
