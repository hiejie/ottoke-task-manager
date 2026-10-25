import express from "express";
import mongoose from "mongoose";
import Task from "../models/task.js";

const router = express.Router();

// GET /api/tasks
// Read all tasks
router.get("/", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve tasks." });
  }
});

// GET /api/tasks/:id
// Read one task
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID." });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve task." });
  }
});

// POST /api/tasks
// Create a task
router.post("/", async (req, res) => {
  try {
    const { title, description, dueDate, priority } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        message: "Task title is required."
      });
    }

    const task = await Task.create({
      title: title.trim(),
      description,
      dueDate,
      priority
    });

    res.status(201).json(task);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid task data.",
        error: error.message
      });
    }

    res.status(500).json({ message: "Failed to create task." });
  }
});

// PATCH /api/tasks/:id
// Update selected task fields
router.patch("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID." });
    }

    const allowedFields = [
      "title",
      "description",
      "dueDate",
      "priority",
      "completed"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update."
      });
    }

    if ("title" in updates) {
      if (typeof updates.title !== "string" || !updates.title.trim()) {
        return res.status(400).json({
          message: "Task title cannot be empty."
        });
      }

      updates.title = updates.title.trim();
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true
      }
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    res.status(200).json(task);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid task data.",
        error: error.message
      });
    }

    res.status(500).json({ message: "Failed to update task." });
  }
});

// DELETE /api/tasks/:id
// Delete a task
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID." });
    }

    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    res.status(200).json({
      message: "Task deleted successfully.",
      id: task._id
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete task." });
  }
});

export default router;
