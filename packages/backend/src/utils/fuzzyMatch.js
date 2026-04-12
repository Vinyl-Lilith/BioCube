// packages/backend/src/utils/fuzzyMatch.js
// Levenshtein distance algorithm used for the forgot-password flow.
// If the user's attempt is "close enough" to their last password,
// they are let through and prompted to set a new one.

const { FUZZY_PASSWORD_THRESHOLD } = require('../config/constants');

// ── levenshtein(a, b) ─────────────────────────────────────────────────
// Returns the edit distance between two strings.
// Edit distance = minimum single-character edits (insert, delete, replace)
// needed to transform string a into string b.
function levenshtein(a, b) {
  // Build a 2D matrix of size (a.length+1) × (b.length+1)
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        // Characters match — no edit needed
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        // Take the minimum of: replace, delete, insert
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[a.length][b.length];
}

// ── isFuzzyMatch(attempt, reference) ─────────────────────────────────
// Returns true if the attempt is within FUZZY_PASSWORD_THRESHOLD edits
// of the reference string.  Both must be plaintext (not hashes).
function isFuzzyMatch(attempt, reference) {
  if (!attempt || !reference) return false;
  const distance = levenshtein(attempt, reference);
  return distance <= FUZZY_PASSWORD_THRESHOLD;
}

module.exports = { levenshtein, isFuzzyMatch };
