const { test, expect } = require('@playwright/test');
const axios = require('axios');
const nodemailer = require('nodemailer');
require('dotenv').config();
const fs = require("fs");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS
    }
});

test.use({
    storageState: 'tests/login.json'
});

test('LinkedIn Search', async ({ page }) => {
    test.setTimeout(180000);
    await page.goto('https://www.linkedin.com/feed/');
    await expect(page).toHaveURL(/feed/);
    await page.getByTestId('typeahead-input').click();
    await page.getByTestId('typeahead-input').fill('"JAVA DEVELOPER" CONTRACT "United States"');
    await page.goto('https://www.linkedin.com/search/results/all/?keywords=%22JAVA%20DEVELOPER%22%20CONTRACT%20%22United%20states%22&origin=HISTORY&position=0',{
            waitUntil:'commit'
        }
    );
    await page.getByRole('radio', { name: 'Filter by Posts' }).click();
    await page.getByRole('button', { name: 'Filter by Date posted' }).click();
    await page.getByRole('radio', { name: 'Past 24 hours' }).click();
    await page.getByRole('link', { name: 'Show results' }).click();
    const profileLinks = page.locator('a[href*="/in/"]');
await profileLinks.first().waitFor({ state: "attached" });
const hrefs = await profileLinks.evaluateAll(links =>
    links.map(link => link.href)
);
const uniqueProfiles = [...new Set(hrefs)].slice(0, 2);
console.log("Unique profiles found:", uniqueProfiles.length);
for (const profileUrl of uniqueProfiles) {

    console.log("Profile URL:", profileUrl);
    const profileLink = page.locator(`a[href="${profileUrl}"]`).first();
    const post = profileLink.locator('xpath=ancestor::*[@role="listitem"][1]');
    const mail = post.locator('a[href^="mailto:"]').first();
    let email;

    if (await mail.count() > 0) {

        const mailto = await mail.getAttribute("href");
        email = mailto.replace("mailto:", "");

        console.log("Email found directly:", email);

    } else {

        console.log("No direct email. Using SignalHire...");

        const response = await axios.post(
            "https://www.signalhire.com/api/v1/candidate/search",
            {
                items: [profileUrl],
                withoutWaterfall: true
            },
            {
                headers: {
                    apikey: process.env.API_KEY
                }
            }
        );

        console.log(JSON.stringify(response.data, null, 2));

        email = response.data.email;
    }
    const jobDescription = await post.innerText();
const { roles, skills } = require("../resume.json");
const text = jobDescription.toLowerCase();
const foundSkills = skills.filter(skill =>
  jobDescription.toLowerCase().includes(skill.toLowerCase())
);
const foundRoles = roles.filter(role =>
    text.includes(role.toLowerCase())
);
console.log("Roles found:", foundRoles);
console.log("Skills found:", foundSkills);
const content = fs.readFileSync("./Resume.docx", "binary");

const zip = new PizZip(content);

const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true
});

doc.render({
    roles: foundRoles.join(", "),
    skills: foundSkills.join(", ")
});

const buffer = doc.getZip().generate({
    type: "nodebuffer"
});

fs.writeFileSync("./MyResume.docx", buffer);

console.log("Tailored resume generated");

    if (email) {

        console.log("Sending resume to:", email);

        await transporter.sendMail({
            from: process.env.EMAIL,
            to: email,
            subject: "Java Developer C2C",
            text: "Please find my resume attached.",
            attachments: [
                {
                    filename: "Resume.docx",
                    path: "./MyResume.docx"
                }
            ]
        });

        console.log("Resume sent:", email);
    }
}
});

