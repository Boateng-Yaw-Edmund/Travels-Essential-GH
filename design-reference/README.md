# Travel Essentials GH — Storefront Template Reference

This directory preserves the approved visual direction for the future Travel Essentials GH e-commerce site. It is reference material only; no production UI has been implemented yet.

## Source files

- `source/stella-homepage-reference.png` — full-page visual reference and composition target.
- `source/stella-homepage-prototype.html` — static Tailwind prototype supplied with the reference.
- `source/serene-ecommerce-design-system.md` — supplied colors, typography, spacing, shapes, and component guidance.

## Direction to retain

- Modern, calm, premium minimalism with generous whitespace.
- Product and travel-lifestyle photography as the visual focus.
- Teal as the primary brand accent, supported by blue promotional accents and warm off-white surfaces.
- Plus Jakarta Sans for display/headline text and Work Sans for body/interface text.
- A centered `1280px` desktop content container, `24px` grid gutters, and approximately `80px` between major sections.
- Subtle borders and tonal layering in place of heavy shadows.
- Soft corner radii, thin-line icons, restrained hover movement, and clear calls to action.

## Homepage structure to adapt later

1. Header with brand, search, navigation, wishlist, cart, and account controls.
2. Large editorial hero promoting a core travel collection.
3. Shop-by-category tiles for Travel Essentials GH inventory.
4. New-arrival product grid.
5. Editorial collection feature with two supporting promotional tiles.
6. Featured-deal banners.
7. Brand or partner strip, if relevant to the final catalogue.
8. Travel guides or recent articles.
9. Customer-support strip and full footer.

## Production guardrails

- Use the layout language and design tokens as a starting template, not the `Stella` name or copy.
- Replace all fashion categories, product data, photography, promotions, contact information, and links with Travel Essentials GH content.
- Do not depend on the prototype's externally hosted Google image URLs; approved, licensed production assets must replace them.
- Rebuild components in the selected application framework instead of shipping the supplied CDN-based HTML directly.
- Preserve responsive behavior: reduce desktop margins on tablet, use `16px` mobile gutters, and collapse product/category grids appropriately.
- Validate final color contrast, keyboard navigation, focus states, image alternative text, and reduced-motion behavior during implementation.

## Initial token baseline

| Role | Value |
| --- | --- |
| Primary | `#006971` |
| Primary container | `#47B5C1` |
| Secondary | `#005CBA` |
| Page surface | `#FCF9F8` |
| Main text | `#1C1B1B` |
| Muted text | `#3D494A` |
| Outline | `#BDC9CA` |
| Display/headline font | Plus Jakarta Sans |
| Body/interface font | Work Sans |
| Desktop max width | `1280px` |
| Desktop outer margin | `40px` |
| Grid gutter | `24px` |
| Section gap | `80px` |

The full token set remains in `source/serene-ecommerce-design-system.md` and should be converted into framework-native design tokens only when implementation begins.
