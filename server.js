import AppDataSource from "./api/database/dbConnection.js";
import express from "express";
import globalRoutes from "./api/routes/globalRouter.js";
import cors from "cors";

const app = express();
const port = process.env.PORT;

if (!port) throw new Error("Port is empty");

app.use(express.json());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

//Routing the global route folder here;
app.use("/api", globalRoutes);

// global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err.message);

  res.status(500).json({
    status: "error",
    message: err.message || "Internal Server Error",
  });
});

app.listen(port, () => {
  console.log(`server listening to port: ${port}`);
});
