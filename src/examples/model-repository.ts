import { Model, SqlClient } from "@effect/sql"
import { Effect, Schema, Option, Brand } from "effect"

// Brand types for type safety
type UserId = number & Brand.Brand<"UserId">
type TaskId = number & Brand.Brand<"TaskId">

// Simple User model for repository example
export class User extends Model.Class<User>("User")({
  id: Model.Generated(Schema.Number.pipe(Schema.brand("UserId"))),
  email: Schema.String.pipe(Schema.pattern(/^\S+@\S+$/)),
  name: Schema.NonEmptyString,
  age: Schema.Number.pipe(Schema.int(), Schema.positive()),
  createdAt: Model.DateTimeInsert,
  updatedAt: Model.DateTimeUpdate,
}) {}

// Task model for data loaders example
export class Task extends Model.Class<Task>("Task")({
  id: Model.Generated(Schema.Number.pipe(Schema.brand("TaskId"))),
  title: Schema.NonEmptyString,
  description: Schema.String.pipe(Schema.optional),
  completed: Model.BooleanFromNumber,
  userId: Schema.Number.pipe(Schema.brand("UserId")),
  createdAt: Model.DateTimeInsert,
  updatedAt: Model.DateTimeUpdate,
}) {}

// Create a CRUD repository for User
export const makeUserRepository = () =>
  Model.makeRepository(User, {
    tableName: "users",
    idColumn: "id",
    spanPrefix: "UserRepository",
  })

// Create optimized data loaders for Task
export const makeTaskDataLoaders = () =>
  Model.makeDataLoaders(Task, {
    tableName: "tasks",
    idColumn: "id",
    spanPrefix: "TaskRepository",
    window: "10 millis", // Batch requests within 10ms
    maxBatchSize: 100,
  })

// Example service that uses the repository
export const makeUserService = Effect.gen(function* () {
  const repo = yield* makeUserRepository()

  const createUser = (userData: typeof User.insert.Type) =>
    repo
      .insert(userData)
      .pipe(Effect.tap((user) => Effect.log(`Created user: ${user.name}`)))

  const getUserById = (id: UserId) =>
    repo.findById(id).pipe(
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.fail(new Error(`User not found: ${id}`)),
          onSome: (user) => Effect.succeed(user),
        }),
      ),
    )

  const updateUser = (userData: typeof User.update.Type) =>
    repo
      .update(userData)
      .pipe(Effect.tap((user) => Effect.log(`Updated user: ${user.name}`)))

  const deleteUser = (id: UserId) =>
    repo.delete(id).pipe(Effect.tap(() => Effect.log(`Deleted user: ${id}`)))

  return {
    createUser,
    getUserById,
    updateUser,
    deleteUser,
  } as const
})

// Example service using data loaders for better performance
export const makeTaskService = Effect.gen(function* () {
  const loaders = yield* makeTaskDataLoaders()

  const createTask = (taskData: typeof Task.insert.Type) =>
    loaders
      .insert(taskData)
      .pipe(Effect.tap((task) => Effect.log(`Created task: ${task.title}`)))

  const getTaskById = (id: TaskId) =>
    loaders.findById(id).pipe(
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.fail(new Error(`Task not found: ${id}`)),
          onSome: (task) => Effect.succeed(task),
        }),
      ),
    )

  const deleteTask = (id: TaskId) =>
    loaders.delete(id).pipe(Effect.tap(() => Effect.log(`Deleted task: ${id}`)))

  return {
    createTask,
    getTaskById,
    deleteTask,
  } as const
})

// Example of using the service in a program
export const exampleProgram = Effect.gen(function* () {
  const userService = yield* makeUserService
  const taskService = yield* makeTaskService

  // Create a new user (timestamps auto-generated)
  const newUser = yield* userService.createUser({
    email: "john@example.com",
    name: "John Doe",
    age: 30,
    createdAt: undefined, // Auto-generated
    updatedAt: undefined, // Auto-generated
  })

  // Create a task for the user (timestamps auto-generated)
  const newTask = yield* taskService.createTask({
    title: "Learn Effect SQL",
    description: "Study the Model module documentation",
    completed: false, // BooleanFromNumber accepts boolean for type safety
    userId: newUser.id,
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

  return {
    user: updatedUser,
    task: newTask,
  }
})

console.log("=== Repository vs Data Loaders ===")
console.log("Repository: Direct SQL execution, simpler setup")
console.log(
  "Data Loaders: Batched requests, better performance for high-concurrency scenarios",
)

console.log("\n=== Model Benefits ===")
console.log("✓ Type-safe CRUD operations")
console.log("✓ Automatic SQL generation")
console.log("✓ Built-in request batching with data loaders")
console.log("✓ Observability with tracing spans")
console.log("✓ Different schemas for different operations")
