import fs from "node:fs";
import { rtdb } from "../middleware/firebase.js";

async function fetchData() {
  try {
    const snapshot = await rtdb.ref("songs").once("value");
    const songs = snapshot.val();

    if (!songs) {
      console.log("No songs found.");
      return;
    }

    const ids = Object.keys(songs);

    fs.writeFileSync(
      "./song.js",
      JSON.stringify(ids, null, 2),
      "utf8"
    );

    console.log(`Total songs: ${ids.length}`);
    console.log(`Saved to: ./songs.json`);
  } catch (err) {
    console.error("Failed:", err);
  }
}

fetchData();