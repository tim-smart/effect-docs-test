import * as Schema from "effect/Schema"
import * as VariantSchema from "@effect/experimental/VariantSchema"

// Create a variant schema system with mobile and desktop variants
const Responsive = VariantSchema.make({
  variants: ["mobile", "desktop"] as const,
  defaultVariant: "desktop",
})

// Define a basic component with different styles for each variant
const Button = Responsive.Struct({
  text: Schema.String,
  padding: Responsive.Field({
    mobile: Schema.Number,
    desktop: Schema.Number,
  }),
  fontSize: Responsive.Field({
    mobile: Schema.Number,
    desktop: Schema.Number,
  }),
})

// Extract the mobile variant
const MobileButton = Responsive.extract(Button, "mobile")

// Create a valid mobile button
const mobileButtonData = {
  text: "Click me",
  padding: 8,
  fontSize: 14,
}

// This should work for mobile
console.log(
  "Mobile button data is valid:",
  Schema.is(MobileButton)(mobileButtonData),
)

// Extract the desktop variant
const DesktopButton = Responsive.extract(Button, "desktop")

// Create a valid desktop button
const desktopButtonData = {
  text: "Click me",
  padding: 16,
  fontSize: 16,
}

// This should work for desktop
console.log(
  "Desktop button data is valid:",
  Schema.is(DesktopButton)(desktopButtonData),
)
