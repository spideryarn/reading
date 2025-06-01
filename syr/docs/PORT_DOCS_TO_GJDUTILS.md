This repo is about the Spideryarn reading app.

We have cloned `gjdutils/` from https://github.com/gregdetre/gjdutils - this is my open source repository of useful scripts, snippets, and LLM prompts.

Every so often I would like to take a look at `docs/*.md`, and examine whether there are any docs in there that could usefully be ported over to `gjdutils/docs/`. For example `docs/WRITE_PLANNING_DOCS.md` also exists as `gjdutils/docs/writing_planning_docs.md`.

I am actively improving & adding to `docs/` as I develop Spideryarn Reading, and so I would like to occasionally update `gjdutils/docs/` to include these improvements The tricky part is that while some of the docs in this app's `docs/` are generic and could be of widespread utility (copied, perhaps with light modification), some of the docs in this app's `docs/` are specific to this app, and it wouldn't make sense to include them in `gjdutils/docs/`.

Use a subagent to gather information about what's in each folder, and then make a proposal for:
- docs that exist in both, so we should compare, and see if there are any improvements from `docs/` to port/update in `gjdutils/docs/` (or perhaps even vice versa)
- docs that only exist in `docs/` and should be ported to `gjdutils/docs/` (or perhaps even vice versa)
- docs that should be renamed
- docs that should be removed (though probably there should be a good reason for this, e.g. there are duplicates, or we agree the doc is bad/out of date in some clear way)

Then discuss the proposal with the user. Don't make changes until they have been agreed.

Once agreed, use tasks and subagents (provided with rich context) to make the updates.
