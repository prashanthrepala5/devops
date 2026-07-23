Built with Playwright, Axios, Nodemailer, dotenv, PizZip, and Docxtemplater.
The current project is an attempt to automate LinkedIn for the purpose of demonstrating PlayWright Automation. It does the following:
1. Uses a storageState to prevent repeated authentication and save the authentication session after doing it manually once.
2. Automates searching for "Java Developer" C2C roles based in the United States. Filters through posts and adds the past 24 hours filter. 
3. Extracts skills, roles relevant, matches them to the resume.json and all relevant skills are updated in your resume.
4. If an email is directly present in the post, it extracts it. Otherwise it uses a SignalHire API to extract based on the profile.
5. The e-mail sent may be verified at the sender's email.
NOTE: Create a .env file to store the API Key of SignalHire, sender EMAIL and Google APP Password.
DISCLAIMER: This is only a demonstration. Use only in accordance with LinkedIn terms and applicable policies.
## Setup

Install dependencies:

npm install

Create a `.env` file containing:

EMAIL=your_email
EMAIL_PASS=your_google_app_password
API_KEY=your_signalhire_api_key

Generate the LinkedIn authentication state:

node tests/login.js

Run the automation:

npx playwright test tests/linkedin-auto.spec.js

If UI changes, for relevant UI use PlayWright Inspector: 
npx playwright codegen https://www.linkedin.com/login