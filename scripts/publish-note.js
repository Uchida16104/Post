import fs from "fs";
import matter from "gray-matter";
import crypto from "crypto";

const articleFile = process.argv[2];

if (!articleFile) {
  throw new Error("Usage: node scripts/publish-note.js articles/example.md");
}

if (!process.env.NOTE_SESSION_V5) {
  throw new Error("NOTE_SESSION_V5 is not set.");
}

const raw = fs.readFileSync(articleFile, "utf8");
const { data, content } = matter(raw);

if (!data.title) {
  throw new Error("note: title is required.");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function markdownToNoteHtml(markdown) {
  const lines = markdown
    .replace(/\r\n/g, "\n")
    .split("\n");

  const blocks = [];
  let paragraph = [];

  function flushParagraph() {
    if (paragraph.length === 0) {
      return;
    }

    const text = paragraph.join("\n").trim();

    if (!text) {
      paragraph = [];
      return;
    }

    const id = crypto.randomUUID();

    blocks.push(
      `<p name="${id}" id="${id}">${escapeHtml(text).replace(
        /\n/g,
        "<br>"
      )}</p>`
    );

    paragraph = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();

      const id = crypto.randomUUID();
      const text = escapeHtml(trimmed.slice(4));

      blocks.push(
        `<h3 name="${id}" id="${id}">${text}</h3>`
      );

      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();

      const id = crypto.randomUUID();
      const text = escapeHtml(trimmed.slice(3));

      blocks.push(
        `<h2 name="${id}" id="${id}">${text}</h2>`
      );

      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushParagraph();

      const id = crypto.randomUUID();
      const text = escapeHtml(trimmed.slice(2));

      blocks.push(
        `<h1 name="${id}" id="${id}">${text}</h1>`
      );

      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();

      const id = crypto.randomUUID();
      const text = escapeHtml(trimmed.slice(2));

      blocks.push(
        `<p name="${id}" id="${id}">・${text}</p>`
      );

      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();

  return blocks.join("");
}

const htmlBody = markdownToNoteHtml(content);

const headers = {
  "Content-Type": "application/json",
  "Cookie": `_note_session_v5=${process.env.NOTE_SESSION_V5}`,
  "X-Requested-With": "XMLHttpRequest",
  Origin: "https://editor.note.com",
  Referer: "https://editor.note.com/",
};

console.log(`Creating note draft: ${data.title}`);

const createResponse = await fetch(
  "https://note.com/api/v1/text_notes",
  {
    method: "POST",
    headers,
    body: JSON.stringify({
      body: "",
      body_length: 0,
      name: data.title,
      index: false,
      is_lead_form: false,
    }),
  }
);

const createText = await createResponse.text();

if (!createResponse.ok) {
  console.error(createText);
  throw new Error(
    `note create failed: HTTP ${createResponse.status}`
  );
}

const createData = JSON.parse(createText);

const noteId = createData?.data?.id;

if (!noteId) {
  console.error(createText);
  throw new Error("note ID was not returned.");
}

console.log(`note ID: ${noteId}`);

const draftPayload = {
  body: htmlBody,
  body_length: htmlBody.length,
  name: data.title,
  index: false,
  is_lead_form: false,
};

const draftResponse = await fetch(
  `https://note.com/api/v1/text_notes/draft_save?id=${noteId}&is_temp_saved=true`,
  {
    method: "POST",
    headers,
    body: JSON.stringify(draftPayload),
  }
);

const draftText = await draftResponse.text();

if (!draftResponse.ok) {
  console.error(draftText);
  throw new Error(
    `note draft save failed: HTTP ${draftResponse.status}`
  );
}

console.log("note draft created successfully.");
console.log(`note ID: ${noteId}`);
