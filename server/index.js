import { createApp } from './src/app.js'
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 5000
const app = createApp()

app.listen(PORT, () => {
  console.log(`AraaMusic API listening on http://localhost:${PORT}`)
})
