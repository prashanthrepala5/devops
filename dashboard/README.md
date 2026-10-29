# ReachOps dashboard

This responsive dashboard runs the existing Playwright search in **search-only mode** and returns live LinkedIn matches to the review queue. Dashboard summary figures and activity remain sample data. Each live match can be opened to review an email before sending; sending is always a separate, explicit action and attaches the selected candidate's existing resume. The dashboard does not run contact enrichment or generate a tailored resume.

## Run locally

Start the local Node server from the project root:

```sh
node dashboard/server.js
```

Then visit `http://localhost:8000`. Keep the server running while using the page. Search needs a valid LinkedIn session in `tests/login.json`; if the session has expired, refresh it with `node tests/login.js`.

## Enable reviewed email sending

Set `EMAIL` to the sending Gmail address and `EMAIL_PASS` to that account's Gmail App Password in the project `.env` file. Restart the dashboard after editing `.env`. Keep these values private. Open a live match to review the recipient, subject, and message, then use **Send reviewed email** and confirm the recipient. The selected candidate's existing resume is attached. Sample rows cannot send. If no address was detected in the LinkedIn post, you can enter one manually.

## Integration details

The dashboard's local API invokes the existing Playwright search with an opt-in `DASHBOARD_DRY_RUN` mode. Existing CLI runs retain their current behavior; only dashboard-launched runs set that mode. Email is sent from the local server with the project's existing Nodemailer dependency and Gmail credentials. No new dependency is required.
