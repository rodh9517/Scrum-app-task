# Database Schema for Collaborative Workspaces

This document outlines the proposed relational database schema to support individual and collaborative workspaces.

## Tables

### `users`

Stores user information, authenticated via Google.

-   `id` (VARCHAR(255), PK): Google User ID (`sub`).
-   `name` (VARCHAR(255), NOT NULL): User's full name.
-   `email` (VARCHAR(255), UNIQUE, NOT NULL): User's email.
-   `picture_url` (TEXT): URL to the user's profile picture.
-   `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
-   `updated_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

---

### `workspaces`

Represents a workspace, which can be personal or collaborative.

-   `id` (UUID, PK): Unique identifier for the workspace.
-   `name` (VARCHAR(255), NOT NULL): Name of the workspace.
-   `is_personal` (BOOLEAN, DEFAULT FALSE): `TRUE` if it's a user's private workspace.
-   `owner_id` (VARCHAR(255), FK -> users.id): The user who owns/created the workspace. For personal workspaces, this is the user it belongs to.
-   `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
-   `updated_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

*Note: Each user will have exactly one workspace where `is_personal = TRUE` and `owner_id` is their own ID.*

---

### `workspace_members`

A join table to link users to the workspaces they are part of.

-   `workspace_id` (UUID, PK, FK -> workspaces.id)
-   `user_id` (VARCHAR(255), PK, FK -> users.id)
-   `role` (ENUM('ADMIN', 'MEMBER'), NOT NULL, DEFAULT 'MEMBER'): User's role within the workspace.
-   `joined_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

---

### `projects`

Projects are contained within a workspace.

-   `id` (UUID, PK): Unique identifier for the project.
-   `workspace_id` (UUID, FK -> workspaces.id, NOT NULL): The workspace this project belongs to.
-   `name` (VARCHAR(255), NOT NULL)
-   `color` (VARCHAR(7), NOT NULL): Hex color code for the project.
-   `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
-   `updated_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)

---

### `tasks`

Tasks belong to a project.

-   `id` (UUID, PK): Unique identifier for the task.
-   `project_id` (UUID, FK -> projects.id, NOT NULL): The project this task belongs to.
-   `title` (VARCHAR(255), NOT NULL)
-   `description` (TEXT)
-   `status` (ENUM('To Do', 'In Progress', 'Done'), NOT NULL, DEFAULT 'To Do')
-   `responsible_id` (VARCHAR(255), FK -> users.id): The user assigned to the task.
-   `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
-   `completed_at` (TIMESTAMP, NULLABLE)

---

### `subtasks`

Subtasks belong to a task.

-   `id` (UUID, PK): Unique identifier.
-   `task_id` (UUID, FK -> tasks.id, NOT NULL)
-   `text` (VARCHAR(255), NOT NULL)
-   `completed` (BOOLEAN, NOT NULL, DEFAULT FALSE)

---

### `messages`

Messages can be general or linked to a task, all within a workspace.

-   `id` (UUID, PK): Unique identifier.
-   `workspace_id` (UUID, FK -> workspaces.id, NOT NULL)
-   `user_id` (VARCHAR(255), FK -> users.id, NOT NULL)
-   `task_id` (UUID, FK -> tasks.id, NULLABLE): Optional link to a task.
-   `text` (TEXT, NOT NULL)
-   `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
