# Workspace Performance Guardrails

Every future code change in this repository must be validated against these rules before implementation.

## Reject any change that:

- **Increases bundle size significantly**: Avoid importing large libraries when smaller alternatives or native APIs exist. Optimize tree-shaking and dynamic imports.
- **Adds unnecessary client components**: Keep components server-side by default in Next.js. Only use `'use client'` when interactive features (e.g., hooks, event listeners) are strictly required.
- **Introduces render-blocking resources**: Avoid blocking the critical rendering path with unoptimized styles, scripts, or fonts.
- **Adds unoptimized images**: Always use Next.js `<Image />` component with correct layouts, sizes, and formats (AVIF/WebP). Avoid raw `<img>` tags for content images.
- **Creates layout shift**: Reserve dimensions for dynamic assets (images, ads, dynamic components) to prevent Cumulative Layout Shift (CLS).
- **Adds unnecessary dependencies**: Keep dependency count to a minimum. Do not install new npm packages for small utility features.
- **Reduces Lighthouse score**: Performance regressions are unacceptable. Every build must be performance-budgeted.
- **Reduces accessibility score**: Maintain semantic HTML structure, proper ARIA labels, focus states, and high color contrast.
- **Reduces SEO score**: Keep titles, meta tags, and structured data clean, descriptive, and correct.

Every future feature must preserve or improve the current Lighthouse scores.
