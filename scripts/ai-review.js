// Flagship AI PR Reviewer
// Reads a PR diff, sends it to gpt-4o-mini, posts a structured review as a PR comment.
// Designed to run inside GitHub Actions on pull_request events.

const { execSync } = require("child_process");
const OpenAI = require("openai");
const { Octokit } = require("@octokit/rest");

const ENV = process.env;

function required(name) {
  const v = ENV[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

const githubToken = required("GITHUB_TOKEN");
const repo = required("GITHUB_REPOSITORY");
const prNumber = parseInt(required("PR_NUMBER"), 10);
const baseSha = required("BASE_SHA");
const headSha = required("HEAD_SHA");
const openaiEndpoint = required("OPENAI_ENDPOINT");
const openaiKey = required("OPENAI_API_KEY");

const [owner, repoName] = repo.split("/");

const octokit = new Octokit({ auth: githubToken });

const openai = new OpenAI({
  apiKey: openaiKey,
  baseURL: `${openaiEndpoint}openai/deployments/gpt-4o-mini`,
  defaultQuery: { "api-version": "2024-02-01" },
  defaultHeaders: { "api-key": openaiKey }
});

const MAX_DIFF_CHARS = 60000;
const MAX_COMPLETION_TOKENS = 1200;

const SYSTEM_PROMPT = `You are a senior code reviewer for the Flagship Procurement platform, an Azure-hosted SaaS application built with Node.js, Express, React, MySQL, Cosmos DB, and Azure OpenAI.

Your job is to review pull request diffs and produce a structured, actionable review. Be concise, specific, and honest.

Always respond with valid JSON matching this exact schema:
{
  "summary": "2-3 sentence overview of what this PR does",
  "verdict": "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
  "concerns": [
    { "severity": "BLOCKER" | "MAJOR" | "MINOR" | "NIT", "file": "path/to/file", "comment": "specific issue" }
  ],
  "highlights": ["positive observations or good practices to acknowledge"],
  "suggestions": ["concrete suggestions for improvement"]
}

Review priorities:
1. Security: secrets in code, SQL injection, XSS, auth bypass, exposed credentials
2. Correctness: logic errors, race conditions, null/undefined handling, error paths
3. Performance: N+1 queries, blocking I/O, memory leaks, unbounded loops
4. Maintainability: dead code, magic numbers, missing error handling, unclear naming
5. Architecture: consistency with existing patterns in the codebase

Skip nit-picky style issues unless they affect readability. Don't comment on every line — focus on what matters.
If the diff is trivial (typos, comments, small refactors), say so plainly and APPROVE.
If you see no concerns, return an empty concerns array.`;

async function getDiff() {
  // Get the diff between base and head SHAs
  try {
    const diff = execSync(`git diff ${baseSha} ${headSha}`, {
      maxBuffer: 50 * 1024 * 1024,
      encoding: "utf8"
    });
    return diff;
  } catch (e) {
    console.error("Failed to get git diff:", e.message);
    throw e;
  }
}

async function getChangedFiles() {
  try {
    const out = execSync(`git diff --name-only ${baseSha} ${headSha}`, { encoding: "utf8" });
    return out.split("\n").filter(Boolean);
  } catch (e) {
    return [];
  }
}

async function reviewDiff(diff, changedFiles) {
  let truncatedNote = "";
  if (diff.length > MAX_DIFF_CHARS) {
    diff = diff.substring(0, MAX_DIFF_CHARS);
    truncatedNote = `\n\n[NOTE: diff truncated at ${MAX_DIFF_CHARS} chars; original was longer]`;
  }

  const userPrompt = `Repository: ${repo}
PR #${prNumber}
Changed files (${changedFiles.length}): ${changedFiles.join(", ")}

DIFF:
${diff}${truncatedNote}

Provide your review as JSON.`;

  console.log(`Sending review request: diff size ${diff.length} chars, ${changedFiles.length} files`);
  const startedAt = Date.now();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ],
    max_tokens: MAX_COMPLETION_TOKENS,
    temperature: 0.2,
    response_format: { type: "json_object" }
  });

  const latencyMs = Date.now() - startedAt;
  const tokenUsage = completion.usage;
  const content = completion.choices[0].message.content;

  console.log(`Review generated in ${latencyMs}ms, ${tokenUsage.total_tokens} tokens`);

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse JSON response:", content);
    throw new Error("Model returned invalid JSON: " + e.message);
  }

  return { review: parsed, latencyMs, tokenUsage };
}

function formatComment(review, latencyMs, tokenUsage) {
  const verdictBadge = {
    APPROVE: ":white_check_mark: APPROVE",
    REQUEST_CHANGES: ":warning: REQUEST CHANGES",
    COMMENT: ":speech_balloon: COMMENT"
  }[review.verdict] || ":speech_balloon: COMMENT";

  const severityIcon = {
    BLOCKER: ":no_entry:",
    MAJOR: ":red_circle:",
    MINOR: ":yellow_circle:",
    NIT: ":small_blue_diamond:"
  };

  let body = `## :robot: AI Code Review\n\n`;
  body += `**Verdict:** ${verdictBadge}\n\n`;
  body += `### Summary\n${review.summary}\n\n`;

  if (review.concerns && review.concerns.length > 0) {
    body += `### Concerns (${review.concerns.length})\n\n`;
    for (const c of review.concerns) {
      const icon = severityIcon[c.severity] || ":small_blue_diamond:";
      body += `${icon} **${c.severity}** \`${c.file}\`: ${c.comment}\n\n`;
    }
  } else {
    body += `### Concerns\nNone raised.\n\n`;
  }

  if (review.highlights && review.highlights.length > 0) {
    body += `### Highlights\n`;
    for (const h of review.highlights) {
      body += `- ${h}\n`;
    }
    body += `\n`;
  }

  if (review.suggestions && review.suggestions.length > 0) {
    body += `### Suggestions\n`;
    for (const s of review.suggestions) {
      body += `- ${s}\n`;
    }
    body += `\n`;
  }

  body += `---\n`;
  body += `*Reviewed by gpt-4o-mini via Azure OpenAI · ${latencyMs}ms · `;
  body += `${tokenUsage.prompt_tokens} prompt + ${tokenUsage.completion_tokens} completion = ${tokenUsage.total_tokens} tokens · `;
  body += `est. cost $${((tokenUsage.prompt_tokens * 0.00015 + tokenUsage.completion_tokens * 0.0006) / 1000).toFixed(6)}*`;

  return body;
}

async function postComment(body) {
  await octokit.issues.createComment({
    owner,
    repo: repoName,
    issue_number: prNumber,
    body
  });
  console.log(`Posted review comment to PR #${prNumber}`);
}

async function main() {
  console.log(`Starting AI review for ${repo} PR #${prNumber}`);
  console.log(`Base SHA: ${baseSha}, Head SHA: ${headSha}`);

  const changedFiles = await getChangedFiles();
  console.log(`Changed files: ${changedFiles.length}`);

  if (changedFiles.length === 0) {
    console.log("No changed files detected; skipping review.");
    await postComment(":robot: **AI Review skipped** — no file changes detected between base and head.");
    return;
  }

  const diff = await getDiff();
  if (!diff || diff.trim().length === 0) {
    console.log("Empty diff; skipping review.");
    await postComment(":robot: **AI Review skipped** — diff is empty.");
    return;
  }

  const { review, latencyMs, tokenUsage } = await reviewDiff(diff, changedFiles);
  const commentBody = formatComment(review, latencyMs, tokenUsage);
  await postComment(commentBody);
  console.log("AI review complete.");
}

main().catch(e => {
  console.error("AI review failed:", e);
  process.exit(1);
});