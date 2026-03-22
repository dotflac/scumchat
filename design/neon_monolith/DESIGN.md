# Design System Specification: Terminal Editorial

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Architect"**

This design system rejects the "friendly" softness of modern SaaS in favor of a high-end, structural aesthetic. It is an intersection of a professional Terminal User Interface (TUI) and a Swiss-style editorial layout. We are moving away from the "floating card" meta and toward a philosophy of **Monolithic Layouts**. 

The goal is to create a digital experience that feels like a custom-engineered instrument. By utilizing a rigid 0px radius across all components and a dense typography scale, we signal precision and technical authority. We break the "template" look by using intentional asymmetry—heavy left-aligned headers contrasted with expansive, negative-space-driven data visualizations.

## 2. Colors & Surface Philosophy
The palette is a sophisticated evolution of "Tokyo Night" and "Catppuccin," emphasizing deep charcoal foundations and ethereal pastel accents.

### The "No-Line" Rule
Standard 1px solid borders are strictly prohibited for sectioning. Structural boundaries must be defined solely through background color shifts or tonal transitions. To separate a sidebar from a main content area, use `surface-container-low` (#11121f) against the primary `surface` (#0c0d18). 

### Surface Hierarchy & Nesting
Treat the UI as a series of recessed or extruded monolithic blocks. 
- **The Base:** `surface` (#0c0d18)
- **Nested Content:** Use `surface-container` (#171827) for the first level of containment. 
- **Interactive Elements:** Use `surface-bright` (#282a41) for elements that require immediate user focus.
- **Deepest Recess:** Use `surface-container-lowest` (#000000) for code blocks or terminal inputs to create a "void" effect.

### Glass & Gradient Accents
While the aesthetic is flat, we introduce "Visual Soul" through subtle gradients. Main CTAs should transition from `primary` (#cdb1ff) to `primary-container` (#c1a0fe) at a 135-degree angle. Floating overlays (modals/tooltips) should utilize a `surface-container-high` (#1c1e30) with a 12px backdrop-blur to allow underlying pastel accents to bleed through the dark workspace.

## 3. Typography
We utilize **Space Grotesk** for its unique blend of geometric precision and "tech" personality. To achieve the TUI feel, we employ **Tight Tracking** (-0.02em to -0.05em) across all headings.

- **Display (Large/Mid):** Used for data-heavy hero moments. Set in `on-background` (#e3e3ff) with -0.05em tracking.
- **Headline (Small/Mid):** The structural backbone. Use `primary` (#cdb1ff) for section headers to provide a clear navigational anchor.
- **Body:** All body text defaults to `on-surface-variant` (#a8a9c3) to reduce eye strain, reserving `on-surface` (#e3e3ff) for active or bolded text.
- **Label (Small/Mid):** Monospaced-inspired sizing for metadata. Always uppercase with +0.05em tracking to differentiate from body copy.

## 4. Elevation & Depth
In this system, depth is a function of **Luminance**, not shadows.

### The Layering Principle
Since we have a 0px border-radius and no shadows, hierarchy is achieved by "stacking" tones. 
- **Example:** Place a `surface-container-highest` (#222438) header on top of a `surface-container-low` (#11121f) body. The contrast in value provides the "lift."

### The "Ghost Border" Fallback
If technical constraints require a border for accessibility (e.g., input fields), use a "Ghost Border": the `outline-variant` (#44465c) at 20% opacity. Never use 100% opaque borders for decorative purposes.

### Glassmorphism & Depth
For floating command palettes or dropdowns, use:
- **Background:** `surface-container-highest` (#222438) at 85% opacity.
- **Backdrop-filter:** `blur(10px)`.
- **Border:** 1px solid `outline-variant` (#44465c) at 30% opacity.

## 5. Components

### Buttons
- **Primary:** Background `primary` (#cdb1ff), Text `on-primary` (#47277d). Rectangular (0px radius).
- **Secondary:** Background `secondary-container` (#002357), Text `on-secondary-container` (#7ba3f8).
- **Tertiary:** No background. Text `primary`. Underline on hover using a 2px `primary` stroke.

### Input Fields
- **Default:** Background `surface-container-lowest` (#000000), Border `outline-variant` (#44465c).
- **Focus:** Border becomes `secondary` (#aec6ff). No glow/shadow.
- **Error:** Border `error` (#fd6f85), Text `error`.

### Cards & Lists
- **Prohibition:** No divider lines between list items. Use `spacing.4` (0.9rem) of vertical white space to separate items.
- **Selection:** Use a subtle background shift to `surface-bright` (#282a41) and a 4px left-aligned "indicator bar" in `primary` (#cdb1ff).

### Additional: The "Status Bar"
A global component fixed to the bottom of the viewport using `surface-container-lowest`. It displays system metadata (timestamp, connection status, breadcrumbs) in `label-sm` typography using `secondary` (#aec6ff) and `tertiary` (#d4bbff) accents.

## 6. Do's and Don'ts

### Do:
- **Use Asymmetry:** Place a large Display-LG title on the far left and the primary action on the far right, leaving the center empty.
- **Embrace Density:** Use the tight spacing scale (e.g., `0.5`, `1`, `2`) for metadata groups to mimic terminal readouts.
- **Color Coding:** Use `tertiary` (#d4bbff) for logic-based elements and `secondary` (#aec6ff) for navigation-based elements.

### Don't:
- **No Rounded Corners:** Any radius above 0px violates the structural integrity of the system.
- **No Gray Shadows:** If an element must float, use a tinted blur, never a black/gray drop shadow.
- **No Standard Grids:** Avoid simple 3-column card layouts. Try 2/3 and 1/3 splits to create editorial tension.
- **No Dividers:** If you feel the need for a line, use a background color shift instead.