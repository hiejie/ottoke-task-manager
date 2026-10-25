import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import taskRoutes from "./routes/taskRoutes.js";

dotenv.config();

const app= express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static("public"));

//test
app.get("/api", (req, res) => {
  res.status(200).json({
    message: "Ottoke API is running!"
  });
});

// Register task API routes
app.use("/api/tasks", taskRoutes);

// Connect to the database, then start the server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Could not start Ottoke:", error.message);
    process.exit(1);
  }
};

startServer();