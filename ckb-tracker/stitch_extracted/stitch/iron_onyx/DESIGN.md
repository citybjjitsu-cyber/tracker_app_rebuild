# Design System Document: Kinetic Precision

## 1. Overview & Creative North Star
**Creative North Star: "The Obsidian Arena"**

This design system is engineered to capture the raw, focused intensity of a high-end martial arts dojo and the relentless energy of a modern performance gym. We are moving away from the "SaaS dashboard" aesthetic. Instead, we are building a digital environment that feels like a premium physical space—tactile, deep, and authoritative.

The "Obsidian Arena" philosophy relies on **Kinetic Depth**. We break the traditional grid through intentional asymmetry, where data "floats" over deep black voids, and high-impact typography mimics the scale of environmental wayfinding. We don't just display information; we stage it.

---

## 2. Colors & Surface Philosophy

The palette is rooted in a "Dark-First" methodology. We use high-contrast primary accents to direct the user's "strike" (action), while the background layers provide the silence necessary for focus.

### The Palette (Material Design Mapping)
*   **Primary (The Strike):** `primary` (#ffb4ab) / `primary_container` (#dc2626). Used for high-intensity actions and critical status indicators.
*   **Surface Layers:** 
    *   `surface` (#131313): The base floor.
    *   `surface_container_lowest` (#0e0e0e): Carved-out utility areas.
    *   `surface_container_highest` (#353534): Elevated interactive "glass" panels.
*   **Accents:** `tertiary` (#90cdff) for secondary data points like schedule shifts or membership tiers.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning. Structural boundaries must be defined solely through background color shifts. 
*   *Instead of a border:* Place a `surface_container_low` section against a `surface` background.
*   *The "Ghost Border" Fallback:* If a container requires a boundary for accessibility (e.g., an input field), use `outline_variant` at **15% opacity**. Never use a 100% opaque border.

### Signature Textures & Glass
To achieve the "Obsidian" look, utilize **Glassmorphism**. Floating cards should use `surface_container_highest` at 60% opacity with a `20px` backdrop-blur. This creates a sense of professional polish, suggesting that the UI is an overlay on a living, breathing training environment.

---

## 3. Typography: Editorial Impact

We pair the technical precision of **Inter** with the aggressive, wide-set geometry of **Space Grotesk** for headings.

*   **Display & Headlines (Space Grotesk):** These are your "Statement" elements. Use `display-lg` (3.5rem) for hero stats—like "Total Revenue" or "Active Fighters"—to create a high-energy, editorial feel. 
*   **Titles & Body (Inter):** Used for functional clarity. Inter provides the "Instructional" voice—clean, legible, and no-nonsense.
*   **Visual Hierarchy:** High contrast is mandatory. A `headline-lg` in `on_surface` should sit near `label-sm` in `on_surface_variant` to create a rhythmic "Big/Small" tension typical of premium sports brands.

---

## 4. Elevation & Depth: Tonal Layering

We reject the "Drop Shadow" as a primary tool. Hierarchy is achieved through **Tonal Stacking**.

*   **The Layering Principle:** 
    1.  **Level 0 (Base):** `surface` (#131313)
    2.  **Level 1 (Sections):** `surface_container_low` (#1c1b1b)
    3.  **Level 2 (Cards):** `surface_container_high` (#2a2a2a)
    4.  **Level 3 (Popovers):** `surface_bright` (#3a3939) with a 6% opacity tinted shadow.
*   **Ambient Shadows:** For floating elements (Modals/Active Menus), use an extra-diffused shadow: `offset: 0 20px, blur: 40px, color: rgba(0, 0, 0, 0.5)`. The shadow must feel like a natural light obstruction, not a fuzzy line.

---

## 5. Components

### Buttons: The "Call to Action"
*   **Primary:** Solid `primary_container` (#dc2626) with `on_primary_container` text. Sharp `8px` corners. On hover, a subtle gradient transition to `primary_fixed` to simulate a "glow" effect.
*   **Secondary:** Ghost style. No fill, `Ghost Border` (outline-variant @ 20%), text in `on_surface`.
*   **Tertiary:** Text-only, uppercase, 0.75rem `label-md` for low-priority management tasks.

### Cards & Lists: The "No-Divider" Mandate
*   **Cards:** Use Glassmorphism (Backdrop blur + semi-transparent fill). Corner radius is strictly `0.5rem (8px)`.
*   **Lists:** Forbid the use of divider lines. Separate list items using `12px` of vertical white space or by alternating background tones between `surface_container_low` and `surface_container_lowest`.

### High-Energy Components
*   **The "Pulse" Badge:** Small circular indicator using `primary` (#ffb4ab) with a CSS animation pulse to indicate a live class or an active check-in.
*   **Data Strips:** Thin, vertical `primary_container` bars on the left side of a card to indicate "High Intensity" or "Urgent" status.

---

## 6. Do's and Don'ts

### Do:
*   **Use Asymmetry:** Align high-impact numbers to the right and descriptive text to the left to break the "standard" center-aligned look.
*   **Embrace the Dark:** Ensure `surface_container_lowest` is used for "sunken" areas like search bars to create tactile depth.
*   **Vary Typographic Scale:** Jump between `display-sm` and `label-sm` to create an athletic, high-contrast energy.

### Don't:
*   **Don't use pure white (#FFFFFF):** It is too harsh. Always use `on_surface` (#e5e2e1) for a premium, slightly muted metallic feel.
*   **Don't use large radii:** Stay within the `0.25rem` to `0.75rem` range. Anything "round" feels too soft/consumer-grade for a martial arts context.
*   **Don't clutter:** If a screen feels busy, increase the spacing, don't add borders. Space is the luxury in this system.