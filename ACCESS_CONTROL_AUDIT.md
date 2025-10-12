# Access Control Audit Report

**Date:** 2025-10-12
**New Access Logic:** Flag-based system with `isAdmin` and `isSuperAdmin`

## Executive Summary

The codebase currently has **mixed access control implementation** with both role-based and flag-based systems. This audit identifies inconsistencies and provides recommendations for implementing the new access control logic.

---

## Current State

### User Model Status ✅
**Location:** `/lib/types.ts` (lines 11-13)

```typescript
role: 'owner' | 'admin' | 'manager' | 'head_of_sales' | 'sales_rep' | 'viewer'
isAdmin: boolean        // Already exists!
isSuperAdmin: boolean   // Already exists!
```

**Status:** User model already has the required flags. Both systems coexist.

---

## Access Control Issues Found 🚨

### Critical Issues (Data Leakage)

#### 1. **Call Analysis - No Filtering**
**File:** `/app/actions/call-analysis.ts`
**Function:** `getCallAnalyses()` (line 28-65)
**Issue:** Empty filter object (line 49) returns ALL call analyses regardless of user permissions

```typescript
const filter = {}  // ⚠️ Returns everything!
```

**Risk:** High - All users can see all call analyses across all organizations

---

#### 2. **Call Records - No Filtering**
**File:** `/app/actions/call-records.ts`
**Function:** `getCallRecordsWithAnalysisStatus()` (line 19-89)
**Issue:** Empty filter (line 29-30) returns ALL call records

```typescript
const callRecords = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS)
  .find({})  // ⚠️ No filtering at all!
```

**Risk:** High - All users can see all call records across all organizations

---

#### 3. **Recent Call Analyses - No Filtering**
**File:** `/app/actions/call-analysis.ts`
**Function:** `getRecentCallAnalyses()` (line 253-328)
**Issue:** Empty filter (line 265) despite having userId parameter

```typescript
const filter = {}  // ⚠️ userId parameter ignored!
```

**Risk:** High - Dashboard shows data from all users/organizations

---

### Inconsistent Access Control

#### 4. **Head of Sales - Role-Based Only**
**File:** `/app/actions/head-of-sales.ts`
**Function:** `getAuthorizedUser()` (line 50-69)
**Issue:** Uses hardcoded role array, doesn't check `isAdmin` or `isSuperAdmin` flags

```typescript
const ALLOWED_ROLES = ['head_of_sales', 'admin', 'manager'] as const
if (!ALLOWED_ROLES.includes(currentUser.role as AllowedRole)) {
  throw new Error('Insufficient permissions')
}
```

**Note:** Correctly filters by organizationId (line 96, 105, 200)

---

#### 5. **Call Records API - Mixed Approach**
**File:** `/app/api/call-records/route.ts`
**Issue:** Mixes role-based and organizationId filtering (lines 38-42)

```typescript
// Good: Filters by organization
filters.organizationId = currentUser.organizationId

// Inconsistent: Role-based filtering
if (currentUser.role === 'sales_rep') {
  filters.salesRepId = currentUser._id?.toString()
}
```

**Status:** Partially correct but needs flag-based logic

---

#### 6. **Navigation - Role-Based Only**
**File:** `/components/dashboard-nav.tsx`
**Issue:** Uses role array for filtering (line 102-105)

```typescript
const filteredNavigation = navigation.filter(item => {
  if (!item.roles) return true
  return item.roles.includes(userData?.role || '')
})
```

---

## New Access Control Logic Required

### Three Access Levels:

1. **Regular User**
   - Access: Only their own data
   - Filter: `{ userId: currentUser._id }`

2. **Admin** (`isAdmin: true`)
   - Access: All data in their organization
   - Filter: `{ organizationId: currentUser.organizationId }`

3. **Super Admin** (`isSuperAdmin: true`)
   - Access: All data across all organizations
   - Filter: `{}` (no filter)

---

## Recommendations

### 1. Create Access Control Helper

**File:** `/lib/access-control.ts` (new file)

```typescript
export function buildAccessFilter(user: User, collection: 'calls' | 'records' | 'analysis') {
  // SuperAdmin sees everything
  if (user.isSuperAdmin) {
    return {}
  }

  // Admin sees all organization data
  if (user.isAdmin) {
    return { organizationId: user.organizationId }
  }

  // Regular user sees only their own data
  return {
    organizationId: user.organizationId,
    userId: user._id
  }
}
```

### 2. Update All Server Actions

Files requiring immediate updates:
- ✅ `/app/actions/call-analysis.ts` - Add filtering to getCallAnalyses()
- ✅ `/app/actions/call-records.ts` - Add filtering to getCallRecordsWithAnalysisStatus()
- ✅ `/app/actions/head-of-sales.ts` - Replace role checks with flag checks
- `/app/actions/users.ts` - Audit and update
- `/app/actions/sales-reps.ts` - Audit and update
- `/app/actions/call-evaluations.ts` - Audit and update

### 3. Update API Routes

Files requiring updates:
- ✅ `/app/api/call-records/route.ts` - Replace role check with flag-based logic
- `/app/api/users/route.ts` - Audit access control
- `/app/api/users/manage/route.ts` - Audit access control

### 4. Update UI Components

- `/components/dashboard-nav.tsx` - Replace role filtering with flag checks

---

## Migration Strategy

### Phase 1: Add Helper Function
- Create `/lib/access-control.ts` with helper functions
- Include both flag and role support for backward compatibility

### Phase 2: Update Critical Data Leaks
- Fix `getCallAnalyses()`
- Fix `getCallRecordsWithAnalysisStatus()`
- Fix `getRecentCallAnalyses()`

### Phase 3: Update Permission Checks
- Replace role checks with flag checks
- Update navigation filtering
- Update API route authorization

### Phase 4: Testing & Validation
- Test as regular user (should see own data only)
- Test as admin (should see org data)
- Test as super admin (should see all data)

### Phase 5: Deprecate Roles (Optional)
- If roles are no longer needed for navigation, consider deprecating
- Or keep roles for UI/navigation purposes only

---

## Priority Matrix

| Issue | Severity | Impact | Priority |
|-------|----------|--------|----------|
| Empty filters in call-analysis.ts | 🔴 Critical | Data Leakage | P0 |
| Empty filters in call-records.ts | 🔴 Critical | Data Leakage | P0 |
| Inconsistent role checks | 🟡 Medium | Security | P1 |
| Navigation role filtering | 🟢 Low | UX | P2 |

---

## Next Steps

1. ✅ Create access control helper function
2. ✅ Update User types documentation
3. ✅ Fix critical data leakage issues
4. Update all server actions with proper filtering
5. Update API routes
6. Update navigation component
7. Test all access levels thoroughly

---

## Notes

- The `isAdmin` and `isSuperAdmin` flags already exist in the User model
- Both role and flag systems currently coexist
- Role system is still used for navigation and some permission checks
- Decision needed: Keep roles for navigation or migrate fully to flags?
