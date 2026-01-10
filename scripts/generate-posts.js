import fs from "fs";
import path from "path";
import matter from "gray-matter";

const ARTICLES_DIR = "articles";
const OUTPUT = "posts.json";
const BASE_RAW =
  "https://raw.githubusercontent.com/Uchida16104/Post/main/articles";

const files = fs
  .readdirSync(ARTICLES_DIR)
  .filter(f => f.endsWith(".md"));

const posts = files.map(file => {
  const raw = fs.readFileSync(path.join(ARTICLES_DIR, file), "utf8");
  const { data } = matter(raw);

  if (!data.title || !data.date) {
    throw new Error(`Missing required front matter in ${file}`);
  }

  return {
    title: String(data.title),
    date: String(data.date),
    slug: data.slug ?? file.replace(".md", ""),
    url: `${BASE_RAW}/${file}`
  };
});

/* Stable ordering prevents noisy diffs */
posts.sort((a, b) => a.date.localeCompare(b.date));

const next = JSON.stringify(posts, null, 2);

/* Idempotency check */
if (fs.existsSync(OUTPUT)) {
  const prev = fs.readFileSync(OUTPUT, "utf8");
  if (prev === next) {
    console.log("No changes detected.");
    process.exit(0);
  }
}

fs.writeFileSync(OUTPUT, next);
console.log("posts.json updated.");
