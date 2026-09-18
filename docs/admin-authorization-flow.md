# Admin Authorization Flow

This branch is reserved for the super-admin approval workflow for new admin accounts.

## Goal

- Only a super_admin can create and approve admin access.
- New admin accounts start in a pending state.
- Super admin reviews identity, role, permission scope, and approval request.
- Approved admins receive admin access and audit trail entries.
- Rejected or suspended admins are blocked from admin routes.

## Role model

- `player`: standard user access
- `admin`: approved operational admin
- `super_admin`: platform owner with full privilege

## Flow

1. User registers normally.
2. A super admin reviews the new admin request.
3. The request is stored as pending.
4. Super admin approves or rejects the role request.
5. If approved, the player role becomes `admin`.
6. If rejected, the request remains blocked and logged.

## Required backend rules

- `requireAdmin` must allow only `admin` and `super_admin`.
- `requireSuperAdmin` must allow only `super_admin`.
- All admin creation actions must be logged to `AuditLog`.
- Super-admin approval actions must be immutable and auditable.

## Example request contract

POST /api/v1/admin-authorization/request

```json
{
  "requestedRole": "admin",
  "requestedPermissions": ["games", "players", "reports", "profit-risk"],
  "notes": "Operations support for live games"
}
```

## Example approval contract

POST /api/v1/admin-authorization/:requestId/approve

```json
{
  "approvedBy": "super_admin_user_id",
  "notes": "Approved for operations dashboard"
}
```

## Recommended data model

- `AdminAuthorizationRequest`
  - id
  - playerId
  - requestedRole
  - requestedPermissions
  - status (pending | approved | rejected)
  - notes
  - createdAt
  - reviewedAt
  - reviewedBy

## Production checklist

- enforce two-step approval for admin creation
- restrict normal users from creating admin roles directly
- keep all approval actions inside audit logs
- ensure super admin access is never assigned automatically outside review
- add UI in the superadmin panel for pending requests
