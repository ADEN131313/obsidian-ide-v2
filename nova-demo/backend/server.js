const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

let tasks = [];
let nextId = 1;

// Generated from NovaLang API
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
