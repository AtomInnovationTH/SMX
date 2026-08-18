#!/usr/bin/env python3
"""
tools/check_emdash.py -- prove the project's no-em-dash rule holds for
Space_Monkey_Elevator.html, outside of comments.

The rule: no em dash (U+2014) in player-facing or repo-facing prose. Comments
are the one place em dashes are allowed (the shipped-copy sweep already
cleared every player-visible and code-visible dash from the file, so what is
left, and only what is left, lives inside a comment). This script proves that
by classifying every character in the file as "inside a comment" or not,
across the file's three contexts, and failing if any em dash falls outside
one.

Contexts and their comment forms:
  - HTML markup:            <!-- ... -->
  - CSS, inside <style>:    /* ... */ (block comments only)
  - JS, inside <script>:    // ... (to end of line) and /* ... */ (block),
                             with string and template-literal content
                             correctly excluded from comment detection so a
                             stray // or /* inside a quoted string is not
                             mistaken for a comment start.

One deliberate exception, called out explicitly rather than silently baked
in: the two SVG sprite templates use JS template literals whose content is
markup, and that markup itself carries HTML-comment artwork notes (<!-- ...
-->). Those notes are comments in every sense a reader cares about, so while
scanning the inside of a template literal this script also recognizes nested
<!-- ... --> spans and treats their contents as commented, the same way it
would outside a string.

This is a pragmatic state machine, not a full HTML/CSS/JS parser: it does not
attempt to handle regex literals, and it assumes (as is true today) exactly
one <style> block and one <script> block, each properly closed. It is
dependency-free and deterministic.

Exit 0: no em dash found outside a comment.
Exit 1: at least one em dash found outside a comment (each is reported with
its line number and a short excerpt).

Usage: python3 dev/tools/check_emdash.py [path]
Default path is Space_Monkey_Elevator.html, resolved relative to the repo
root regardless of the current working directory.
"""

import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_TARGET = os.path.join(ROOT, "Space_Monkey_Elevator.html")

EM_DASH = "\u2014"
EXCERPT_RADIUS = 12


def classify(text):
    """Walk the file once, return a list of bool, one per character: True if
    that character sits inside a comment (of any of the allowed forms)."""
    n = len(text)
    in_comment = [False] * n

    HTML, CSS, JS = "html", "css", "js"
    mode = HTML

    i = 0

    # JS sub-state.
    JS_CODE = "code"
    JS_LINE_COMMENT = "line_comment"
    JS_BLOCK_COMMENT = "block_comment"
    JS_STRING_SINGLE = "string_single"
    JS_STRING_DOUBLE = "string_double"
    JS_TEMPLATE = "template"
    js_state = JS_CODE

    # Inside a JS template literal, track whether we are further inside a
    # nested HTML-style artwork comment (<!-- ... -->); those are treated as
    # commented too.
    in_template_html_comment = False

    # HTML sub-state.
    html_in_comment = False

    # CSS sub-state.
    css_in_comment = False

    def starts_with(s, pos):
        return text.startswith(s, pos)

    def lower_starts_with(s, pos):
        return text[pos:pos + len(s)].lower() == s

    while i < n:
        ch = text[i]

        if mode == HTML:
            if html_in_comment:
                in_comment[i] = True
                if starts_with("-->", i):
                    in_comment[i + 1] = True
                    in_comment[i + 2] = True
                    html_in_comment = False
                    i += 3
                    continue
                i += 1
                continue
            if starts_with("<!--", i):
                for k in range(4):
                    in_comment[i + k] = True
                html_in_comment = True
                i += 4
                continue
            if lower_starts_with("<style", i):
                mode = CSS
                css_in_comment = False
                i += len("<style")
                continue
            if lower_starts_with("<script", i):
                mode = JS
                js_state = JS_CODE
                i += len("<script")
                continue
            i += 1
            continue

        if mode == CSS:
            if css_in_comment:
                in_comment[i] = True
                if starts_with("*/", i):
                    in_comment[i + 1] = True
                    css_in_comment = False
                    i += 2
                    continue
                i += 1
                continue
            if starts_with("/*", i):
                in_comment[i] = True
                in_comment[i + 1] = True
                css_in_comment = True
                i += 2
                continue
            if lower_starts_with("</style", i):
                mode = HTML
                html_in_comment = False
                i += len("</style")
                continue
            i += 1
            continue

        # mode == JS
        if js_state == JS_LINE_COMMENT:
            in_comment[i] = True
            if ch == "\n":
                js_state = JS_CODE
            i += 1
            continue

        if js_state == JS_BLOCK_COMMENT:
            in_comment[i] = True
            if starts_with("*/", i):
                in_comment[i + 1] = True
                js_state = JS_CODE
                i += 2
                continue
            i += 1
            continue

        if js_state in (JS_STRING_SINGLE, JS_STRING_DOUBLE):
            quote = "'" if js_state == JS_STRING_SINGLE else '"'
            if ch == "\\":
                i += 2
                continue
            if ch == quote:
                js_state = JS_CODE
                i += 1
                continue
            i += 1
            continue

        if js_state == JS_TEMPLATE:
            if in_template_html_comment:
                in_comment[i] = True
                if starts_with("-->", i):
                    in_comment[i + 1] = True
                    in_comment[i + 2] = True
                    in_template_html_comment = False
                    i += 3
                    continue
                i += 1
                continue
            if starts_with("<!--", i):
                for k in range(4):
                    in_comment[i + k] = True
                in_template_html_comment = True
                i += 4
                continue
            if ch == "\\":
                i += 2
                continue
            if ch == "`":
                js_state = JS_CODE
                i += 1
                continue
            i += 1
            continue

        # js_state == JS_CODE
        if lower_starts_with("</script", i):
            mode = HTML
            html_in_comment = False
            i += len("</script")
            continue
        if starts_with("//", i):
            in_comment[i] = True
            in_comment[i + 1] = True
            js_state = JS_LINE_COMMENT
            i += 2
            continue
        if starts_with("/*", i):
            in_comment[i] = True
            in_comment[i + 1] = True
            js_state = JS_BLOCK_COMMENT
            i += 2
            continue
        if ch == "'":
            js_state = JS_STRING_SINGLE
            i += 1
            continue
        if ch == '"':
            js_state = JS_STRING_DOUBLE
            i += 1
            continue
        if ch == "`":
            js_state = JS_TEMPLATE
            in_template_html_comment = False
            i += 1
            continue
        i += 1

    return in_comment


def excerpt(text, index):
    start = max(0, index - EXCERPT_RADIUS)
    end = min(len(text), index + EXCERPT_RADIUS + 1)
    snippet = text[start:end].replace("\n", "\\n")
    return snippet


def main():
    target = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_TARGET
    if not os.path.isabs(target):
        target = os.path.join(ROOT, target)

    with open(target, encoding="utf-8") as f:
        text = f.read()

    in_comment = classify(text)

    violations = []
    inside_count = 0
    for i, ch in enumerate(text):
        if ch != EM_DASH:
            continue
        if in_comment[i]:
            inside_count += 1
        else:
            line_no = text.count("\n", 0, i) + 1
            violations.append((line_no, excerpt(text, i)))

    rel = os.path.relpath(target, ROOT)
    if violations:
        print(f"FAIL: {len(violations)} em dash(es) found outside comments "
              f"in {rel}:", file=sys.stderr)
        for line_no, snippet in violations:
            print(f"  line {line_no}: ...{snippet}...", file=sys.stderr)
        return 1

    print(f"OK: 0 em dashes outside comments "
          f"({inside_count} inside comments, allowed)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
