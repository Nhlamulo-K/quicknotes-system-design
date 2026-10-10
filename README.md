# quicknotes-system-design

## Project description

QuickNotes is a notes management project that demonstrates how a browser-based application communicates with a REST API.

The front end uses HTML, CSS and JavaScript. JSONPlaceholder is used as a practice API to demonstrate GET, POST and DELETE requests. The project also includes backend design documents for a future QuickNotes service intended to support one million registered users.

## Features

- Load up to ten notes from a REST API.
- Create notes using POST requests.
- Delete notes using DELETE requests.
- Validate note titles, which are required and limited to 100 characters.
- Display loading, success, error and empty states.
- Disable buttons while requests are running.
- Render user-provided text safely using `textContent`.
- Document a proposed REST API, relational database and scalable architecture.

**Important:** JSONPlaceholder simulates creating and deleting posts. These changes are not permanently saved by the practice service. The client updates its local in-memory list to demonstrate the user experience.

## Technologies

- HTML5
- CSS3
- JavaScript (Fetch API, async/await)
- JSONPlaceholder REST API
- PostgreSQL for the proposed production data model
- Markdown for technical documentation

## Project structure

```text
QuickNotes/
├── index.html
├── style.css
├── api.js
├── README.md
└── docs/
    ├── api-design.md
    ├── data-model.md
    └── architecture.md
```

## How to run the API client

1. Clone or download this repository.
2. Open the project folder in Visual Studio Code.
3. Install the Live Server extension if it is not already installed.
4. Open `index.html`.
5. Right-click the file and select **Open with Live Server**.
6. Click **Load notes** to retrieve the practice posts.
7. Use the form to create a note and the Delete button to remove a note from the displayed list.

An internet connection is required to access JSONPlaceholder. The project does not require a backend server or database to run the practice client.

## Technical documentation

- [API Design](docs/api-design.md): Proposed production endpoints, JSON examples, authentication and error handling.
- [Data Model](docs/data-model.md): Database entities, relationships, SQL schema, queries and indexes.
- [Architecture](docs/architecture.md): Requirements, capacity estimates, architecture diagram, request flows, trade-offs and reliability.

## What I learned

1. **REST API communication:** How GET, POST and DELETE requests work and how to send JSON using the Fetch API.
2. **Asynchronous JavaScript:** How async/await, try/catch and finally help manage network requests and failures.
3. **DOM manipulation and validation:** How to render API responses safely, validate form input and update the interface.
4. **Relational database design:** How primary keys, foreign keys, joins and indexes support structured data.
5. **System architecture:** How load balancers, application servers, caching, read replicas and queues help a service scale.
6. **Error handling and reliability:** Why APIs need consistent errors, retries where appropriate, monitoring and redundancy.
