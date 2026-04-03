import React from "react";

function TaskItem({ task, onRefresh }) {
  const toggleComplete = async () => {
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed }),
      });
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const deleteTask = async () => {
    try {
      await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className={`task-item ${task.completed ? "completed" : ""}`}>
      <div className="task-content">
        <h3>{task.title}</h3>
        {task.description && <p>{task.description}</p>}
        <small>Created: {formatDate(task.createdAt)}</small>
      </div>
      <div className="task-actions">
        <button
          onClick={toggleComplete}
          className={task.completed ? "btn-undo" : "btn-complete"}
        >
          {task.completed ? "Undo" : "Complete"}
        </button>
        <button onClick={deleteTask} className="btn-delete">
          Delete
        </button>
      </div>
    </div>
  );
}

export default TaskItem;
