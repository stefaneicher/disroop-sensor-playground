"""Orientation: which docs exist, where does the project stand."""
from __future__ import annotations

from invoke import task

from ._lib import REPO_URL, ROOT, open_browser, say, sh

DONE, WIP, TODO = "✅", "🔄", "⬜"


def doc_titles(docs_dir=ROOT / "docs") -> list[tuple[str, str]]:
    """(relative path, first heading) of README and docs/*.md."""
    files = [ROOT / "README.md", *sorted(docs_dir.glob("*.md")), ROOT / "tasks" / "README.md"]
    result = []
    for f in files:
        if f.exists():
            heading = next((line.lstrip("# ").strip() for line in f.read_text(encoding="utf-8").splitlines()
                            if line.startswith("#")), "")
            result.append((str(f.relative_to(ROOT)), heading))
    return result


def progress_rows(text: str) -> list[tuple[str, str, str]]:
    """Milestone rows (nr, title, status emoji) from the PROGRESS.md table."""
    rows = []
    for line in text.splitlines():
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) >= 3 and cells[0].isdigit():
            rows.append((cells[0], cells[1].replace("**", ""), cells[2]))
    return rows


def summarize_progress(text: str) -> str:
    rows = progress_rows(text)
    counts = " · ".join(f"{icon} {sum(1 for r in rows if r[2] == icon)}" for icon in (DONE, WIP, TODO))
    open_rows = [f"  {status} {nr:>2} {title}" for nr, title, status in rows if status != DONE]
    return "\n".join([f"Meilensteine: {counts}", *open_rows])


@task(help={"web": "README auf GitHub im Browser öffnen"})
def docs(c, web=False):
    """Listet die Dokumentation – mit --web öffnet sie auf GitHub."""
    if web:
        open_browser(c, f"{REPO_URL}#readme")
        return
    for path, heading in doc_titles():
        say(f"📄 {path:<28} {heading}")
    say(f"\nOnline: {REPO_URL}")


@task
def status(c):
    """Projektstand: letzte Commits, offene Meilensteine aus PROGRESS.md, Git-Änderungen."""
    sh(c, "git --no-pager log --oneline -5", pty=False)
    progress = ROOT / "PROGRESS.md"
    if progress.exists():
        say("\n" + summarize_progress(progress.read_text(encoding="utf-8")))
    say("")
    sh(c, "git status --short", pty=False)
