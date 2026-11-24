<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

<!-- AGENT-MEMORY:BEGIN -->
- Store curriculum records in `curriculos` with one record per user and expose only completed rows publicly; owner and administrator policies provide access to hidden drafts.
- Keep the caregiver wizard in CuidadoresApp and coordination in a separate administration route; scoped CSS variables preserve the existing site theme.
- Validate administrator privileges through user_roles and authenticated server functions before privileged Auth API operations; never authorize through email or browser storage.
- Change administrative roles through the transactional set_admin_role function; its lock and last-administrator guard prevent simultaneous removals from leaving no administrator.
- Serialize autosave writes and keep owner-scoped recovery drafts until the newest write succeeds; stale requests must never overwrite newer input.
- Render print models from the same curriculum record in a hidden print area; document variants do not duplicate stored data.
<!-- AGENT-MEMORY:END -->
