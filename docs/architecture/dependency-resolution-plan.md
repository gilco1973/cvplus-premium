# CVPlus Submodule Dependency Resolution Plan

**Author**: Gil Klainert  
**Date**: 2025-08-29  
**Version**: 1.0  
**Status**: Implementation Ready

## Overview

This document defines the comprehensive strategy for resolving dependencies between CVPlus submodules in our complex monorepo architecture where each package is an independent git submodule with potential circular dependencies.

## Dependency Architecture

### Layer-Based Hierarchy

CVPlus follows a strict **layered dependency architecture** to prevent circular dependencies:

```
Layer 0 (Foundation)
├── packages/core/
│   └── No dependencies on other CVPlus modules

Layer 1 (Base Services)  
├── packages/auth/
│   └── Depends on: @cvplus/core
├── packages/i18n/
│   └── Depends on: @cvplus/core

Layer 2 (Domain Services)
├── packages/cv-processing/
│   └── Depends on: @cvplus/core, @cvplus/auth, @cvplus/i18n
├── packages/multimedia/
│   └── Depends on: @cvplus/core, @cvplus/auth, @cvplus/i18n
├── packages/analytics/
│   └── Depends on: @cvplus/core, @cvplus/auth, @cvplus/i18n

Layer 3 (Business Services)
├── packages/premium/
│   └── Depends on: Layer 0-2 modules
├── packages/recommendations/
│   └── Depends on: Layer 0-2 modules
├── packages/public-profiles/
│   └── Depends on: Layer 0-2 modules

Layer 4 (Orchestration Services)
├── packages/admin/
│   └── Depends on: All lower layers
├── packages/workflow/
│   └── Depends on: All lower layers
├── packages/payments/
│   └── Depends on: All lower layers
```

### Dependency Rules

1. **Upward Dependencies Only**: Modules can only depend on modules in lower layers
2. **No Circular Dependencies**: Module A cannot depend on Module B if B depends on A
3. **Core Independence**: The core module NEVER depends on any other CVPlus module
4. **Layer Isolation**: Within the same layer, modules cannot depend on each other

## Resolution Mechanisms

### 1. NPM Workspaces with File Protocol

**Current Implementation**:
```json
{
  "workspaces": ["packages/*", "frontend", "functions"],
  "dependencies": {
    "@cvplus/core": "file:../packages/core",
    "@cvplus/auth": "file:../packages/auth"
  }
}
```

**Benefits**:
- Real-time development changes
- No version conflicts during development
- Automatic symlink resolution

### 2. TypeScript Path Mapping

**Implementation Strategy**:
```json
// Root tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@cvplus/core": ["packages/core/src"],
      "@cvplus/core/*": ["packages/core/src/*"],
      "@cvplus/auth": ["packages/auth/src"],
      "@cvplus/auth/*": ["packages/auth/src/*"],
      "@cvplus/i18n": ["packages/i18n/src"],
      "@cvplus/i18n/*": ["packages/i18n/src/*"],
      "@cvplus/cv-processing": ["packages/cv-processing/src"],
      "@cvplus/cv-processing/*": ["packages/cv-processing/src/*"],
      "@cvplus/multimedia": ["packages/multimedia/src"],
      "@cvplus/multimedia/*": ["packages/multimedia/src/*"],
      "@cvplus/analytics": ["packages/analytics/src"],
      "@cvplus/analytics/*": ["packages/analytics/src/*"],
      "@cvplus/premium": ["packages/premium/src"],
      "@cvplus/premium/*": ["packages/premium/src/*"],
      "@cvplus/recommendations": ["packages/recommendations/src"],
      "@cvplus/recommendations/*": ["packages/recommendations/src/*"],
      "@cvplus/public-profiles": ["packages/public-profiles/src"],
      "@cvplus/public-profiles/*": ["packages/public-profiles/src/*"],
      "@cvplus/admin": ["packages/admin/src"],
      "@cvplus/admin/*": ["packages/admin/src/*"],
      "@cvplus/workflow": ["packages/workflow/src"],
      "@cvplus/workflow/*": ["packages/workflow/src/*"],
      "@cvplus/payments": ["packages/payments/src"],
      "@cvplus/payments/*": ["packages/payments/src/*"]
    }
  }
}
```

### 3. Build Order Management

**Layered Build Strategy**:
```json
{
  "scripts": {
    "build": "npm run build:layer0 && npm run build:layer1 && npm run build:layer2 && npm run build:layer3 && npm run build:layer4",
    "build:layer0": "npm run build --workspace=@cvplus/core",
    "build:layer1": "npm run build --workspace=@cvplus/auth && npm run build --workspace=@cvplus/i18n",
    "build:layer2": "npm run build --workspace=@cvplus/cv-processing && npm run build --workspace=@cvplus/multimedia && npm run build --workspace=@cvplus/analytics",
    "build:layer3": "npm run build --workspace=@cvplus/premium && npm run build --workspace=@cvplus/recommendations && npm run build --workspace=@cvplus/public-profiles",
    "build:layer4": "npm run build --workspace=@cvplus/admin && npm run build --workspace=@cvplus/workflow && npm run build --workspace=@cvplus/payments"
  }
}
```

## Circular Dependency Prevention

### 1. Interface Segregation

**Pattern**: Define interfaces in Core, implement in specific modules
```typescript
// packages/core/src/interfaces/auth.interface.ts
export interface AuthService {
  authenticate(token: string): Promise<User>;
}

// packages/auth/src/services/auth.service.ts
import { AuthService } from '@cvplus/core/interfaces';
export class FirebaseAuthService implements AuthService {
  // Implementation
}
```

### 2. Event-Driven Communication

**Pattern**: Use events for cross-module communication
```typescript
// packages/core/src/events/event-bus.ts
export class EventBus {
  static emit(event: string, data: any): void;
  static on(event: string, handler: Function): void;
}

// Usage in modules
EventBus.emit('user.authenticated', { userId: '123' });
EventBus.on('user.authenticated', (data) => handleAuth(data));
```

### 3. Dependency Injection

**Pattern**: Pass dependencies explicitly
```typescript
// packages/premium/src/services/subscription.service.ts
import { AuthService } from '@cvplus/core/interfaces';

export class SubscriptionService {
  constructor(private authService: AuthService) {}
}
```

## Module-Specific Dependency Guidelines

### Core Module (@cvplus/core)
```typescript
// ALLOWED: External libraries only
import { firestore } from 'firebase-admin';
import * as crypto from 'crypto';

// FORBIDDEN: Any CVPlus module
import { AuthService } from '@cvplus/auth'; // ❌ NEVER
```

### Auth Module (@cvplus/auth)
```typescript
// ALLOWED: Core only
import { User, ApiResponse } from '@cvplus/core';

// FORBIDDEN: Same layer or higher
import { CVProcessor } from '@cvplus/cv-processing'; // ❌ NEVER
import { AdminService } from '@cvplus/admin'; // ❌ NEVER
```

### Domain Services (Layer 2)
```typescript
// ALLOWED: Core, Auth, I18n
import { User } from '@cvplus/core';
import { AuthService } from '@cvplus/auth';
import { TranslationService } from '@cvplus/i18n';

// FORBIDDEN: Same layer modules
import { MultimediaService } from '@cvplus/multimedia'; // ❌ NEVER
import { AnalyticsService } from '@cvplus/analytics'; // ❌ NEVER
```

### Business Services (Layer 3)
```typescript
// ALLOWED: Layers 0-2
import { User } from '@cvplus/core';
import { AuthService } from '@cvplus/auth';
import { CVProcessor } from '@cvplus/cv-processing';

// FORBIDDEN: Same layer or orchestration layer
import { RecommendationService } from '@cvplus/recommendations'; // ❌ NEVER
import { AdminService } from '@cvplus/admin'; // ❌ NEVER
```

### Orchestration Services (Layer 4)
```typescript
// ALLOWED: All lower layers
import { User } from '@cvplus/core';
import { AuthService } from '@cvplus/auth';
import { CVProcessor } from '@cvplus/cv-processing';
import { PremiumService } from '@cvplus/premium';

// FORBIDDEN: Same layer
import { WorkflowService } from '@cvplus/workflow'; // ❌ NEVER (within admin)
```

## Development Workflow

### 1. New Dependency Addition
1. **Check Layer Compatibility**: Ensure target module is in lower layer
2. **Update package.json**: Add dependency with `file:` protocol
3. **Update TypeScript paths**: Add to root tsconfig paths
4. **Run Validation**: Execute dependency validation script
5. **Update Documentation**: Add to module's CLAUDE.md

### 2. Dependency Validation Script
```bash
#!/bin/bash
# scripts/validate-dependencies.sh
echo "Validating CVPlus dependency hierarchy..."

# Check for circular dependencies
npm run build:layer0 || exit 1
npm run build:layer1 || exit 1  
npm run build:layer2 || exit 1
npm run build:layer3 || exit 1
npm run build:layer4 || exit 1

echo "✅ Dependency hierarchy validation passed"
```

### 3. Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "scripts/validate-dependencies.sh && npm run type-check"
    }
  }
}
```

## Troubleshooting Common Issues

### Issue 1: Module Not Found Errors
**Solution**: Check TypeScript path mapping and npm workspace configuration

### Issue 2: Circular Dependency Detected  
**Solution**: Review dependency layer and use interface segregation or events

### Issue 3: Build Order Failures
**Solution**: Ensure dependencies are built in correct layer order

### Issue 4: Type Resolution Issues
**Solution**: Verify tsconfig.json extends properly and paths are correct

## Implementation Checklist

- [ ] Update root tsconfig.json with path mapping
- [ ] Add layered build scripts to root package.json
- [ ] Create dependency validation script
- [ ] Add pre-commit hooks for validation
- [ ] Update all submodule CLAUDE.md files with this plan
- [ ] Document import/export patterns for each layer
- [ ] Set up CI/CD dependency validation
- [ ] Create dependency graph visualization
- [ ] Train team on dependency rules

## Best Practices

1. **Always import from package root**: Use `@cvplus/core` not `@cvplus/core/src/types`
2. **Use interfaces for decoupling**: Define contracts in Core, implement in modules
3. **Prefer composition over inheritance**: Inject dependencies rather than importing directly
4. **Document dependencies**: Keep CLAUDE.md up to date with dependency changes
5. **Test in isolation**: Each module should have independent test suite
6. **Version together**: All CVPlus modules should use same version number for releases

This plan ensures scalable, maintainable dependency management while preventing the complexity issues common in large monorepos with interdependent modules.