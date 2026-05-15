# Data model

## User

**File**: `src/models/user.model.ts`
**Mongoose collection**: `users`

| Field            | Type    | Required | Notes                                              |
| ---------------- | ------- | -------- | -------------------------------------------------- |
| `name`           | String  | yes      | `trim: true`                                       |
| `email`          | String  | yes      | `unique: true`, `lowercase: true`, `trim: true`    |
| `hashedPassword` | String  | yes      | bcrypt hash, cost 10. Never returned in responses. |
| `loginedCount`   | Number  | no       | Default 0. Incremented on each successful login.   |
| `isBlocked`      | Boolean | no       | Default false. Blocked users cannot log in.        |
| `createdAt`      | Date    | auto     | Added by `timestamps: true`.                       |
| `updatedAt`      | Date    | auto     | Added by `timestamps: true`.                       |

**Invariants**:

- `email` is unique across all documents. Enforced by MongoDB index.
- `hashedPassword` is always a bcrypt hash — never plaintext.
- `isBlocked` is toggled via `PUT /api/users/toogle-block-user`.

**TypeScript interface**: `IUser extends Document` (exported from the model file).

---

_Update this file whenever a Mongoose schema changes. The `enforce-doc-sync.sh` Stop hook blocks the session if model files change without this file being updated._
