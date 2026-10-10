const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.getElementById("load-btn");
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitButton = document.getElementById("submit-btn");
const statusMessage = document.getElementById("status");
const notesList = document.getElementById("notes-list");

let notes = [];

async function request(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    // DELETE may return an empty response body.
    if (response.status === 204) {
        return { data: null, status: response.status };
    }

    const data = await response.json();

    return {
        data,
        status: response.status
    };
}

function showStatus(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = type;
}

function renderNotes() {
    // Remove the old list before rendering the current notes.
    notesList.replaceChildren();

    if (notes.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.textContent = "No notes to display. Load or create a note.";
        emptyItem.className = "empty-state";
        notesList.appendChild(emptyItem);
        return;
    }

    notes.forEach((note) => {
        const item = document.createElement("li");
        item.className = "note-card";

        const title = document.createElement("h3");
        title.textContent = note.title;

        const body = document.createElement("p");
        body.textContent = note.body || "No body provided.";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete-btn";
        deleteButton.addEventListener("click", () => {
            deleteNote(note.id, deleteButton);
        });

        item.append(title, body, deleteButton);
        notesList.appendChild(item);
    });
}

async function loadNotes() {
    loadButton.disabled = true;
    showStatus("Loading notes...");

    try {
        const result = await request(`${API_URL}?_limit=10`);

        notes = result.data;
        renderNotes();

        if (notes.length === 0) {
            showStatus("No notes found.", "success");
        } else {
            showStatus(
                `Loaded ${notes.length} notes from the server.`,
                "success"
            );
        }
    } catch (error) {
        showStatus(
            "Sorry, we could not load your notes. Please try again.",
            "error"
        );
    } finally {
        loadButton.disabled = false;
    }
}

loadButton.addEventListener("click", loadNotes);
