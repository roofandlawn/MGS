# Developer sync validation panel

The field workspace now includes a development-only UI for running the existing Supabase lifecycle validation without typing console commands.

## Open the panel

Load the field workspace with this query parameter:

```text
?mgsValidation=1
```

Example for a local/dev deployment:

```text
/index.html?mgsValidation=1
```

When the parameter is absent, the validation CSS and JavaScript are not loaded and no validation controls are shown to field users.

## Safety boundary

The panel is for the development Supabase project only. It uses the deterministic validation fixture already defined by `supabase-sync-validation.js`; the Browser A / Browser B actions intentionally create or update that fixture in cloud storage.

It does **not** expose a normal technician-facing Sync button and it does not change the default local-first behavior of the app.

## Recommended sequence

1. Apply both Supabase migrations to the development project.
2. Configure the existing MGS Supabase feature flag with the development URL and anon key.
3. Open `/index.html?mgsValidation=1` in Browser A and Browser B.
4. Use **Local preflight** first. It should pass without a cloud connection.
5. If needed, use **Send sign-in link** to authenticate the browser against the already-configured development Supabase project.
6. In Browser A, run **Browser A: initial sync**.
7. In Browser B, run **Browser B: edit + hydrate**.
8. Back in Browser A, run **Browser A: return verify**.

The panel reports only the compact validation result: pass/fail, failed check names, revision, pending-photo count, upload counts, and hydration counts. It intentionally does not print photo `dataUrl` bytes, auth tokens, or the complete project object into the UI.

## What the panel checks

The lifecycle harness behind the panel verifies the same gate as the console-based process:

- deterministic project fixture and contract preflight;
- project metadata round trip;
- canonical system tags;
- checklist and closeout preservation;
- private Storage photo upload;
- fresh-device photo hydration;
- Browser B field-note return to Browser A;
- monotonic sync cursor/revision behavior;
- zero pending photo uploads after a successful lifecycle;
- local photo availability after hydration.

Viewer/editor/non-member RLS testing and forced-offline/storage-failure testing still require separate development users/network conditions and remain part of the release gate.

## Release gate

Do not expose the normal field-facing Sync action until the lifecycle sequence, RLS permission checks, and failure-mode checks all pass against the development Supabase project while local project/photo data remain usable.
