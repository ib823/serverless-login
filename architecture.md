# 🎨 Passkeys IdP - Component Architecture & Design System

## Architecture Overview

```
passkeys-idp/
├── app/
│   ├── layout.tsx                 # Root layout with theme provider
│   ├── page.tsx                   # Hero landing page
│   ├── globals.css                # Global styles & CSS variables
│   ├── (auth)/
│   │   ├── layout.tsx            # Auth-specific layout with modal support
│   │   └── login/
│   │       └── page.tsx          # Login trigger page
│   └── api/
│       └── [existing API routes]
├── components/
│   ├── auth/
│   │   ├── AuthModal.tsx         # Main auth modal container
│   │   ├── AuthFlow.tsx          # Smart auth flow orchestrator
│   │   ├── PasskeyButton.tsx     # Adaptive passkey button
│   │   ├── EmailInput.tsx        # Floating label email input
│   │   ├── BiometricIcon.tsx     # Device-aware icon
│   │   └── SessionIndicator.tsx  # Persistent auth state
│   ├── ui/
│   │   ├── Button.tsx            # Magnetic hover button
│   │   ├── Card.tsx              # Glass morphism card
│   │   ├── Spinner.tsx           # Smooth loading spinner
│   │   ├── Dialog.tsx            # Radix dialog wrapper
│   │   ├── Toast.tsx             # Success/error toasts
│   │   └── CommandMenu.tsx       # Cmd+K quick actions
│   └── effects/
│       ├── Confetti.tsx          # Success confetti
│       ├── GradientOrb.tsx       # Background gradient orbs
│       └── MagneticEffect.tsx    # Magnetic cursor effect
├── lib/
│   ├── hooks/
│   │   ├── useAuth.tsx           # Auth state management
│   │   ├── usePasskeys.tsx       # WebAuthn capabilities
│   │   ├── useAutoDetect.tsx     # Smart user detection
│   │   └── useKeyboardShortcuts.tsx
│   ├── utils/
│   │   ├── cn.ts                 # Class name utility
│   │   ├── animations.ts         # Framer motion presets
│   │   └── validators.ts         # Email & domain validation
│   ├── stores/
│   │   └── auth-store.ts         # Zustand auth state
│   └── context/
│       └── auth-context.tsx      # Auth provider wrapper
└── styles/
    └── themes.css                 # Theme variables
```

## Component Specifications

### 1. **AuthModal** - The Core Experience
- Floating glass morphism modal with backdrop blur
- Smooth scale + fade animation on open
- Keyboard navigation support (Esc to close)
- Responsive positioning (center on desktop, bottom sheet on mobile)

### 2. **AuthFlow** - Intelligence Layer
State Machine:
```
IDLE → EMAIL_INPUT → CHECKING → 
  ├── NEW_USER → REGISTER → SUCCESS
  └── EXISTING_USER → AUTHENTICATE → SUCCESS
```

Features:
- Auto-detect existing users by email
- WebAuthn capability detection
- Progressive disclosure
- Optimistic UI updates
- Error recovery flows

### 3. **EmailInput** - Smart Input
- Floating label animation
- Real-time validation with debounce
- Domain suggestion ("Did you mean @gmail.com?")
- Loading state during verification
- Success checkmark animation

### 4. **PasskeyButton** - Adaptive UI
Device Detection:
- Touch ID → Fingerprint icon
- Face ID → Face scan icon  
- Security Key → Key icon
- Platform authenticator → Shield icon

States:
- Idle: Subtle pulse animation
- Hover: Magnetic effect + glow
- Active: Press depth animation
- Success: Checkmark morph

### 5. **BiometricIcon** - Dynamic Icons
Animated SVG morphing between states:
- Fingerprint scan animation
- Face recognition sweep
- Key rotation
- Shield pulse

## Design Tokens

### Colors
```css
--primary: hsl(0, 0%, 9%);           /* Almost black */
--primary-foreground: hsl(0, 0%, 98%); /* Almost white */
--accent: hsl(217, 91%, 60%);        /* Electric blue */
--accent-glow: hsl(217, 91%, 60%, 0.5);
--success: hsl(142, 76%, 36%);       /* Green */
--error: hsl(346, 87%, 43%);         /* Red */
--gradient-start: hsl(217, 70%, 85%);
--gradient-end: hsl(280, 70%, 85%);
```

### Animations
```typescript
export const animations = {
  // Micro-interactions
  tap: { scale: 0.97 },
  hover: { scale: 1.02 },
  
  // Page transitions
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  },
  
  // Modal entrance
  modal: {
    initial: { opacity: 0, scale: 0.95, y: 10 },
    animate: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: "spring", damping: 25 }
    }
  },
  
  // Success state
  success: {
    scale: [1, 1.2, 1],
    rotate: [0, 10, -10, 0],
    transition: { duration: 0.5 }
  }
};
```

### Typography
```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', monospace;

/* Scale */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
```

## User Flows

### 1. First-Time User
```
Land → Click "Get Started" → Modal opens → 
Enter email → System checks → No account found →
"Create your passkey" CTA → WebAuthn registration →
Confetti → Session created → Redirect
```

### 2. Returning User  
```
Land → Click "Sign In" → Modal opens →
Enter email → System checks → Account found →
Auto-trigger WebAuthn → Biometric prompt →
Success → Session restored → Redirect
```

### 3. Quick Access (Cmd+K)
```
Press Cmd+K anywhere → Command menu →
Type "sign" → Quick auth flow →
Passkey prompt → Success
```

## Accessibility

- **Keyboard Navigation**: Full Tab support, Esc to close
- **Screen Readers**: ARIA labels on all interactive elements
- **Focus Management**: Trap focus in modal, restore on close
- **Motion**: Respect `prefers-reduced-motion`
- **Contrast**: WCAG AAA compliance
- **Loading States**: Descriptive announcements

## Performance

- **Code Splitting**: Lazy load auth components
- **Optimistic UI**: Update before server response
- **Debouncing**: Email validation at 300ms
- **Animation**: Use CSS transforms only
- **Bundle Size**: < 50KB for auth components

## Security UX

- **Visual Indicators**: Lock icon for secure fields
- **Clear Messaging**: "Your passkey is stored locally"
- **Error Handling**: Never expose "user not found"
- **Rate Limit Feedback**: "Too many attempts" countdown
- **Success Confirmation**: Brief celebration then redirect

## Implementation Priority

1. **Phase 1**: Core Components
   - AuthModal, AuthFlow, EmailInput
   - Basic animations and transitions

2. **Phase 2**: Intelligence Layer  
   - Auto-detection, WebAuthn capability checks
   - Smart error recovery

3. **Phase 3**: Polish
   - Magnetic effects, confetti
   - Keyboard shortcuts, command menu
   - Onboarding tooltips

4. **Phase 4**: Advanced
   - Session persistence indicator
   - Multi-device passkey management
   - Analytics and metrics