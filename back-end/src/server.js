import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";

await connectDB();
app.listen(process.env.PORT, () =>
  console.log(`Server on ${process.env.PORT}`),
);

// https://github.com/GuessoumNoufel/SupplyLink.git
