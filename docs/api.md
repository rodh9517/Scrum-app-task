# API Endpoints for Workspace Management

This document defines the initial set of RESTful API endpoints required to manage workspaces, projects, and tasks.

**Base URL:** `/api/v1`

---

## Authentication

All endpoints require authentication. The user's identity (ID, email) should be available from a JWT or session token provided in the `Authorization` header.

---

## Workspaces

### `GET /workspaces`

-   **Description:** Fetches all workspaces the currently authenticated user is a member of.
-   **Response (200 OK):**
    ```json
    [
      {
        "id": "uuid-workspace-1",
        "name": "Mi Espacio Personal",
        "is_personal": true,
        "owner_id": "google-user-id"
      },
      {
        "id": "uuid-workspace-2",
        "name": "Equipo de Diseño",
        "is_personal": false,
        "owner_id": "google-user-id-owner"
      }
    ]
    ```

### `GET /workspaces/{workspaceId}`

-   **Description:** Fetches the complete data for a specific workspace, including projects, tasks, members, and messages. This is the main endpoint for loading a workspace dashboard.
-   **Response (200 OK):**
    ```json
    {
      "workspace": {
        "id": "uuid-workspace-2",
        "name": "Equipo de Diseño",
        "is_personal": false
      },
      "members": [
        { "id": "google-user-id-1", "name": "Ana López", "picture": "url" },
        { "id": "google-user-id-2", "name": "Carlos García", "picture": "url" }
      ],
      "projects": [
        { "id": "uuid-project-1", "name": "Rediseño Web", "color": "#4A90E2" }
      ],
      "tasks": [
        { "id": "uuid-task-1", "title": "...", "projectId": "uuid-project-1", "responsibleId": "google-user-id-1", "status": "In Progress" }
      ],
      "messages": [
        { "id": "uuid-message-1", "text": "Hola equipo", "userId": "google-user-id-1", "createdAt": "iso-date" }
      ]
    }
    ```

---

## Tasks

### `POST /tasks`

-   **Description:** Creates a new task within a project.
-   **Request Body:**
    ```json
    {
      "projectId": "uuid-project-1",
      "title": "Nueva Tarea",
      "description": "...",
      "responsibleId": "google-user-id-1"
    }
    ```
-   **Response (201 Created):** The newly created task object.

### `PUT /tasks/{taskId}`

-   **Description:** Updates an existing task (e.g., status, title, responsible person).
-   **Request Body:** A partial or full task object.
    ```json
    {
      "status": "Done",
      "completedAt": "iso-date"
    }
    ```
-   **Response (200 OK):** The updated task object.

### `DELETE /tasks/{taskId}`

-   **Description:** Deletes a task.
-   **Response (204 No Content):**

---
## Projects and Users (within a workspace)

*CRUD endpoints for projects and managing workspace members would follow a similar RESTful pattern.*

### `POST /workspaces/{workspaceId}/members`
### `PUT /projects/{projectId}`
### `DELETE /projects/{projectId}`

...and so on.
