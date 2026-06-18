# Tenant Management API Documentation

## Overview

Multi-tenant management API for super administrators to manage tenants (organizations).

**Base URL**: `/api/v1/tenants`

**Authentication**: Required (JWT Token in Authorization header)

**Content-Type**: `application/json`

---

## Endpoints

### 1. Create Tenant

**POST** `/api/v1/tenants`

Create a new tenant (organization). Only super administrators can create tenants.

#### Authentication

Required: `Authorization: Bearer <token>`

Required Role: `super_admin`

#### Request Body

```json
{
  "name": "Tech Competition 2024",
  "slug": "tech-competition-2024",
  "description": "Annual technology competition",
  "contactEmail": "admin@techcompetition.com",
  "contactPhone": "+86 138 0000 0000",
  "settings": {
    "theme": "blue",
    "allowRegistration": true
  }
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Tenant name |
| slug | string | Yes | URL-friendly identifier (unique) |
| description | string | No | Tenant description |
| contactEmail | string | No | Contact email |
| contactPhone | string | No | Contact phone |
| settings | JSON | No | Tenant-specific settings |

#### Response

**Success (201)**:
```json
{
  "success": true,
  "message": "Tenant created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Tech Competition 2024",
    "slug": "tech-competition-2024",
    "description": "Annual technology competition",
    "contactEmail": "admin@techcompetition.com",
    "contactPhone": "+86 138 0000 0000",
    "settings": {
      "theme": "blue",
      "allowRegistration": true
    },
    "isActive": true,
    "createdAt": "2026-06-18T10:00:00.000Z",
    "updatedAt": "2026-06-18T10:00:00.000Z"
  }
}
```

**Error (409)**:
```json
{
  "success": false,
  "message": "Tenant slug already exists"
}
```

---

### 2. Get All Tenants

**GET** `/api/v1/tenants`

Get list of all tenants. Only super administrators can access this endpoint.

#### Authentication

Required: `Authorization: Bearer <token>`

Required Role: `super_admin`

#### Response

**Success (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Tech Competition 2024",
      "slug": "tech-competition-2024",
      "description": "Annual technology competition",
      "contactEmail": "admin@techcompetition.com",
      "contactPhone": "+86 138 0000 0000",
      "isActive": true,
      "createdAt": "2026-06-18T10:00:00.000Z",
      "updatedAt": "2026-06-18T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### 3. Get Tenant by ID

**GET** `/api/v1/tenants/:id`

Get details of a specific tenant.

#### Authentication

Required: `Authorization: Bearer <token>`

Required Role: `super_admin` or user belonging to the tenant

#### Response

**Success (200)**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Tech Competition 2024",
    "slug": "tech-competition-2024",
    "description": "Annual technology competition",
    "contactEmail": "admin@techcompetition.com",
    "contactPhone": "+86 138 0000 0000",
    "settings": {
      "theme": "blue",
      "allowRegistration": true
    },
    "isActive": true,
    "createdAt": "2026-06-18T10:00:00.000Z",
    "updatedAt": "2026-06-18T10:00:00.000Z"
  }
}
```

**Error (404)**:
```json
{
  "success": false,
  "message": "Tenant not found"
}
```

---

### 4. Update Tenant

**PUT** `/api/v1/tenants/:id`

Update tenant information.

#### Authentication

Required: `Authorization: Bearer <token>`

Required Role: `super_admin` or `tenant_admin` of this tenant

#### Request Body

```json
{
  "name": "Tech Competition 2024 Updated",
  "description": "Updated description",
  "contactEmail": "newadmin@techcompetition.com",
  "isActive": true
}
```

#### Response

**Success (200)**:
```json
{
  "success": true,
  "message": "Tenant updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Tech Competition 2024 Updated",
    "slug": "tech-competition-2024",
    "description": "Updated description",
    "contactEmail": "newadmin@techcompetition.com",
    "contactPhone": "+86 138 0000 0000",
    "isActive": true,
    "createdAt": "2026-06-18T10:00:00.000Z",
    "updatedAt": "2026-06-18T10:05:00.000Z"
  }
}
```

---

### 5. Delete Tenant

**DELETE** `/api/v1/tenants/:id`

Soft delete a tenant (set `isActive` to false). Only super administrators can delete tenants.

#### Authentication

Required: `Authorization: Bearer <token>`

Required Role: `super_admin`

#### Response

**Success (200)**:
```json
{
  "success": true,
  "message": "Tenant deleted successfully"
}
```

---

## Authentication Flow

### 1. Login to get JWT token

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@example.com",
    "password": "password123"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-id",
      "email": "superadmin@example.com",
      "role": "super_admin"
    }
  }
}
```

### 2. Use token in requests

```bash
curl -X GET http://localhost:3000/api/v1/tenants \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Error Codes

| HTTP Status | Message | Description |
|------------|---------|-------------|
| 400 | Validation error | Missing required fields |
| 401 | Authentication failed | Invalid or missing token |
| 403 | Insufficient permissions | User role not authorized |
| 404 | Not found | Resource not found |
| 409 | Conflict | Duplicate slug |
| 500 | Internal server error | Server error |

---

## Testing with cURL

### Create tenant (super admin only)

```bash
curl -X POST http://localhost:3000/api/v1/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Competition",
    "slug": "test-competition",
    "description": "Test competition organization",
    "contactEmail": "admin@test.com"
  }'
```

### Get all tenants (super admin only)

```bash
curl -X GET http://localhost:3000/api/v1/tenants \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get tenant by ID

```bash
curl -X GET http://localhost:3000/api/v1/tenants/TENANT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update tenant

```bash
curl -X PUT http://localhost:3000/api/v1/tenants/TENANT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Updated Name",
    "description": "Updated description"
  }'
```

### Delete tenant (super admin only)

```bash
curl -X DELETE http://localhost:3000/api/v1/tenants/TENANT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Notes

1. **Soft Delete**: Deleting a tenant sets `isActive` to `false`, it doesn't actually delete the record
2. **Slug Uniqueness**: Tenant slug must be unique across the system
3. **Super Admin Access**: Super administrators can access all tenants
4. **RLS Enforcement**: Row-Level Security policies are automatically applied based on the authenticated user's tenant context

---

## Author

AI Browser SaaS Platform Team

## Last Updated

2026-06-18
