import { Model, SqlClient, SqlSchema } from "@effect/sql"
import { Effect, Schema, pipe, Option, Brand } from "effect"

// Brand types for type safety
type CategoryId = number & Brand.Brand<"CategoryId">
type ProductId = number & Brand.Brand<"ProductId">
type OrderId = number & Brand.Brand<"OrderId">
type CustomerId = number & Brand.Brand<"CustomerId">

// E-commerce domain models
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
      value: Schema.Union(Schema.String, Schema.Number, Schema.Boolean),
    }),
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
  status: Schema.Literal(
    "pending",
    "confirmed",
    "shipped",
    "delivered",
    "cancelled",
  ),
  paymentStatus: Schema.Literal("pending", "paid", "failed", "refunded"),
  fulfillmentStatus: Schema.Literal(
    "pending",
    "processing",
    "shipped",
    "delivered",
  ),

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
    }),
  ),
  billingAddress: Model.JsonFromString(
    Schema.Struct({
      street: Schema.String,
      city: Schema.String,
      state: Schema.String,
      postalCode: Schema.String,
      country: Schema.String,
    }),
  ),

  // Shipping tracking
  shippedAt: Model.FieldOption(Model.DateTimeFromDate),
  deliveredAt: Model.FieldOption(Model.DateTimeFromDate),

  // Timestamps
  createdAt: Model.DateTimeInsert,
  updatedAt: Model.DateTimeUpdate,
}) {}

// Repository setup
export const makeCategoryRepository = () =>
  Model.makeRepository(Category, {
    tableName: "categories",
    idColumn: "id",
    spanPrefix: "CategoryRepository",
  })

export const makeProductRepository = () =>
  Model.makeRepository(Product, {
    tableName: "products",
    idColumn: "id",
    spanPrefix: "ProductRepository",
  })

export const makeOrderRepository = () =>
  Model.makeRepository(Order, {
    tableName: "orders",
    idColumn: "id",
    spanPrefix: "OrderRepository",
  })

// E-commerce service layer
export const makeEcommerceService = Effect.gen(function* () {
  const categoryRepo = yield* makeCategoryRepository()
  const productRepo = yield* makeProductRepository()
  const orderRepo = yield* makeOrderRepository()
  const sql = yield* SqlClient.SqlClient

  // Category operations
  const createCategory = (data: typeof Category.insert.Type) =>
    categoryRepo.insert(data)

  const getActiveCategories = () =>
    sql<Array<typeof Category.Type>>`
      SELECT * FROM categories 
      WHERE is_active = 1 
      ORDER BY name
    `

  // Product operations with inventory checks
  const createProduct = (data: typeof Product.insert.Type) =>
    pipe(
      productRepo.insert(data),
      Effect.tap((product) =>
        Effect.log(`Created product: ${product.name} (ID: ${product.id})`),
      ),
    )

  const updateProductStock = (productId: ProductId, newQuantity: number) =>
    pipe(
      productRepo.findById(productId),
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.fail(new Error("Product not found")),
          onSome: (product) =>
            productRepo.update({
              ...product,
              stockQuantity: newQuantity,
              stockStatus:
                newQuantity === 0
                  ? "out_of_stock"
                  : newQuantity < 10
                    ? "low_stock"
                    : "in_stock",
              updatedAt: undefined, // Auto-updated
            }),
        }),
      ),
    )

  const getProductsByCategory = (categoryId: CategoryId) =>
    sql<Array<typeof Product.Type>>`
      SELECT * FROM products 
      WHERE category_id = ${categoryId}
      AND is_published = 1
      ORDER BY name
    `

  // Order operations
  const createOrder = (data: typeof Order.insert.Type) => orderRepo.insert(data)

  const updateOrderStatus = (
    orderId: OrderId,
    status: typeof Order.Type.status,
  ) =>
    orderRepo.findById(orderId).pipe(
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.fail(new Error("Order not found")),
          onSome: (order) =>
            orderRepo.update({
              ...order,
              status,
              updatedAt: undefined, // Auto-updated
            }),
        }),
      ),
    )

  const getOrdersByCustomer = (customerId: CustomerId) =>
    sql<Array<typeof Order.Type>>`
      SELECT * FROM orders 
      WHERE customer_id = ${customerId}
      ORDER BY created_at DESC
    `

  return {
    // Categories
    createCategory,
    getActiveCategories,

    // Products
    createProduct,
    updateProductStock,
    getProductsByCategory,

    // Orders
    createOrder,
    updateOrderStatus,
    getOrdersByCustomer,
  } as const
})

// Example usage with proper types
export const ecommerceExample = Effect.gen(function* () {
  const service = yield* makeEcommerceService

  // Create category (timestamps auto-generated)
  const category = yield* service.createCategory({
    name: "Electronics",
    slug: "electronics",
    description: "Electronic devices and accessories",
    parentId: Option.none(), // No parent category
    isActive: true,
    createdAt: undefined, // Auto-generated
    updatedAt: undefined, // Auto-generated
  })

  // Create product with complex data
  const product = yield* service.createProduct({
    name: "Wireless Headphones",
    description: "High-quality wireless headphones with noise cancellation",
    price: 299.99,
    categoryId: category.id,
    stockQuantity: 50,
    stockStatus: "in_stock",
    slug: "wireless-headphones",
    tags: ["audio", "wireless", "electronics"], // Stored as JSON
    specifications: {
      color: "Black",
      batteryLife: "20 hours",
      wireless: true,
      weight: 250,
    },
    internalSku: "WH-001-BLK",
    costPrice: 150.0,
    isPublished: true,
    isDigital: false,
    publishedAt: Option.none(), // No published date yet
    createdAt: undefined, // Auto-generated
    updatedAt: undefined, // Auto-generated
  })

  // Create order with address data
  const customerId = 123 as CustomerId
  const order = yield* service.createOrder({
    orderNumber: `ORD-${Date.now()}`,
    customerId,
    status: "pending",
    paymentStatus: "pending",
    fulfillmentStatus: "pending",
    subtotal: 299.99,
    taxAmount: 24.0,
    shippingAmount: 9.99,
    totalAmount: 333.98,
    shippingAddress: {
      street: "123 Main St",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      country: "USA",
    },
    billingAddress: {
      street: "123 Main St",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      country: "USA",
    },
    shippedAt: Option.none(),
    deliveredAt: Option.none(),
    createdAt: undefined, // Auto-generated
    updatedAt: undefined, // Auto-generated
  })

  return {
    category,
    product,
    order,
  }
})

console.log("=== E-commerce Model Features ===")
console.log("✓ Complex domain models with relationships")
console.log(
  "✓ JSON fields for structured data (tags, specifications, addresses)",
)
console.log("✓ Sensitive fields (internal SKU, cost price)")
console.log("✓ Boolean conversions for database compatibility")
console.log("✓ Optional fields with proper Option handling")
console.log("✓ Brand types for domain safety")
console.log("✓ Automatic timestamp management")
console.log("✓ Repository pattern with type safety")
console.log("✓ Service layer with business logic")
