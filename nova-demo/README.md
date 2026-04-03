# NovaLang CRUD Demo

This is a demonstration of the NovaLang programming language - a high-level DSL for generating full-stack applications.

## Generated Artifacts

This demo was generated from NovaLang source code and includes:

### Backend (Node.js/Express)

- RESTful API for Task management
- CRUD operations: Create, Read, Update, Delete
- In-memory storage (easily swappable to database)

### Frontend (React)

- Task form for creating new tasks
- Task list with display of all tasks
- Toggle completion status
- Delete tasks

## Project Structure

```
nova-demo/
├── backend/
│   ├── server.js          # Express API server
│   ├── server.test.js     # API tests
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── TaskForm.js
│   │   │   ├── TaskList.js
│   │   │   └── TaskItem.js
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
└── README.md
```

## Running the Demo

### Prerequisites

- Node.js 16+
- npm or yarn

### Backend Setup

```bash
cd nova-demo/backend
npm install
npm start
```

Server runs on http://localhost:3000

### Frontend Setup

```bash
cd nova-demo/frontend
npm install
npm start
```

Frontend runs on http://localhost:3001 (or next available port)

### Running Tests

```bash
cd nova-demo/backend
npm test
```

## API Endpoints

| Method | Endpoint       | Description     |
| ------ | -------------- | --------------- |
| POST   | /api/tasks     | Create new task |
| GET    | /api/tasks     | List all tasks  |
| GET    | /api/tasks/:id | Get single task |
| PUT    | /api/tasks/:id | Update task     |
| DELETE | /api/tasks/:id | Delete task     |

## NovaLang Source

The original NovaLang source code that generated this project:

```
model Task {
  id: string @primary @auto
  title: string @required
  description: string
  completed: bool @default(false)
  createdAt: datetime @auto
}

api TaskApi {
  create: POST /api/tasks -> Task
  list: GET /api/tasks -> Task[]
  get: GET /api/tasks/:id -> Task
  update: PUT /api/tasks/:id -> Task
  delete: DELETE /api/tasks/:id -> void
}

component TaskForm { ... }
component TaskList { ... }
component TaskItem { ... }
```

## License

MIT License
