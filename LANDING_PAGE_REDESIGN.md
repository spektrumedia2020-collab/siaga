# SIAGA Landing Page - Redesign Implementation Guide

## Overview
This document outlines the comprehensive redesign of the Market Landing Page for Pasar Niaga Daya. The new design focuses on visual storytelling, professional presentation, and clear communication of market benefits.

## Key Changes

### 1. Navigation Bar
- **Sticky positioning** for constant access
- Clean logo + market name
- Navigation links: Beranda, Tentang, Keunggulan, Kegiatan, Kontak
- CTA button: "Jelajahi Niaga Daya"
- Hamburger menu on mobile

### 2. Hero Section
- Full-width background image
- Large, bold headline: "Pasar Niaga Daya"
- Subheadline: "Pasar modern yang terintegrasi dengan teknologi..."
- Dual CTA buttons with proper hierarchy
- Subtle animation on scroll
- Logo prominently displayed (100px)

### 3. About Market Section
- Brief introduction (max 3 sentences)
- 4 highlight cards with icons:
  - Pedagang (Merchants)
  - Layanan Digital (Digital Services)
  - Fasilitas Pasar (Market Facilities)
  - Lokasi Strategis (Strategic Location)
- No made-up statistics - placeholder for real data

### 4. Keunggulan (Advantages) Section
- 4 feature cards:
  1. Pembayaran Digital
  2. Terintegrasi
  3. Nyaman
  4. Transparan
- Icon + description per card
- Clean grid layout

### 5. About SIAGA Section
- Headline: "SIAGA untuk Pasar yang Lebih Modern"
- Brief explanation of SIAGA
- Visual representation (app mockup or icon)
- Left-right layout alternation for visual interest

### 6. Kegiatan (News/Activities) Section
- Maximum 3 news items
- Card layout with image, date, title, summary
- "Baca Selengkapnya" CTA
- Placeholder structure for easy content replacement

### 7. Galeri (Gallery) Section
- Masonry/grid layout of market photos
- Responsive 2-3 columns
- Hover effects with subtle zoom
- Focus on market atmosphere, not data

### 8. CTA Section
- Strong closing message
- "Menuju Pasar yang Lebih Modern" headline
- Unified CTA button
- Warm, inviting visual background

### 9. Footer
- Logo + brief description
- Navigation links
- Market info
- Contact details
- Social media (if available)
- Copyright notice

## Design System

### Typography
- **Font Family**: Inter, Plus Jakarta Sans, or Manrope
- **H1**: 2.5rem-3rem, bold, primary color
- **H2**: 1.75rem-2rem, semi-bold
- **H3**: 1.25rem-1.5rem, medium
- **Body**: 1rem, light (400), line-height 1.6

### Color Palette
- **Primary (Green)**: #10b981 or #059669
- **Dark**: #1e293b or #0f172a
- **Neutral**: #64748b (text)
- **Background**: #f8fafc or #ffffff
- **White**: #ffffff

### Spacing
- Generous whitespace
- Section padding: 4rem-6rem vertical
- Component padding: 1.5rem-2rem
- Gap between elements: 0.5rem-2rem

### Components
- **Buttons**: 
  - Primary: bg-green, text-white, rounded-lg
  - Secondary: outline, hover-fill
  - Hover scale: slight zoom (1.02)
- **Cards**: 
  - white bg, subtle shadow, rounded-xl
  - Hover: lift effect (box-shadow increase)
- **Images**: 
  - Rounded corners
  - Aspect ratio maintained
  - Lazy loading for performance

### Animations
- Fade-up on scroll
- Subtle hover effects
- Smooth transitions (200-300ms)
- No animation should exceed 1s
- Parallax on hero (optional, performance-safe)

## Responsive Breakpoints
- **Mobile**: 320px-639px
- **Tablet**: 640px-1023px
- **Desktop**: 1024px+

### Mobile-First Approach
- Single column layout
- Larger touch targets (min 44px)
- Hamburger menu instead of horizontal nav
- Full-width cards and sections
- Reduced image sizes

## SEO Optimization
- Title: "Pasar Niaga Daya | SIAGA - Sistem Informasi Retribusi Pasar"
- Meta description: "Pasar modern yang terintegrasi dengan teknologi. Jelajahi kemudahan berbelanja dan berdagang di Pasar Niaga Daya dengan SIAGA."
- Proper heading hierarchy (H1 → H2 → H3)
- Image alt attributes
- Schema markup for LocalBusiness
- Open Graph meta tags

## Performance Considerations
- Lazy load images below the fold
- Optimize image sizes (WebP format)
- Minimize animations
- Use CSS for simple effects
- Avoid heavy JavaScript animations

## Accessibility
- Semantic HTML (nav, section, article, footer)
- ARIA labels where needed
- Color contrast ratio ≥ 4.5:1
- Focus states on interactive elements
- Keyboard navigation support
- Alt text on all images

## Implementation Phases

### Phase 1: Component Structure
- Update MarketLandingPage.tsx with new sections
- Keep existing data fetching
- Add new state for gallery/news if needed

### Phase 2: Styling
- Create comprehensive CSS with new sections
- Implement responsive design
- Add animations and transitions

### Phase 3: Content Integration
- Connect CMS data from market_config
- Implement placeholder content handling
- Add image fallbacks

### Phase 4: Testing
- Desktop and mobile testing
- Responsive design verification
- Performance optimization
- SEO validation
- Accessibility audit

### Phase 5: Deployment
- Build and test
- Push to Git
- Vercel deployment
- Production verification

## Success Metrics
- Clean, professional appearance
- Clear visual hierarchy
- Mobile responsiveness ✓
- Fast loading (<3s on 3G)
- High accessibility score
- SEO-friendly structure
- Scalable for content updates
- No confusion with dashboard

---

**Next Step**: Implement Phase 1 & 2 with updated component and styles
