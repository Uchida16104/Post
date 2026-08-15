import fs from "fs";
import matter from "gray-matter";

const articleFile = process.argv[2];

if (!articleFile) {
  throw new Error("Usage: node scripts/publish-qiita.js articles/example.md");
}

if (!process.env.QIITA_TOKEN) {
  throw new Error("QIITA_TOKEN is not set.");
}

const raw = fs.readFileSync(articleFile, "utf8");
const { data, content } = matter(raw);

if (!data.title) {
  throw new Error("title is required.");
}

const topics = Array.isArray(data.topics)
  ? data.topics
  : [];

if (topics.length === 0) {
  throw new Error("topics is required.");
}

const tags = topics.map((name) => ({
  name: String(name),
  versions: [],
}));

const payload = {
  title: String(data.title),
  tags,
  private: false,
  coediting: false,
  tweet: false,
  body: content.trim(),
};

console.log(`Publishing to Qiita: ${payload.title}`);

const response = await fetch("https://qiita.com/api/v2/items", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.QIITA_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const responseText = await response.text();

if (!response.ok) {
  console.error(responseText);
  throw new Error(
    `Qiita API failed: HTTP ${response.status}`
  );
}

const result = JSON.parse(responseText);

console.log("Qiita published successfully.");
console.log(`https://qiita.com/${result.user?.id}/items/${result.id}`);
