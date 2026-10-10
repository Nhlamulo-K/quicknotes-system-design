# QuickNotes API Design

## 1. Purpose

QuickNotes is an online note-taking service that allows registered users to create, read, update, delete and organise their notes. The API uses REST principles and JSON for request and response bodies.

Base URL:

`https://api.quicknotes.example/v1`

Authentication uses a bearer access token. The server must verify that users can only access notes they own.

## 2. REST endpoints

| Method | Path               | Description                                          | Success status |
| ------ | ------------------ | ---------------------------------------------------- | -------------- |
| POST   | `/auth/register`   | Register a new user                                  | 201 Created    |
| POST   | `/auth/login`      | Authenticate a user                                  | 200 OK         |
| GET    | `/notes`           | List the authenticated user's notes, with pagination | 200 OK         |
| GET    | `/notes/{id}`      | Retrieve one note                                    | 200 OK         |
| POST   | `/notes`           | Create a note                                        | 201 Created    |
| PUT    | `/notes/{id}`      | Replace an existing note                             | 200 OK         |
| PATCH  | `/notes/{id}`      | Partially update a note                              | 200 OK         |
| DELETE | `/notes/{id}`      | Delete a note                                        | 204 No Content |
| GET    | `/tags`            | List the user's tags                                 | 200 OK         |
| POST   | `/notes/{id}/tags` | Assign a tag to a note                               | 201 Created    |

All note endpoints require authentication. The server must enforce ownership checks for notes and tags.

## 3. Create a note

### Request

`POST /v1/notes`

Headers:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

Request JSON:

```json
{
  "title": "Study plan",
  "body": "Revise SQL joins and database indexes."
}
```

### Successful response

Status: `201 Created`

```json
{
  "id": 101,
  "userId": 7,
  "title": "Study plan",
  "body": "Revise SQL joins and database indexes.",
  "createdAt": "2026-10-10T08:00:00Z",
  "updatedAt": "2026-10-10T08:00:00Z"
}
```

The server generates the note ID, associates the note with the authenticated user and assigns timestamps. The client must not choose another user's ID.

## 4. List notes

### Request

`GET /v1/notes?limit=10&cursor=`

The cursor is optional. The API returns only notes belonging to the authenticated user.

### Successful response

Status: `200 OK`

```json
{
  "data": [
    {
      "id": 101,
      "userId": 7,
      "title": "Study plan",
      "body": "Revise SQL joins and database indexes.",
      "createdAt": "2026-10-10T08:00:00Z",
      "updatedAt": "2026-10-10T08:00:00Z"
    },
    {
      "id": 102,
      "userId": 7,
      "title": "Shopping list",
      "body": "Milk, bread and fruit.",
      "createdAt": "2026-10-10T08:10:00Z",
      "updatedAt": "2026-10-10T08:10:00Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "nextCursor": null
  }
}
```

Pagination prevents the server from returning every note in a single response. Notes should be returned in a documented, stable order, such as newest first.

## 5. Error responses

The API uses standard HTTP status codes and a consistent JSON error structure.

| Status                    | Meaning                            | Example situation                               |
| ------------------------- | ---------------------------------- | ----------------------------------------------- |
| 400 Bad Request           | Invalid request                    | Missing title or malformed JSON                 |
| 401 Unauthorized          | Authentication required or invalid | Missing or expired access token                 |
| 403 Forbidden             | Operation not permitted            | Attempt to modify a resource without permission |
| 404 Not Found             | Resource not found                 | Note does not exist or is not accessible        |
| 409 Conflict              | Resource conflict                  | Duplicate unique value                          |
| 422 Unprocessable Content | Valid JSON but invalid data        | Title exceeds 100 characters                    |
| 429 Too Many Requests     | Rate limit exceeded                | Too many requests in a short period             |
| 500 Internal Server Error | Unexpected server failure          | Unhandled application error                     |
| 503 Service Unavailable   | Service temporarily unavailable    | Database service unavailable                    |

### Example error body

Status: `400 Bad Request`

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "field": "title",
        "message": "Title is required and must not exceed 100 characters."
      }
    ],
    "requestId": "req-example-123"
  }
}
```

Error responses must not expose passwords, access tokens, database credentials or internal stack traces.

## 6. Authentication and security

* Use HTTPS for all client-server communication.
* Store passwords using a suitable password-hashing algorithm.
* Require authentication for private note and tag operations.
* Validate and authorise every resource access on the server.
* Apply rate limits to authentication and other sensitive endpoints.
* Validate input lengths, formats and permitted fields.
* Keep secrets in environment variables or a managed secret store.
* Use database transactions for operations that must succeed or fail together.

## 7. API design decisions

The API uses resource-oriented URLs and standard HTTP methods. JSON makes it straightforward for browser, mobile and other clients to communicate with the service. Pagination controls response size, while consistent errors help clients display useful messages and handle failures predictably.
