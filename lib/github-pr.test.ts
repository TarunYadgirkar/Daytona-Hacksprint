import assert from "node:assert/strict";
import test from "node:test";
import {
  githubPullRequestId,
  parseGitHubPullRequest,
} from "./github-pr";

test("parses public GitHub pull request URLs and stable identifiers", () => {
  const ref = parseGitHubPullRequest(
    "https://github.com/TarunYadgirkar/popper-demo-cart/pull/1",
  );
  assert.deepEqual(ref, {
    owner: "TarunYadgirkar",
    repo: "popper-demo-cart",
    number: 1,
  });
  assert.equal(
    githubPullRequestId(ref),
    "github:TarunYadgirkar/popper-demo-cart#1",
  );
  assert.deepEqual(
    parseGitHubPullRequest(githubPullRequestId(ref)),
    ref,
  );
});

test("rejects non-GitHub and non-PR URLs", () => {
  assert.throws(
    () => parseGitHubPullRequest("https://example.com/owner/repo/pull/1"),
    /github\.com/,
  );
  assert.throws(
    () => parseGitHubPullRequest("https://github.com/owner/repo/issues/1"),
    /shaped like/,
  );
});
