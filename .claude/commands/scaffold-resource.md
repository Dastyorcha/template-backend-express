Scaffold a new REST resource. The resource name is passed as the argument (e.g., `/scaffold-resource Post`).

If no argument is provided, ask the user for the resource name before proceeding.

Steps:

1. Derive: `ResourceName` (PascalCase), `resourceName` (camelCase), `resource-name` (kebab-case) from the argument.
2. Create `src/models/<resource-name>.model.ts`:
   - Export `I<ResourceName> extends Document` interface with at least `createdAt` and `updatedAt`.
   - Schema with `{ timestamps: true }`. Add a placeholder `title: { type: String, required: true, trim: true }` field — the user will replace it.
   - Export `mongoose.model<I<ResourceName>>("<ResourceName>", schema)`.
3. Create `src/controllers/<resource-name>/<resource-name>.controller.ts`:
   - CRUD handlers: `getAll`, `getById`, `create`, `update`, `delete`.
   - Each uses `sendResponse`, `sanitizeId` (for ID params), typed `req.body`.
   - `create` and `update` are private; `getAll` and `getById` are public (decide autonomously unless user specified).
4. Create `src/routes/<resource-name>.routes.ts`:
   - Public block: GET `/` (getAll), GET `/:id` (getById).
   - Private block with `authMiddleWare`: POST `/` (create), PUT `/:id` (update), DELETE `/:id` (delete).
5. Mount the router in `index.ts`: `app.use("/api/<resource-name>s", <resourceName>Routes)`.
6. Update `docs/api.md` with the new route table for this resource.
7. Update `docs/data-model.md` with the new model's fields and invariants.
8. Run `/codemap` to refresh `docs/codemap.md`.
9. Run `npm run typecheck` — fix any type errors before reporting done.

Apply the `backend-architect` skill throughout. ASK before installing packages.
