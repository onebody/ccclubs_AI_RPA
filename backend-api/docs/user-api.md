# User Management API Documentation

## Overview

User management API for managing users within tenants.

**Base URL**: `/api/v1/users`

**Authentication**: Required (JWT Token in Authorization header)

**Content-Type**: `application/json`

---

## Endpoints

### 1. Add User to Tenant

**POST** `/api/v1/tenants/:tenantId/users`

Add a user to a tenant (create user if not exists). Tenant administrators can add users to their tenant.

#### Authentication

Required: `Authorization: Bearer <token>`

Required Role: `tenant_admin` or `super_admin`

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+86 138 0000 0000",
  "role": "participant"
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User email (unique) |
| password | string | Yes | User password (min 6 characters) |
| firstName | string | Yes | User first name |
| lastName | string | Yes | User last name |
| phone | string | No | User phone number |
| role | string | No | User role (default: `participant`) |

**Available Roles**:
- `super_admin` - Super administrator (cross-tenant access)
- `tenant_admin` - Tenant administrator
- `judge` - Competition judge
- `participant` - Competition participant
- `audience` - Audience member

#### Response

**Success (201)**:
```json
{
  "success": true,
  "message": "User added to tenant successfully",
  "data": {
    "user": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "participant"
    },
    "tenant": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Tech Competition 2024"
    }
  }
}
```

**Error (409)**:
```json
{
  "success": false,
  "message": "User already exists in this tenant"
}
```

---

### 2. Get Tenant Users

**GET** `/api/v1/tenants/:tenantId/users`

Get list of users in a tenant. Tenant administrators can view their tenant's users.

#### Authentication

Required: `Authorization: Bearer <token>`

Required Role: `tenant_admin` or `super_admin`

#### Response

**Success (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+86 138 0000 0000",
      "role": "participant",
      "isActive": true,
      "isDefault": true,
      "createdAt": "2026-06-18T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### 3. Get Current User

**GET** `/api/v1/users/me`

Get information about the currently authenticated user.

#### Authentication

Required: `Authorization: Bearer <token>`

#### Response

**Success (200)**:
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+86 138 0000 0000",
    "role": "participant",
    "isActive": true,
    "lastLoginAt": "2026-06-18T10:00:00.000Z",
    "createdAt": "2026-06-18T09:00:00.000Z"
  }
}
```

---

### 4. Update User

**PUT** `/api/v1/users/:id`

Update user information. Users can update their own information, super admins can update any user.

#### Authentication

Required: `Authorization: Bearer <token>`

Permissions: User can update own info, or `super_admin` can update any user

#### Request Body

```json
{
  "firstName": "John Updated",
  "lastName": "Doe Updated",
  "phone": "+86 139 0000 0000",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

#### Response

**Success (200)**:
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John Updated",
    "lastName": "Doe Updated",
    "phone": "+86 139 0000 0000",
    "avatarUrl": "https://example.com/avatar.jpg",
    "role": "participant",
    "isActive": true,
    "updatedAt": "2026-06-18T10:05:00.000Z"
  }
}
```

---

### 5. Delete User

**DELETE** `/api/v1/users/:id`

Soft delete a user (set `isActive` to false). Only super administrators can delete users.

#### Authentication

Required: `Authorization: Bearer <token>`

Required Role: `super_admin`

#### Response

**Success (200)**:
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Error (403)**:
```json
{
  "success": false,
  "message": "Cannot delete super admin"
}
```

---

## Testing with cURL

### Add user to tenant (tenant admin only)

```bash
curl -X POST http://localhost:3000/api/v1/tenants/TENANT_ID/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "email": "participant@example.com",
    "password": "password123",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "participant"
  }'
```

### Get tenant users (tenant admin only)

```bash
curl -X GET http://localhost:3000/api/v1/tenants/TENANT_ID/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get current user info

```bash
curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update user

```bash
curl -X PUT http://localhost:3000/api/v1/users/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "firstName": "Updated Name",
    "phone": "+86 139 0000 0000"
  }'
```

### Delete user (super admin only)

```bash
curl -X DELETE http://localhost:3000/api/v1/users/USER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Notes

1. **Password Hashing**: Passwords are automatically hashed using bcrypt before storage
2. **Soft Delete**: Deleting a user sets `isActive` to `false`, the record is not actually removed
3. **Super Admin Protection**: Super admin users cannot be deleted
4. **Multi-Tenant**: Users can belong to multiple tenants via `user_tenants` table
5. **RLS Enforcement**: Row-Level Security policies automatically filter data based on tenant context

---

## Author

AI Browser SaaS Platform Team

## Last Updated

2026-06-18
