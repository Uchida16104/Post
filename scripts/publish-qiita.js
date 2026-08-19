import fs from "fs";
import matter from "gray-matter";

const articleFile = process.argv[2];

if (!articleFile) {
  throw new Error(
    "Usage: node scripts/publish-qiita.js articles/example.md"
  );
}

const token = process.env.QIITA_TOKEN;

if (!token) {
  throw new Error("QIITA_TOKEN is not set.");
}

/**
 * ---------------------------------------------------------
 * 1. Qiita認証確認
 * ---------------------------------------------------------
 */
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

if (!authResponse.ok) {
  console.error("Qiita authentication failed.");
  console.error(`HTTP ${authResponse.status}`);
  console.error(authText);

  throw new Error(
    `Qiita authentication failed: HTTP ${authResponse.status}`
  );
}

const authenticatedUser = JSON.parse(authText);

console.log(
  `Authenticated Qiita user: ${authenticatedUser.id}`
);

/**
 * ---------------------------------------------------------
 * 2. Markdown読み込み
 * ---------------------------------------------------------
 */
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

/**
 * ---------------------------------------------------------
 * 3. Qiita記事データ
 * ---------------------------------------------------------
 */
const payload = {
  title: String(data.title),
  tags,
  private: false,
  coediting: false,
  tweet: false,
  body: content.trim(),
};

console.log(
  `Publishing to Qiita: ${payload.title}`
);

/**
 * ---------------------------------------------------------
 * 4. Qiitaへ投稿
 * ---------------------------------------------------------
 */
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

console.log("Qiita published successfully.");
console.log(
  `https://qiita.com/${result.user?.id}/items/${result.id}`
);
