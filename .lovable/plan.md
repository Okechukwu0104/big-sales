

## Add joyadaeze845@gmail.com as Admin

The user exists (ID: `e833339d-c6bc-4fc4-b7c4-43df5d41820d`). I need to insert a row into the `user_roles` table to grant admin access.

### SQL to Execute
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('e833339d-c6bc-4fc4-b7c4-43df5d41820d', 'admin');
```

### Verification
After insertion, verify with:
```sql
SELECT * FROM user_roles WHERE user_id = 'e833339d-c6bc-4fc4-b7c4-43df5d41820d';
```

The user will immediately have access to `/admin` routes once this record exists.

