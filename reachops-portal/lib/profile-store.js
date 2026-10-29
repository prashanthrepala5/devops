import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const CATEGORIES = new Set([
  'frontend-web', 'backend-java', 'full-stack', 'data-engineering',
  'qa-testing', 'devops-cloud', 'mobile-development', 'dotnet', 'custom'
]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function invalidProfile(message) {
  const error = new Error(message);
  error.code = 'PROFILE_VALIDATION';
  return error;
}

export function projectRoot() {
  const cwd = process.cwd();
  return existsSync(path.join(cwd, 'candidate_details')) ? cwd : path.resolve(cwd, '..');
}

export function profileDataRoot() {
  return process.env.REACHOPS_DATA_DIR
    ? path.resolve(process.env.REACHOPS_DATA_DIR)
    : path.join(projectRoot(), 'reachops-portal', '.local-data');
}

export function assertProfileStorageAvailable() {
  if (process.env.VERCEL === '1' || process.env.VERCEL === 'true') {
    const error = new Error('Profile storage is not configured for this hosted deployment. Connect authentication, a database, and private object storage before accepting uploads.');
    error.code = 'PROFILE_STORAGE_NOT_CONFIGURED';
    throw error;
  }
}

function safeProfile(profile) {
  const { resumeRelativePath, detailsRelativePath, ...publicProfile } = profile;
  return publicProfile;
}

async function readIndex() {
  assertProfileStorageAvailable();
  const filePath = path.join(profileDataRoot(), 'profiles.json');
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    const failure = new Error('The local profile index is unreadable.');
    failure.code = 'PROFILE_STORAGE_ERROR';
    throw failure;
  }
}

async function writeIndex(profiles) {
  const root = profileDataRoot();
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  const tempPath = path.join(root, `profiles.${randomUUID()}.tmp`);
  await fs.writeFile(tempPath, `${JSON.stringify(profiles, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(tempPath, path.join(root, 'profiles.json'));
}

function normalizeProfile(input) {
  const profile = {
    name: String(input.name || input.fullName || '').trim().replace(/\s+/g, ' ').slice(0, 120),
    category: String(input.category || input.profileCategory || '').trim(),
    customCategory: String(input.customCategory || '').trim().slice(0, 80),
    email: String(input.email || '').trim().slice(0, 254),
    phone: String(input.phone || '').trim().slice(0, 40),
    linkedin: String(input.linkedin || '').trim().slice(0, 300),
    location: String(input.location || '').trim().slice(0, 120),
    workAuthorization: String(input.workAuthorization || input.workAuth || '').trim().slice(0, 80),
    availability: String(input.availability || '').trim().slice(0, 80),
    experience: String(input.experience || input.totalExperience || '').trim().slice(0, 40),
    skills: String(input.skills || '').trim().slice(0, 1600),
    expectedSalary: String(input.expectedSalary || '').trim().slice(0, 100)
  };
  if (!profile.name) throw invalidProfile('Enter the candidate name.');
  if (!CATEGORIES.has(profile.category)) throw invalidProfile('Choose a valid job profile category.');
  if (profile.category === 'custom' && !profile.customCategory) throw invalidProfile('Enter a custom job profile.');
  if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) throw invalidProfile('Enter a valid email address.');
  if (profile.linkedin && !/^https?:\/\//i.test(profile.linkedin)) throw invalidProfile('LinkedIn URL must begin with http:// or https://.');
  return profile;
}

function validateResume(file) {
  if (!file || typeof file.arrayBuffer !== 'function') throw invalidProfile('Choose a PDF or DOCX resume.');
  const extension = path.extname(file.name || '').toLowerCase();
  if (!['.pdf', '.docx'].includes(extension)) throw invalidProfile('Only PDF and DOCX resumes are accepted.');
  if (file.size < 1 || file.size > MAX_FILE_BYTES) throw invalidProfile('Resume must be between 1 byte and 10 MB.');
  return extension;
}

async function fileBuffer(file, extension) {
  const bytes = Buffer.from(await file.arrayBuffer());
  if (extension === '.pdf' && bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw invalidProfile('This file does not appear to be a valid PDF.');
  if (extension === '.docx' && !(bytes[0] === 0x50 && bytes[1] === 0x4b)) throw invalidProfile('This file does not appear to be a valid DOCX document.');
  return bytes;
}

function detailsText(profile) {
  return [
    `Name: ${profile.name}`,
    profile.email && `E-Mail: ${profile.email}`,
    profile.phone && `Phone: ${profile.phone}`,
    profile.linkedin && `LinkedIn: ${profile.linkedin}`,
    profile.location && `Location: ${profile.location}`,
    `Profile Category: ${profile.category === 'custom' ? profile.customCategory : profile.category}`,
    profile.workAuthorization && `Work Authorization: ${profile.workAuthorization}`,
    profile.availability && `Availability: ${profile.availability}`,
    profile.experience && `Experience: ${profile.experience}`,
    profile.skills && `Expertise/Skill Sets: ${profile.skills}`,
    profile.expectedSalary && `Expected Salary: ${profile.expectedSalary}`
  ].filter(Boolean).join('\n') + '\n';
}

async function persistDetails(profile, directory) {
  const detailsRelativePath = path.join('details', 'profile.txt');
  const detailsPath = path.join(directory, detailsRelativePath);
  await fs.mkdir(path.dirname(detailsPath), { recursive: true, mode: 0o700 });
  await fs.writeFile(detailsPath, detailsText(profile), { mode: 0o600 });
  return detailsRelativePath;
}

export async function listProfiles() {
  return (await readIndex()).map(safeProfile).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProfile(id) {
  const profile = (await readIndex()).find(item => item.id === id);
  return profile || null;
}

export async function createProfile(input, file) {
  const profile = normalizeProfile(input);
  const extension = validateResume(file);
  const bytes = await fileBuffer(file, extension);
  const id = randomUUID();
  const directory = path.join(profileDataRoot(), 'profiles', id);
  const resumeRelativePath = path.join('resume', `resume${extension}`);
  const resumePath = path.join(directory, resumeRelativePath);
  await fs.mkdir(path.dirname(resumePath), { recursive: true, mode: 0o700 });
  await fs.writeFile(resumePath, bytes, { mode: 0o600, flag: 'wx' });
  let detailsRelativePath;
  try {
    detailsRelativePath = await persistDetails(profile, directory);
    const now = new Date().toISOString();
    const entry = {
      id,
      ...profile,
      resumeName: path.basename(file.name || `resume${extension}`).replace(/[\r\n]/g, '').slice(0, 180),
      resumeSize: bytes.length,
      resumeRelativePath,
      detailsRelativePath,
      createdAt: now,
      updatedAt: now
    };
    const index = await readIndex();
    index.push(entry);
    await writeIndex(index);
    return safeProfile(entry);
  } catch (error) {
    await fs.rm(directory, { recursive: true, force: true });
    throw error;
  }
}

export async function updateProfile(id, input) {
  const profile = normalizeProfile(input);
  const index = await readIndex();
  const entryIndex = index.findIndex(item => item.id === id);
  if (entryIndex < 0) return null;
  const directory = path.join(profileDataRoot(), 'profiles', id);
  const previous = index[entryIndex];
  const updated = { ...previous, ...profile, updatedAt: new Date().toISOString() };
  await persistDetails(updated, directory);
  index[entryIndex] = updated;
  await writeIndex(index);
  return safeProfile(updated);
}

export async function replaceResume(id, file) {
  const extension = validateResume(file);
  const bytes = await fileBuffer(file, extension);
  const index = await readIndex();
  const entryIndex = index.findIndex(item => item.id === id);
  if (entryIndex < 0) return null;
  const directory = path.join(profileDataRoot(), 'profiles', id);
  const oldRelativePath = index[entryIndex].resumeRelativePath;
  const newRelativePath = path.join('resume', `resume${extension}`);
  const destination = path.join(directory, newRelativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  const tempPath = path.join(path.dirname(destination), `upload-${randomUUID()}.tmp`);
  await fs.writeFile(tempPath, bytes, { mode: 0o600, flag: 'wx' });
  await fs.rename(tempPath, destination);
  if (oldRelativePath && oldRelativePath !== newRelativePath) {
    await fs.rm(path.join(directory, oldRelativePath), { force: true });
  }
  const updated = {
    ...index[entryIndex],
    resumeRelativePath: newRelativePath,
    resumeName: path.basename(file.name || `resume${extension}`).replace(/[\r\n]/g, '').slice(0, 180),
    resumeSize: bytes.length,
    updatedAt: new Date().toISOString()
  };
  index[entryIndex] = updated;
  await writeIndex(index);
  return safeProfile(updated);
}

export async function deleteProfile(id) {
  const index = await readIndex();
  const entry = index.find(item => item.id === id);
  if (!entry) return false;
  const nextIndex = index.filter(item => item.id !== id);
  await writeIndex(nextIndex);
  await fs.rm(path.join(profileDataRoot(), 'profiles', id), { recursive: true, force: true });
  return true;
}

export async function getProfileForAutomation(id) {
  const entry = await getProfile(id);
  if (!entry) return null;
  const base = path.join(profileDataRoot(), 'profiles', id);
  return {
    ...entry,
    resume: path.join(base, entry.resumeRelativePath),
    details: path.join(base, entry.detailsRelativePath)
  };
}

export function isProfileCategory(value) {
  return CATEGORIES.has(value);
}

