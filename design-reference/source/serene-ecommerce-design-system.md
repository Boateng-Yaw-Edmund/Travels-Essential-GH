---
name: Serene E-Commerce
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#3d494a'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#6d797b'
  outline-variant: '#bdc9ca'
  surface-tint: '#006971'
  primary: '#006971'
  on-primary: '#ffffff'
  primary-container: '#47b5c1'
  on-primary-container: '#004349'
  inverse-primary: '#6cd6e2'
  secondary: '#005cba'
  on-secondary: '#ffffff'
  secondary-container: '#5c9bfe'
  on-secondary-container: '#00326a'
  tertiary: '#5b5f60'
  on-tertiary: '#ffffff'
  tertiary-container: '#a3a7a8'
  on-tertiary-container: '#383d3e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#8af2ff'
  primary-fixed-dim: '#6cd6e2'
  on-primary-fixed: '#001f23'
  on-primary-fixed-variant: '#004f56'
  secondary-fixed: '#d7e3ff'
  secondary-fixed-dim: '#abc7ff'
  on-secondary-fixed: '#001b3f'
  on-secondary-fixed-variant: '#00458e'
  tertiary-fixed: '#e0e3e4'
  tertiary-fixed-dim: '#c4c7c8'
  on-tertiary-fixed: '#181c1d'
  on-tertiary-fixed-variant: '#434748'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 64px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Work Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Work Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-x: 40px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  section-gap: 80px
---

## Brand & Style
The design system embodies a **Modern Minimalism** aesthetic tailored for high-end e-commerce. It prioritizes clarity, breathability, and a "Simple is More" philosophy that allows product photography to take center stage. 

The emotional response is one of calm sophistication and effortless shopping. By utilizing generous whitespace and a soft, curated color palette, the UI creates an environment that feels premium yet accessible. The visual language avoids clutter, opting for thin lines, subtle borders, and precise alignment to communicate quality and attention to detail.

## Colors
The palette is rooted in a refreshing **Teal** primary, evoking a sense of modern tech and cleanliness. This is supported by a vibrant **Action Blue** for high-priority calls to action and promotional banners. 

- **Primary (Teal):** Used for branding elements, secondary actions, and accent backgrounds.
- **Secondary (Action Blue):** Reserved for high-conversion touchpoints like "Get Discount" or specific marketing highlights.
- **Surface & Neutrals:** A range of soft grays and off-whites (`#F8F9FA`, `#E9ECEF`) are used to create subtle container differentiation without the harshness of pure black-on-white. 
- **Typography:** Deep charcoal (`#1A1A1A`) is used for primary text to ensure high legibility while maintaining a softer look than pure black.

## Typography
The typographic system uses a pairing of **Plus Jakarta Sans** for headlines and **Work Sans** for body copy and UI labels. 

- **Headlines:** Feature tight letter-spacing and semi-bold weights to create a "editorial" feel, especially in the hero sections where typography interacts with lifestyle imagery.
- **Body & Interface:** Work Sans provides a grounded, professional feel with high legibility at smaller scales. 
- **Scale:** On mobile, `display-lg` should scale down to `36px` to maintain visual impact without breaking layout constraints.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. Content is contained within a 1280px max-width container on desktop, centered with generous outer margins. 

- **Grid:** A 12-column grid is used for product listings and promotional tiles. 
- **Rhythm:** Vertical spacing is intentionally large (80px between sections) to reinforce the minimalist brand positioning and prevent the "cramped" feel common in retail.
- **Responsive:** On tablet, margins reduce to 24px. On mobile, the grid collapses to 1 or 2 columns with a 16px gutter.

## Elevation & Depth
This design system utilizes **Tonal Layering** and **Low-Contrast Outlines** rather than heavy shadows. 

- **Surfaces:** Depth is achieved by placing white cards on top of light gray (`#F4F7F8`) backgrounds. 
- **Borders:** Elements like category chips and product cards use a very subtle 1px border (`#E9ECEF`) to define their shape without adding visual weight.
- **Interactions:** A soft, diffused ambient shadow (10% opacity, 20px blur) is only applied during hover states to indicate interactivity.

## Shapes
The shape language is **Soft**. A consistent 4px (0.25rem) radius is applied to most UI components, including buttons, input fields, and category chips. 

- **Cards:** Larger containers like product cards or promotional banners use `rounded-lg` (8px) to feel more approachable.
- **Iconography:** Use linear, thin-stroke icons to match the refined typography.

## Components
- **Buttons:** Primary buttons are solid Teal (`#47B5C1`) with white text. Secondary buttons use a ghost style (Teal border, Teal text). Promotional buttons use the Action Blue.
- **Category Chips:** Use a subtle border and a small icon above or beside the text. Backgrounds are white, switching to a light teal tint on hover.
- **Product Cards:** Minimalist execution with no visible border until hover. Price is emphasized with `label-md` weight. Stock status uses a small colored dot indicator.
- **Input Fields:** Search bars are high-height (48px+) with a light gray background and subtle interior padding.
- **Badges:** Small, rectangular labels with `label-sm` typography for "New Arrival" or "Limited Edition," using high-contrast fills like Red or Black to draw immediate attention.