const request = require("supertest");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let tasks = [];
let nextId = 1;

app.post("/api/tasks", (req, res) => {
  const task = {
    id: (nextId++).toString(),
    title: req.body.title,
    description: req.body.description || "",
    completed: false,
    createdAt: new Date(),
  };
  tasks.push(task);
  res.json({ task });
});

app.get("/api/tasks", (req, res) => {
  res.json({ tasks });
});

app.get("/api/tasks/:id", (req, res) => {
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json({ task });
});

app.put("/api/tasks/:id", (req, res) => {
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  Object.assign(task, req.body);
  res.json({ task });
});

app.delete("/api/tasks/:id", (req, res) => {
  const index = tasks.findIndex((t) => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Task not found" });
  tasks.splice(index, 1);
  res.json({ success: true });
});

describe("Task API", () => {
  beforeEach(() => {
    tasks = [];
    nextId = 1;
  });

  test("POST /api/tasks creates a task", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({ title: "Test Task", description: "Test desc" });
    expect(res.status).toBe(200);
    expect(res.body.task.title).toBe("Test Task");
  });

  test("GET /api/tasks lists tasks", async () => {
    const res = await request(app).get("/api/tasks");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tasks)).toBe(true);
  });

  test("PUT /api/tasks/:id updates task", async () => {
    const createRes = await request(app)
      .post("/api/tasks")
      .send({ title: "Update Test" });
    const taskId = createRes.body.task.id;

    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .send({ completed: true });
    expect(res.status).toBe(200);
    expect(res.body.task.completed).toBe(true);
  });

  test("DELETE /api/tasks/:id removes task", async () => {
    const createRes = await request(app)
      .post("/api/tasks")
      .send({ title: "Delete Test" });
    const taskId = createRes.body.task.id;

    const res = await request(app).delete(`/api/tasks/${taskId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
