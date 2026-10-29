import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Returns the LinkedIn Automation root directory.
 * If running from reachops-portal, it goes up one level to the project root.
 */
export function getProjectRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, 'candidate_details'))) {
    return cwd;
  }
  return path.resolve(cwd, '..');
}

/**
 * Sanitizes candidate name for safe filesystem naming.
 */
function sanitizeName(name) {
  if (!name || typeof name !== 'string') return 'candidate';
  return name
    .trim()
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .replace(/\s+/g, '-');
}

/**
 * Parses key-value lines from a candidate .txt file into a normalized object.
 */
export function parseCandidateFile(content) {
  const result = {
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    location: '',
    availability: '',
    experience: '',
    salary: '',
    skills: '',
    certifications: '',
    raw: {}
  };

  if (!content || typeof content !== 'string') {
    return result;
  }

  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    if (!key) continue;

    result.raw[key] = value;
    const lowerKey = key.toLowerCase();

    // Map common key variations
    if (lowerKey === 'name' || lowerKey === 'full name') {
      result.name = value;
    } else if (
      lowerKey === 'email' ||
      lowerKey === 'e-mail' ||
      lowerKey === 'email address'
    ) {
      result.email = value;
    } else if (
      lowerKey === 'phone' ||
      lowerKey === 'contact' ||
      lowerKey === 'mobile' ||
      (lowerKey === 'number' && !result.phone)
    ) {
      result.phone = value;
    } else if (lowerKey === 'linkedin') {
      result.linkedin = value;
    } else if (
      lowerKey === 'location' ||
      lowerKey === 'current location'
    ) {
      result.location = value;
    } else if (
      lowerKey === 'availability' ||
      lowerKey === 'notice period'
    ) {
      result.availability = value;
    } else if (
      lowerKey === 'experience' ||
      lowerKey === 'total experience'
    ) {
      result.experience = value;
    } else if (
      lowerKey === 'expected salary' ||
      lowerKey === 'salary'
    ) {
      result.salary = value;
    } else if (
      lowerKey === 'expertise/skill sets' ||
      lowerKey === 'skill sets' ||
      lowerKey === 'skills' ||
      lowerKey === 'technical skills'
    ) {
      result.skills = value;
    } else if (
      lowerKey === 'certifications'
    ) {
      result.certifications = value;
    } else if (
      lowerKey === 'relocation' ||
      lowerKey === 'open to relocate'
    ) {
      result.relocation = value;
    } else if (lowerKey === 'work authorization') {
      result.workAuthorization = value;
    } else if (lowerKey === 'employer') {
      result.employer = value;
    } else if (
      lowerKey === 'education details' ||
      lowerKey === 'education'
    ) {
      result.education = value;
    } else if (lowerKey === 'interview availability') {
      result.interviewAvailability = value;
    } else if (lowerKey === 'profile category' || lowerKey === 'job profile') {
      result.profileCategory = value;
    } else {
      // Store any other custom field
      result[key] = value;
    }
  }

  return result;
}

/**
 * Reads all .txt files from candidate_details/ and returns parsed candidate records.
 */
export async function getAllCandidates() {
  const rootDir = getProjectRoot();
  const candidateDir = path.join(rootDir, 'candidate_details');

  try {
    const files = await fs.readdir(candidateDir);
    const txtFiles = files.filter(f => f.endsWith('.txt') && !f.startsWith('.'));

    const candidates = [];
    for (const filename of txtFiles) {
      const filePath = path.join(candidateDir, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = parseCandidateFile(content);
      const id = filename.replace(/\.txt$/, '');

      candidates.push({
        id,
        filename,
        ...parsed,
        // Guarantee fallback to id if name is missing
        name: parsed.name || id
      });
    }

    return candidates;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Reads all files from the resumes/ directory.
 */
export async function getCandidateResumes() {
  const rootDir = getProjectRoot();
  const resumesDir = path.join(rootDir, 'resumes');

  try {
    const files = await fs.readdir(resumesDir);
    return files.filter(f => !f.startsWith('.') && (f.endsWith('.docx') || f.endsWith('.pdf')));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Saves or updates a candidate text file in candidate_details/.
 */
export async function saveCandidateDetails(details) {
  if (!details || typeof details !== 'object') {
    throw new Error('Candidate details must be an object');
  }

  const name = details.name || details.fullName || details.id;
  if (!name) {
    throw new Error('Candidate name is required');
  }

  const rootDir = getProjectRoot();
  const candidateDir = path.join(rootDir, 'candidate_details');
  await fs.mkdir(candidateDir, { recursive: true });

  const baseFileName = sanitizeName(name);
  const filename = `${baseFileName}.txt`;
  const filePath = path.join(candidateDir, filename);

  // Build key-value lines
  const lines = [];

  const standardFields = [
    { key: 'Name', value: details.name || details.fullName },
    { key: 'E-Mail', value: details.email || details.eMail || details.emailAddress },
    { key: 'Phone', value: details.phone || details.number || details.mobile },
    { key: 'LinkedIn', value: details.linkedin || details.linkedIn },
    { key: 'Location', value: details.location || details.currentLocation },
    { key: 'Relocation', value: details.relocation || details.openToRelocate },
    { key: 'Work Authorization', value: details.workAuthorization },
    { key: 'Availability', value: details.availability },
    { key: 'Experience', value: details.experience || details.totalExperience },
    { key: 'Expected Salary', value: details.salary || details.expectedSalary },
    { key: 'Interview Availability', value: details.interviewAvailability },
    { key: 'Education Details', value: details.education || details.educationDetails },
    { key: 'CERTIFICATIONS', value: details.certifications },
    { key: 'Expertise/Skill Sets', value: details.skills || details.expertise || details.skillSets },
    { key: 'Employer', value: details.employer }
  ];

  const processedKeys = new Set([
    'name', 'fullname', 'email', 'emailaddress', 'phone', 'number', 'mobile',
    'linkedin', 'location', 'currentlocation', 'relocation', 'opentorelocate',
    'workauthorization', 'availability', 'experience', 'totalexperience',
    'salary', 'expectedsalary', 'interviewavailability', 'education', 'educationdetails',
    'certifications', 'skills', 'expertise', 'skillsets', 'employer',
    'id', 'filename', 'raw'
  ]);

  for (const item of standardFields) {
    if (item.value !== undefined && item.value !== null && String(item.value).trim() !== '') {
      lines.push(`${item.key}: ${String(item.value).trim()}`);
    }
  }

  // Add any extra fields passed in details
  for (const [key, value] of Object.entries(details)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z]/g, '');
    if (!processedKeys.has(cleanKey) && value !== undefined && value !== null && String(value).trim() !== '') {
      lines.push(`${key}: ${String(value).trim()}`);
    }
  }

  const fileContent = lines.join('\n') + '\n';
  await fs.writeFile(filePath, fileContent, 'utf-8');

  return {
    id: baseFileName,
    filename,
    filePath
  };
}

/**
 * Saves a resume file (Buffer, Uint8Array, or ArrayBuffer) into resumes/.
 */
export async function saveResumeFile(file, candidateName) {
  if (!file) {
    throw new Error('Resume file content is required');
  }

  const rootDir = getProjectRoot();
  const resumesDir = path.join(rootDir, 'resumes');
  await fs.mkdir(resumesDir, { recursive: true });

  const safeName = sanitizeName(candidateName || 'Candidate');
  
  // Extract extension if file object has name or original filename
  let ext = '.pdf';
  if (file.name && path.extname(file.name)) {
    ext = path.extname(file.name);
  } else if (file.filename && path.extname(file.filename)) {
    ext = path.extname(file.filename);
  }

  const targetFilename = `${safeName}_Resume${ext}`;
  const targetPath = path.join(resumesDir, targetFilename);

  let buffer;
  if (Buffer.isBuffer(file)) {
    buffer = file;
  } else if (file instanceof Uint8Array) {
    buffer = Buffer.from(file);
  } else if (file instanceof ArrayBuffer) {
    buffer = Buffer.from(file);
  } else if (typeof file.arrayBuffer === 'function') {
    const ab = await file.arrayBuffer();
    buffer = Buffer.from(ab);
  } else {
    throw new Error('Unsupported file format');
  }

  await fs.writeFile(targetPath, buffer);

  return {
    filename: targetFilename,
    filePath: targetPath
  };
}
