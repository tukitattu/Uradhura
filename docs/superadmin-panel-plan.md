# Super Admin Panel Plan

## Scope
This branch is reserved for full platform controls and global live settings.

## Controls required
- design system token editor
- feature flag management
- game branding control
- global platform stats
- approved admin management
- access restrictions by role

## Requirements
- only super_admin can access
- all modifications logged to AuditLog
- all config changes must be reversible
- all user-facing toggles must respect feature flag permissions
