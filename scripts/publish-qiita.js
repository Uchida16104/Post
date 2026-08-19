import fs from "fs";
import matter from "gray-matter";

const articleFile = process.argv[2];
const token = process.env.QIITA_TOKEN;

if (!articleFile) {
  throw new Error(
    "Usage: node scripts/publish-qiita.js articles/example.md"
  );
}

if (!token) {
  throw new Error("QIITA_TOKEN is not set.");
}

// =========================================================
// 1. Qiita認証確認
// =========================================================

console.log("========================================");
console.log("Checking Qiita authentication...");
console.log("========================================");

const authResponse = await fetch(
  "https://qiita.com/api/v2/authenticated_user",
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  }
);

const authText = await authResponse.text();

console.log(`Qiita auth HTTP status: ${authResponse.status}`);

if (!authResponse.ok) {
  console.error("Qiita authentication failed.");
  console.error(authText);

  throw new Error(
    `Qiita authentication failed: HTTP ${authResponse.status}`
  );
}

let authenticatedUser;

try {
  authenticatedUser = JSON.parse(authText);
} catch {
  throw new Error(
    "Qiita authentication returned invalid JSON."
  );
}

console.log(
  `Authenticated Qiita user: ${authenticatedUser.id}`
);

console.log("Qiita authentication succeeded.");

// =========================================================
// 2. Markdown読み込み
// =========================================================

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

// =========================================================
// 3. 投稿データ
// =========================================================

const payload = {
  title: String(data.title),
  tags,
  private: false,
  coediting: false,
  tweet: false,
  body: content.trim(),
};

console.log("========================================");
console.log(`Publishing to Qiita: ${payload.title}`);
console.log("========================================");

// =========================================================
// 4. Qiita記事投稿
// =========================================================

const response = await fetch(
  "https://qiita.com/api/v2/items",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }
);

const responseText = await response.text();

if (!response.ok) {
  console.error("Qiita API error.");
  console.error(`HTTP status: ${response.status}`);
  console.error(`Response: ${responseText}`);

  throw new Error(
    `Qiita API failed: HTTP ${response.status}`
  );
}

let result;

try {
  result = JSON.parse(responseText);
} catch {
  throw new Error(
    "Qiita API returned invalid JSON."
  );
}

console.log("========================================");
console.log("Qiita published successfully.");
console.log("========================================");

console.log(
  `https://qiita.com/${result.user?.id}/items/${result.id}`
);
