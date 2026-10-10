# QuickNotes System Architecture

## 1. Purpose

QuickNotes is evolving from a browser-only application into an online service supporting approximately one million registered users. The architecture must support secure access, reliable note storage, horizontal scaling and recovery from component failures.

## 2. Functional requirements

1. Users can register, log in and securely access their accounts.
2. Users can create, read, update and delete notes.
3. Users can assign tags to notes and retrieve notes by tag.
4. Users can list, search and paginate through their notes.
5. Users can access their notes from supported web and mobile clients.
6. The API validates input and prevents access to another user's notes.
7. Users receive clear error messages when requests fail.
8. The system supports backups, monitoring and recovery.

## 3. Non-functional requirements

* **Scalability:** Add application servers as request volume increases.
* **Availability:** Avoid depending on a single application server or database instance.
* **Performance:** Aim for API response times below 300 ms at the 95th percentile for ordinary reads under the defined normal load, excluding slow external dependencies.
* **Security:** Use HTTPS, authenticated requests, authorisation checks, secure password hashing and managed secrets.
* **Durability:** Persist notes in the database and maintain tested backups.
* **Consistency:** Ensure successful writes are durable before confirming them to users.
* **Maintainability:** Use documented endpoints, automated tests, structured logs and deployment pipelines.
* **Observability:** Track latency, errors, throughput, database health and queue depth.

These are proposed engineering targets and should be validated through load testing and operational experience.

## 4. Load estimates for one million users

### Assumptions

| Metric                                   | Planning assumption |
| ---------------------------------------- | ------------------: |
| Registered users                         |           1,000,000 |
| Daily active users                       |       200,000 (20%) |
| Reads per active user per day            |                  20 |
| Writes per active user per day           |                   2 |
| Average stored notes per registered user |                 100 |
| Average text and metadata per note       |                2 KB |
| Average daily reads                      |           4,000,000 |
| Average daily writes                     |             400,000 |

### Average reads per second

Daily reads:

`200,000 × 20 = 4,000,000 reads/day`

Average reads per second:

`4,000,000 ÷ 86,400 ≈ 46.3 reads/second`

### Average writes per second

Daily writes:

`200,000 × 2 = 400,000 writes/day`

Average writes per second:

`400,000 ÷ 86,400 ≈ 4.63 writes/second`

These averages do not represent peak traffic. For preliminary capacity planning, assume a peak multiplier of 10:

* Peak reads: approximately 463 reads/second.
* Peak writes: approximately 46 writes/second.

Real traffic must be measured because usage may vary by time of day and by event.

### Annual storage estimate

Assume each registered user has 100 notes:

`1,000,000 × 100 = 100,000,000 notes`

At 2 KB per note:

`100,000,000 × 2 KB ≈ 200 GB`

This is the initial estimated storage for note text and basic metadata, using decimal units.

Assuming each active user creates 2 notes per day, annual note creation is:

`200,000 × 2 × 365 = 146,000,000 notes/year`

At 2 KB per note:

`146,000,000 × 2 KB ≈ 292 GB/year`

Therefore, the estimated **new note data is about 292 GB per year**, before indexes, replication, backups, logs and any retained versions.

The 200 GB initial dataset and 292 GB annual growth are separate estimates; do not add them together as though the initial dataset were newly created every year. Updates, deletions and retention policies will also affect actual storage.

If photos or file attachments are introduced later, they should be stored in object storage rather than directly in the notes table.

## 5. Architecture diagram

```text
 Client
   |
  DNS -> CDN -> Load Balancer
                   |
             +-----+-----+
             |           |
          App 1         App 2
             |           |
             +-----+-----+
                   |
             +-----+-----+
             |           |
           Cache       Queue
                         |
                       Worker
             |
        Primary DB
             |
        Read Replica
```

The diagram shows logical components rather than every network connection. In production, the application servers, cache, queue, worker and database should be deployed with appropriate network isolation, access controls, health checks and redundant instances.

## 6. Components and the problems they solve

* **Web/mobile client:** Provides the interface for creating, reading, updating and deleting notes.
* **DNS:** Resolves the service's domain name to the correct network entry point.
* **CDN:** Caches static assets near users, reducing latency and origin-server traffic.
* **Load balancer:** Distributes requests across healthy application servers and removes unhealthy instances from rotation.
* **Application servers:** Execute API logic, validate input, authenticate users and enforce note ownership; multiple instances support horizontal scaling.
* **Cache cluster:** Stores frequently accessed data temporarily, reducing repeated database reads.
* **Primary database:** Provides durable, transactional storage and accepts authoritative writes.
* **Read replica:** Serves eligible read queries and reduces read load on the primary database.
* **Queue:** Holds background jobs for asynchronous processing and absorbs temporary workload spikes.
* **Worker:** Processes queued jobs such as notifications, exports and cleanup without keeping the user's HTTP request waiting.

A queue should not be used to acknowledge a note write before the primary database has durably accepted that note. The initial API can write notes directly to the database and enqueue non-critical background work afterwards.

## 7. GET /notes request flow

1. The client sends `GET /v1/notes` over HTTPS with its access token.
2. DNS resolves the API domain to the service entry point.
3. The CDN serves eligible cached static assets; private note API responses must not be shared between users.
4. The load balancer forwards the request to a healthy application server.
5. The server validates the token and determines the authenticated user ID.
6. The application checks the cache for a safe, user-scoped cached result.
7. On a cache miss, the application queries the read replica when replication lag and consistency requirements permit; otherwise, it reads from the primary.
8. The database returns the user's notes in the requested order and page size.
9. The application serialises the result as JSON and returns `200 OK`.
10. The client renders the notes using text-safe DOM methods.

Cache entries must be scoped to the user and invalidated or updated when notes change. Read-after-write requests may need to use the primary database to avoid stale results.

## 8. POST /notes request flow

1. The client sends `POST /v1/notes` with a JSON title and body over HTTPS.
2. DNS resolves the API domain and the load balancer forwards the request to a healthy application server.
3. The server validates the access token, title length and request body.
4. The server obtains the owner ID from the authenticated identity rather than trusting a client-supplied user ID.
5. The application executes a parameterised SQL INSERT against the primary database, using a transaction where necessary.
6. The database commits the new note and returns its generated ID and timestamps.
7. The application invalidates or updates relevant cached note lists.
8. Any independent background jobs are published to the queue after the database write succeeds.
9. The application returns `201 Created` with the created note as JSON.
10. The client inserts the returned note into its visible list.

If a write fails, the server returns an appropriate error and must not claim that the note was saved.

## 9. Trade-offs

### Cache versus consistency

Caching reduces database load and improves read latency, but cached data can become stale. Use short, measured TTLs, user-scoped cache keys and invalidation after writes. Use the primary database for operations that require immediate read-after-write consistency.

### Read replicas versus immediate consistency

Read replicas distribute read traffic, but replication is often asynchronous. A recent write might not appear immediately on a replica. Route consistency-sensitive reads to the primary and monitor replica lag.

### Synchronous writes versus background jobs

Writing the note to the primary database before responding makes success meaningful and predictable, but database latency affects request latency. Background processing keeps non-critical work off the request path, but introduces queue retries, possible duplicate jobs and eventual completion. Workers should use retry limits and idempotent processing.

### More servers versus operating cost

Horizontal scaling increases capacity and availability but introduces more infrastructure, deployment complexity and monitoring requirements. Start with measured capacity and scale based on load tests and observed metrics.

## 10. Avoiding single points of failure

* Run at least two application-server instances across separate failure domains and use health checks with the load balancer.
* Deploy the cache as a redundant cluster or managed highly available service.
* Use a replicated, durable queue with monitored consumers and retry policies.
* Configure database high availability with automated failover where supported, plus tested backups and point-in-time recovery.
* Maintain a healthy read replica, while recognising that a replica is not automatically a replacement for a proper failover plan.
* Use redundant DNS and CDN infrastructure through the chosen provider's availability features.
* Monitor failover, backup restoration and disaster-recovery procedures through regular tests.

Redundancy reduces the risk of outages, but does not guarantee zero downtime. Database failover, replication lag, regional failures and misconfiguration still require operational planning.

## 11. Conclusion

QuickNotes can serve one million registered users by combining horizontally scalable application servers, a well-indexed relational database, controlled caching, read replicas and asynchronous background processing. Capacity estimates are starting points; load tests, security reviews, observability and failure-recovery exercises must validate the design before production deployment.
