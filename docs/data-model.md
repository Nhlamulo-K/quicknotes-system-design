# QuickNotes Data Model

## 1. Overview

The database contains four entities: `users`, `notes`, `tags` and `note_tags`.

The model separates user accounts, note content and reusable tags. Primary keys uniquely identify records, while foreign keys maintain relationships between tables.

## 2. Entities and columns

### Users

| Column        | Type                                | Key / constraint                    |
| ------------- | ----------------------------------- | ----------------------------------- |
| id            | BIGINT GENERATED ALWAYS AS IDENTITY | Primary key                         |
| email         | VARCHAR(255)                        | NOT NULL, UNIQUE                    |
| password_hash | TEXT                                | NOT NULL                            |
| created_at    | TIMESTAMPTZ                         | NOT NULL, default current timestamp |

Passwords are stored as hashes, never as plain text.

### Notes

| Column     | Type                                | Key / constraint                    |
| ---------- | ----------------------------------- | ----------------------------------- |
| id         | BIGINT GENERATED ALWAYS AS IDENTITY | Primary key                         |
| user_id    | BIGINT                              | Foreign key to users.id, NOT NULL   |
| title      | VARCHAR(100)                        | NOT NULL                            |
| body       | TEXT                                | NOT NULL, default empty string      |
| created_at | TIMESTAMPTZ                         | NOT NULL, default current timestamp |
| updated_at | TIMESTAMPTZ                         | NOT NULL, default current timestamp |

### Tags

| Column  | Type                                | Key / constraint                  |
| ------- | ----------------------------------- | --------------------------------- |
| id      | BIGINT GENERATED ALWAYS AS IDENTITY | Primary key                       |
| user_id | BIGINT                              | Foreign key to users.id, NOT NULL |
| name    | VARCHAR(50)                         | NOT NULL                          |

The combination of `user_id` and `name` must be unique, so one user cannot create the same tag twice.

### Note_tags

| Column  | Type   | Key / constraint                               |
| ------- | ------ | ---------------------------------------------- |
| note_id | BIGINT | Foreign key to notes.id, primary-key component |
| tag_id  | BIGINT | Foreign key to tags.id, primary-key component  |

The composite primary key is `(note_id, tag_id)`.

## 3. Relationships

* **Users to notes: one-to-many.** One user can create many notes, but each note belongs to one user.
* **Users to tags: one-to-many.** One user can create many tags, but each tag belongs to one user.
* **Notes to tags: many-to-many.** One note can have multiple tags, and a tag can be assigned to multiple notes belonging to the same user.
* **Note_tags** implements the many-to-many relationship using two foreign keys.

## 4. SQL CREATE TABLE statements

Create the tables in this order so the referenced tables exist before their foreign keys are created.

```sql
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id)
        ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL
        CHECK (CHAR_LENGTH(TRIM(title)) > 0),
    body TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id)
        ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL
        CHECK (CHAR_LENGTH(TRIM(name)) > 0),
    UNIQUE (user_id, name),
    UNIQUE (id, user_id)
);

CREATE TABLE note_tags (
    note_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (note_id, tag_id),

    FOREIGN KEY (note_id, user_id)
        REFERENCES notes(id, user_id)
        ON DELETE CASCADE,

    FOREIGN KEY (tag_id, user_id)
        REFERENCES tags(id, user_id)
        ON DELETE CASCADE
);
```

The composite foreign keys ensure that a note and its tag belong to the same user. The `user_id` in `note_tags` is included to enforce this rule at database level.

## 5. Example SQL queries

### Query 1: Get a user's notes

```sql
SELECT id, title, body, created_at
FROM notes
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 10;
```

This returns the ten newest notes for user 1.

### Query 2: Find notes with their tags (JOIN)

```sql
SELECT
    n.id,
    n.title,
    t.name AS tag_name
FROM notes AS n
JOIN note_tags AS nt
    ON nt.note_id = n.id
JOIN tags AS t
    ON t.id = nt.tag_id
   AND t.user_id = n.user_id
WHERE n.user_id = 1
ORDER BY n.id;
```

This joins three tables to display each note with its assigned tags.

### Query 3: Count notes per user

```sql
SELECT
    u.id,
    u.email,
    COUNT(n.id) AS note_count
FROM users AS u
LEFT JOIN notes AS n
    ON n.user_id = u.id
GROUP BY u.id, u.email
ORDER BY note_count DESC;
```

The `LEFT JOIN` includes users who have not created any notes.

### Query 4: Create a note

```sql
INSERT INTO notes (user_id, title, body)
VALUES (1, 'Study plan', 'Practise PostgreSQL joins.')
RETURNING id, user_id, title, body, created_at;
```

In the production API, the user ID must come from the authenticated session rather than being trusted from arbitrary client input.

## 6. Indexes

```sql
CREATE INDEX idx_notes_user_created
ON notes (user_id, created_at DESC);

CREATE INDEX idx_note_tags_tag
ON note_tags (tag_id);
```

The first index supports retrieving a user's newest notes efficiently. The second helps find notes associated with a particular tag. Primary keys and unique constraints create their own supporting indexes.

Indexes consume storage and increase the cost of writes, so they should be added based on common query patterns and database performance measurements.

## 7. SQL versus NoSQL

I would choose **PostgreSQL, a relational SQL database**, for the initial QuickNotes backend. Users, notes and tags have clear relationships, and foreign keys and transactions help maintain data integrity. SQL also supports joins, filtering, sorting and reporting. NoSQL could be useful for particular future workloads, but a document database is not necessary merely because the service has one million users. Scaling, caching, indexing and read replicas should be considered before introducing another database technology.

## 8. Data integrity considerations

The application must validate titles and ownership before inserting or updating notes. The API should use parameterised SQL queries to prevent SQL injection. When updating `updated_at`, the application or a database trigger must set the new timestamp. Database backups and tested restoration procedures are required for production.
