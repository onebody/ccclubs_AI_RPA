# Competition Management API Documentation

## Overview

Competition management API for creating and managing competitions within tenants.

**Base URL**: `/api/v1/competitions`

**Authentication**: Required (JWT Token in Authorization header)

**Content-Type**: `application/json`

---

## Endpoints

### 1. Create Competition

**POST** `/api/v1/tenants/:tenantId/competitions`

Create a new competition within a tenant.

#### Authentication

Required: `Authorization: Bearer <token>`

Required Role: `tenant_admin` or `super_admin`

#### Request Body

```json
{
  "name": "Programming Contest 2024",
  "description": "Annual programming competition",
  "startDate": "2024-07-01T09:00:00Z",
  "endDate": "2024-07-03T18:00:00Z",
  "location": "Beijing Tech University",
  "category": "programming",
  "maxParticipants": 100,
  "registrationFee": 50.00,
  "settings": {
    "allowTeamRegistration": false,
    "requireApproval": true
  }
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Competition name |
| description | string | No | Competition description |
| startDate | string | Yes | Start date (ISO 8601) |
| endDate | string | Yes | End date (ISO 8601) |
| location | string | No | Competition location |
| category | string | No | Competition category |
| maxParticipants | int | No | Maximum number of participants |
| registrationFee | decimal | No | Registration fee (in currency) |
| settings | JSON | No | Competition-specific settings |

#### Response

**Success (201)**:
```json
{
  "success": true,
  "message": "Competition created successfully",
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "tenantId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Programming Contest 2024",
    "description": "Annual programming competition",
    "startDate": "2024-07-01T09:00:00.000Z",
    "endDate": "2024-07-03T18:00:00.000Z",
    "location": "Beijing Tech University",
    "category": "programming",
    "maxParticipants": 100,
    "registrationFee": 50.00,
    "status": "draft",
    "settings": {
      "allowTeamRegistration": false,
      "requireApproval": true
    },
    "isActive": true,
    "createdAt": "2026-06-18T10:00:00.000Z",
    "updatedAt": "2026-06-18T10:00:00.000Z"
  }
}
```

---

### 2. Get Tenant Competitions

**GET** `/api/v1/tenants/:tenantId/competitions`

Get list of competitions within a tenant.

#### Authentication

Required: `Authorization: Bearer <token>`

#### Response

**Success (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "tenantId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Programming Contest 2024",
      "description": "Annual programming competition",
      "startDate": "2024-07-01T09:00:00.000Z",
      "endDate": "2024-07-03T18:00:00.000Z",
      "location": "Beijing Tech University",
      "category": "programming",
      "status": "draft",
      "isActive": true,
      "createdAt": "2026-06-18T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### 3. Get Competition by ID

**GET** `/api/v1/competitions/:id`

Get details of a specific competition.

#### Authentication

Required: `Authorization: Bearer <token>`

#### Response

**Success (200)**:
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "tenantId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Programming Contest 2024",
    "description": "Annual programming competition",
    "startDate": "2024-07-01T09:00:00.000Z",
    "endDate": "2024-07-03T18:00:00.000Z",
    "location": "Beijing Tech University",
    "category": "programming",
    "maxParticipants": 100,
    "registrationFee": 50.00,
    "status": "draft",
    "settings": {
      "allowTeamRegistration": false,
      "requireApproval": true
    },
    "isActive": true,
    "createdAt": "2026-06-18T10:00:00.000Z",
    "updatedAt": "2026-06-18T10:00:00.000Z",
    "tenant": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Tech Competition 2024"
    }
  }
}
```

**Error (404)**:
```json
{
  "success": false,
  "message": "Competition not found"
}
```

---

### 4. Update Competition

**PUT** `/api/v1/competitions/:id`

Update competition information.

#### Authentication

Required: `Authorization: Bearer <token>`

Required Role: `tenant_admin` or `super_admin`

#### Request Body

```json
{
  "name": "Updated Competition Name",
  "description": "Updated description",
  "status": "published",
  "maxParticipants": 150
}
```

#### Response

**Success (200)**:
```json
{
  "success": true,
  "message": "Competition updated successfully",
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "name": "Updated Competition Name",
    "description": "Updated description",
    "status": "published",
    "maxParticipants": 150,
    "updatedAt": "2026-06-18T10:05:00.000Z"
  }
}
```

---

### 5. Delete Competition

**DELETE** `/api/v1/competitions/:id`

Soft delete a competition (set `isActive` to false).

#### Authentication

Required: `Authorization: Bearer <token>`

Required Role: `tenant_admin` or `super_admin`

#### Response

**Success (200)**:
```json
{
  "success": true,
  "message": "Competition deleted successfully"
}
```

---

## Competition Status Flow

```
draft → published → registration_open → registration_closed → ongoing → completed
                                    ↓
                                 cancelled
```

### Status Descriptions

| Status | Description |
|--------|-------------|
| `draft` | Competition is being prepared |
| `published` | Competition is published but registration not yet open |
| `registration_open` | Registration is open |
| `registration_closed` | Registration is closed |
| `ongoing` | Competition is in progress |
| `completed` | Competition has ended |
| `cancelled` | Competition has been cancelled |

---

## Testing with cURL

### Create competition (tenant admin only)

```bash
curl -X POST http://localhost:3000/api/v1/tenants/TENANT_ID/competitions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Competition",
    "description": "Test competition",
    "startDate": "2024-07-01T09:00:00Z",
    "endDate": "2024-07-03T18:00:00Z",
    "location": "Test Location",
    "category": "programming"
  }'
```

### Get tenant competitions

```bash
curl -X GET http://localhost:3000/api/v1/tenants/TENANT_ID/competitions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get competition by ID

```bash
curl -X GET http://localhost:3000/api/v1/competitions/COMPETITION_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update competition (tenant admin only)

```bash
curl -X PUT http://localhost:3000/api/v1/competitions/COMPETITION_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Updated Name",
    "status": "published"
  }'
```

### Delete competition (tenant admin only)

```bash
curl -X DELETE http://localhost:3000/api/v1/competitions/COMPETITION_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Notes

1. **Soft Delete**: Deleting a competition sets `isActive` to `false`, it doesn't actually delete the record
2. **RLS Enforcement**: Row-Level Security policies automatically filter competitions based on tenant context
3. **Status Validation**: Status transitions should follow the defined flow (implemented in business logic)
4. **Date Validation**: `endDate` must be after `startDate` (validated in controller)
5. **Multi-Tenant**: Competitions are automatically associated with the authenticated user's tenant

---

## Author

AI Browser SaaS Platform Team

## Last Updated

2026-06-18
