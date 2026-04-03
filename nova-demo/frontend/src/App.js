import React, { useState, useEffect } from "react";
import TaskForm from "./components/TaskForm";
import TaskList from "./components/TaskList";
import "./App.css";

function App() {
  return (
    <div className="App">
      <h1>Task Manager - Generated from NovaLang</h1>
      <TaskForm />
      <TaskList />
    </div>
  );
}

export default App;
