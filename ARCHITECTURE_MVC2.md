# Frontend MVC2 structure

The React application follows an MVC2-inspired separation while keeping React as the view renderer.

```text
src/
|-- controllers/       Route selection, session state and UI orchestration
|-- models/            Booking state, rental-window and hold-timer rules
|-- services/          HTTP/API access and server communication
|-- utils/             Pure formatting and document helpers
|-- views/
|   |-- components/    Reusable presentation components
|   `-- pages/         Route-level views
|-- App.jsx            Application bootstrap
|-- main.jsx           React DOM entry point
`-- styles.css         Global design tokens and styles
```

## Dependency rules

- Views may call services and pure model helpers, but must not contain transport implementation.
- Controllers coordinate navigation, authentication state and view selection.
- Models contain deterministic business rules and must not depend on React.
- Services own HTTP, CSRF, upload and session communication.
- `App.jsx` and `main.jsx` only bootstrap the application.
