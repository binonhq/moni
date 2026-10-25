# Connect iPhone Shortcuts

The backend receives only structured data. Notification parsing stays on the phone.

## Trigger and extraction

Use the notification automation trigger for MBBank if your iOS version offers it. Apple announced notification-triggered automations in its [WWDC26 Shortcuts update](https://developer.apple.com/videos/play/wwdc2026/310/). Earlier versions without that trigger cannot automatically read arbitrary bank notifications; use a manual text-input Shortcut or a supported SMS automation. Apple Intelligence availability depends on hardware, region, and language.

Pass notification text to the available Apple Intelligence model action. Ask it to extract the outgoing amount as a positive whole VND number and the original transaction timestamp as ISO 8601 with timezone. Stop for incoming transfers, missing amounts, uncertain dates, or ambiguous results. Validate the extracted fields on the iPhone before sending.

## HTTP action

1. Run `npm run token:rotate` from your trusted local project configured with the single Vercel/Neon database. Store the displayed token securely.
2. Add **Get Contents of URL** with URL `https://YOUR-PRODUCTION-DOMAIN/api/transactions` and method **POST**.
3. Add headers:
   - `Authorization`: `Bearer YOUR_TOKEN`
   - `Content-Type`: `application/json`
   - Optional `Idempotency-Key`: a UUID created once for this notification.
4. Set request body to **JSON**. Add `amount` (Number) and `timestamp` (Text). You can optionally add `title` (Text, up to 120 characters) and `categoryId` (an existing category UUID). Titles are capitalized automatically. Omit them to use `Expense` and Uncategorized.
5. Insert the actual extracted **Magic Variables** in the value fields. Do not type a variable's name as literal text.

```json
{
  "amount": 1000000,
  "timestamp": "2026-10-25T20:50:00+07:00"
}
```

Save the UUID and exact payload before making the request. Retries of the same notification must reuse both. Distinct transactions get distinct UUIDs, even when amount and time are identical.

## Results and failures

- `201`: created. Response contains `data.id` and `replayed: false`.
- `200` with `replayed: true`: same request already succeeded.
- `400`: invalid fields. Correct extraction before retrying.
- `401`: missing, invalid, or revoked token. Update the Shortcut's token.
- `409`: this key belongs to different data. Investigate rather than blindly issuing a new key.
- `429`: wait for the Retry-After interval.
- Network failure or `503`: preserve the key/payload, show a notification, and offer a deliberate retry. Do not mark it saved or retry forever.

If Get Contents of URL does not expose the status code, check the parsed JSON: `data.id` indicates success; `error.code` and `error.message` describe failure. A transport error may stop the Shortcut before JSON is returned, so keep pending data before the network action and provide a separate retry Shortcut if needed. Moni does not silently queue offline browser mutations.

## Manual test

Run with the example above and one fixed test UUID. Check for 1.000.000 ₫ at 20:50 Vietnam time. Repeat with the same UUID: one expense remains. A new UUID creates another expense. Delete the test expenses in Moni. Verify incoming or ambiguous notifications do not send anything, then enable the automation.

Use your stable Production domain, never a deployment-specific preview URL. The production API must be reachable by Shortcuts without a Vercel login page. It remains protected by its Bearer token. Rotation invalidates the old token immediately; settings can revoke access without exposing the token to the browser.
