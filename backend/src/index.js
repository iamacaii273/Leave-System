const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Public routes
app.use("/api/auth", require("./routes/auth"));

// Protected routes
app.use("/api/users", require("./routes/users"));
app.use("/api/leave-types", require("./routes/leaveTypes"));
app.use("/api/leave-requests", require("./routes/leaveRequests"));
app.use("/api/leave-balances", require("./routes/leaveBalances"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/metadata", require("./routes/metadata"));

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
