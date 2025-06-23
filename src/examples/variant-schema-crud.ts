import { VariantSchema } from "@effect/experimental"
import { Schema } from "effect"

// Example 4: Complete CRUD API with VariantSchema
const { Class, Field, FieldOnly, FieldExcept, fieldFromKey } =
  VariantSchema.make({
    variants: ["create", "update", "response", "list"],
    defaultVariant: "response",
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
    list: "status",
  })(Schema.Literal("todo", "in-progress", "done")),

  // Priority is optional for create
  priority: Field({
    create: Schema.Literal("low", "medium", "high").pipe(Schema.optional),
    update: Schema.Literal("low", "medium", "high"),
    response: Schema.Literal("low", "medium", "high"),
    list: Schema.Literal("low", "medium", "high"),
  }),

  // Assignee - can be set on create/update
  assigneeId: FieldExcept("list")(
    Schema.Number.pipe(Schema.brand("UserId"), Schema.optional),
  ),

  // Timestamps - auto-managed, different for list view
  createdAt: FieldOnly("response")(Schema.String),
  updatedAt: FieldOnly("response")(Schema.String),

  // For list view, we only show essential info
  summary: FieldOnly("list")(Schema.String),
}) {}

// Simulate CRUD operations
console.log("=== CRUD API Schemas ===")

// CREATE - What clients send to create a task
console.log("CREATE schema fields:", Object.keys(Task.create.fields))
const createTaskData = {
  title: "Implement user authentication",
  description: "Add JWT-based authentication system",
  initialStatus: "todo" as const,
  priority: "high" as const,
  assigneeId: 123,
}

// UPDATE - What clients send to update a task
console.log("UPDATE schema fields:", Object.keys(Task.update.fields))
const updateTaskData = {
  id: 1,
  title: "Implement user authentication (updated)",
  description: "Add JWT-based authentication with refresh tokens",
  status: "in-progress" as const,
  priority: "medium" as const,
  assigneeId: 456,
}

// RESPONSE - What API returns for single task
console.log("RESPONSE schema fields:", Object.keys(Task.fields))
const responseTaskData = {
  id: 1,
  title: "Implement user authentication",
  description: "Add JWT-based authentication system",
  status: "in-progress" as const,
  priority: "high" as const,
  assigneeId: 123,
  createdAt: "2024-01-01T10:00:00Z",
  updatedAt: "2024-01-01T15:30:00Z",
}

// LIST - What API returns for task lists (minimal data)
console.log("LIST schema fields:", Object.keys(Task.list.fields))
const listTaskData = {
  id: 1,
  status: "in-progress" as const,
  priority: "high" as const,
  summary: "Implement user authentication - In Progress",
}

// Demonstrate type safety
console.log("\n=== Type Safety Examples ===")
console.log("✓ Create task excludes ID and timestamps")
console.log("✓ Update task includes ID but excludes timestamps")
console.log("✓ Response includes all fields with timestamps")
console.log("✓ List view shows only essential summary data")
console.log("✓ Different field names: initialStatus vs status")

// Show schema validation capabilities
console.log("\n=== Schema Structure ===")
console.log(
  "Task.create has initialStatus field:",
  "initialStatus" in Task.create.fields,
)
console.log("Task.response has status field:", "status" in Task.fields)
console.log("Task.create excludes id:", !("id" in Task.create.fields))
console.log("Task.list has summary field:", "summary" in Task.list.fields)

export { Task, createTaskData, updateTaskData, responseTaskData, listTaskData }
