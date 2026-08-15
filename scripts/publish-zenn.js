import fs from "fs";
import matter from "gray-matter";

const articleFile = process.argv[2];

if (!articleFile) {
  throw new Error("Usage: node scripts/publish-zenn.js articles/example.md");
}

const raw = fs.readFileSync(articleFile, "utf8");
const { data } = matter(raw);

if (!data.title) {
  throw new Error("Zenn: title is required.");
}

if (!data.emoji) {
  throw new Error("Zenn: emoji is required.");
}

if (!["tech", "idea"].includes(data.type)) {
  throw new Error(
    `Zenn: type must be "tech" or "idea". Got: ${data.type}`
  );
}

if (!Array.isArray(data.topics)) {
  throw new Error("Zenn: topics must be an array.");
}

if (data.topics.length > 5) {
  throw new Error("Zenn: topics must contain at most 5 items.");
}

if (typeof data.published !== "boolean") {
  throw new Error("Zenn: published must be true or false.");
}

console.log("Zenn front matter is valid.");
console.log(`Title: ${data.title}`);
console.log(`Type: ${data.type}`);
console.log(`Published: ${data.published}`);
console.log("Zenn uses GitHub integration for deployment.");
