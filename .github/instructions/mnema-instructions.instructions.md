---
applyTo: "**"
---

<!-- mnema:begin v4 (written by mnema; `mnema instructions --remove` takes it out) -->

## Recording the work (mnema)

This repository keeps a signed record of its decisions in `.mnema/`. Where the mnema tools are connected:

- At the start of a session, call `bootstrap`: it opens with what is in force, what awaits a judgement and the work in flight.
- Before changing a file, call `governing_rules` with its path.
- When a choice is settled, with the person or alone, that someone could later question (a library, an approach, a trade-off, an option turned down), call `record_decision` in that turn, with the `rationale` and, in `alternatives`, what was turned down and why. Record it even when it is also written in a plan, a ledger, this file or your own memory.
- A decision is born `proposed`; once it is accepted it is in force here. If the person dictated it, or chose it among options you offered (a recommended one included), accept it now with `decision_transition` and a note quoting their answer; one you concluded alone waits for the person. An agent’s acceptance is recorded as an agent’s, and `mnema switch off agent-accepts` leaves every acceptance to a person.
- A decision is not edited once it is recorded. When a new one replaces an earlier one, record the new one and then call `decision_transition` on the earlier one with `action` `supersede`, the new decision’s id in `by` and the `reason`; the new one is then read as replacing the earlier one, which it names.
- A subagent records no decision: it hands its decisions back in its final reply, and the session that started it records them.
- When you learn something about this project that its code does not show, call `capture_memory`, also when you keep it in your own memory.
- Work in flight is a task (`create_task`), and handing work to another agent is a handoff on it (`record_handoff`), with its brief: the short text, and the path of a file where the brief is long.
- Not for the record: each step taken, a credential, personal data, what the code or git already says.
- Commit `.mnema/` with the work it describes: the record changes as the work does, through these tools and the `mnema` command. Never edit or reformat its files by hand.

Where the tools are not connected and the `mnema` command is installed, the shell does the same. This records a decision, with what was turned down:

    mnema decision record "Use pnpm for the workspace" "The lockfile and the workspace scripts already assume it." --alternatives "npm: no workspace protocol; yarn: a second lockfile to keep"

And this one says a new decision replaces an earlier one:

    mnema decision supersede <old-id> <new-id> --reason "<why>"

<!-- mnema:end -->
