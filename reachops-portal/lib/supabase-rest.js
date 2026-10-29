import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { getSupabaseConfig } from './supabase-config';

const PROFILE_COLUMNS = 'id,user_id,name,category,custom_category,email,phone,linkedin,location,work_authorization,availability,experience,skills,expected_salary,resume_name,resume_path,resume_size,created_at,updated_at';
const BUCKET = 'reachops-resumes';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const CATEGORIES = new Set([
  'frontend-web', 'backend-java', 'full-stack', 'data-engineering',
  'qa-testing', 'devops-cloud', 'mobile-development', 'dotnet', 'custom'
]);

export function cloudStorageConfigured() {
  return Boolean(getSupabaseConfig());
}

export async function currentCloudSession() {
  const jar = await cookies();
  const accessToken = jar.get('reachops_access_token')?.value;
  if (!accessToken) return null;
  const config = getSupabaseConfig();
  if (!config) return null;
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: { apikey: config.key, Authorization: `Bearer ${accessToken}` },
    cache: 'no-store'
  }).catch(() => null);
  if (!response?.ok) return null;
  const user = await response.json().catch(() => null);
  return user?.id ? { ...config, accessToken, userId: user.id, user } : null;
}

function authHeaders(config, accessToken) {
  return {
    apikey: config.key,
    Authorization: `Bearer ${accessToken}`
  };
}

async function supabaseRequest(config, accessToken, route, init = {}) {
  const headers = new Headers(init.headers || {});
  for (const [name, value] of Object.entries(authHeaders(config, accessToken))) headers.set(name, value);
  const response = await fetch(`${config.url}${route}`, { ...init, headers, cache: 'no-store' });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const error = new Error(body?.message || body?.error_description || body?.msg || 'The profile service rejected the request.');
    error.status = response.status;
    throw error;
  }
  return body;
}

function mapProfile(row) {
  return {
    id: row.id,
    name: row.name,
    fullName: row.name,
    category: row.category,
    profileCategory: row.category,
    customCategory: row.custom_category || '',
    email: row.email || '',
    phone: row.phone || '',
    linkedin: row.linkedin || '',
    location: row.location || '',
    workAuthorization: row.work_authorization || '',
    workAuth: row.work_authorization || '',
    availability: row.availability || '',
    experience: row.experience || '',
    totalExperience: row.experience || '',
    skills: row.skills || '',
    expectedSalary: row.expected_salary || '',
    resumeName: row.resume_name,
    resumeFilename: row.resume_name,
    resumeSize: row.resume_size,
    source: 'managed',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeProfile(input) {
  const profile = {
    name: String(input.name || input.fullName || '').trim().replace(/\s+/g, ' ').slice(0, 120),
    category: String(input.category || input.profileCategory || '').trim(),
    custom_category: String(input.customCategory || '').trim().slice(0, 80),
    email: String(input.email || '').trim().slice(0, 254),
    phone: String(input.phone || '').trim().slice(0, 40),
    linkedin: String(input.linkedin || '').trim().slice(0, 300),
    location: String(input.location || '').trim().slice(0, 120),
    work_authorization: String(input.workAuthorization || input.workAuth || '').trim().slice(0, 80),
    availability: String(input.availability || '').trim().slice(0, 80),
    experience: String(input.experience || input.totalExperience || '').trim().slice(0, 40),
    skills: String(input.skills || '').trim().slice(0, 1600),
    expected_salary: String(input.expectedSalary || '').trim().slice(0, 100)
  };
  const invalid = message => Object.assign(new Error(message), { code: 'PROFILE_VALIDATION' });
  if (!profile.name) throw invalid('Enter the candidate name.');
  if (!CATEGORIES.has(profile.category)) throw invalid('Choose a valid job profile category.');
  if (profile.category === 'custom' && !profile.custom_category) throw invalid('Enter a custom job profile.');
  if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) throw invalid('Enter a valid email address.');
  if (profile.linkedin && !/^https?:\/\//i.test(profile.linkedin)) throw invalid('LinkedIn URL must begin with http:// or https://.');
  return profile;
}

async function validateResume(file) {
  const invalid = message => Object.assign(new Error(message), { code: 'PROFILE_VALIDATION' });
  if (!file || typeof file.arrayBuffer !== 'function') throw invalid('Choose a PDF or DOCX resume.');
  const extension = (file.name || '').toLowerCase().match(/\.(pdf|docx)$/)?.[0];
  if (!extension) throw invalid('Only PDF and DOCX resumes are accepted.');
  if (file.size < 1 || file.size > MAX_FILE_BYTES) throw invalid('Resume must be between 1 byte and 10 MB.');
  const bytes = Buffer.from(await file.arrayBuffer());
  const valid = extension === '.pdf'
    ? bytes.subarray(0, 5).toString('ascii') === '%PDF-'
    : bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (!valid) throw invalid(`This file does not appear to be a valid ${extension.slice(1).toUpperCase()} document.`);
  return { extension, bytes };
}

async function uploadResume(session, userId, profileId, file, { upsert = false } = {}) {
  const { extension, bytes } = await validateResume(file);
  const objectPath = `${userId}/${profileId}/resume${extension}`;
  await supabaseRequest(session, session.accessToken, `/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': extension === '.pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'x-upsert': upsert ? 'true' : 'false'
    },
    body: bytes
  });
  return { objectPath, extension, size: bytes.length };
}

async function removeResume(session, objectPath) {
  if (!objectPath) return;
  await supabaseRequest(session, session.accessToken, `/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [objectPath] })
  });
}

export async function listCloudProfiles(session) {
  const query = new URLSearchParams({ select: PROFILE_COLUMNS, user_id: `eq.${session.userId}`, order: 'updated_at.desc' });
  const rows = await supabaseRequest(session, session.accessToken, `/rest/v1/profiles?${query}`);
  return rows.map(mapProfile);
}

export async function getCloudProfile(session, id) {
  const query = new URLSearchParams({ select: PROFILE_COLUMNS, id: `eq.${id}`, user_id: `eq.${session.userId}`, limit: '1' });
  const rows = await supabaseRequest(session, session.accessToken, `/rest/v1/profiles?${query}`);
  return rows[0] ? mapProfile(rows[0]) : null;
}

export async function createCloudProfile(session, input, file) {
  const profile = normalizeProfile(input);
  const id = randomUUID();
  const uploaded = await uploadResume(session, session.userId, id, file);
  try {
    const rows = await supabaseRequest(session, session.accessToken, '/rest/v1/profiles?select=*', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        id, user_id: session.userId, ...profile,
        resume_name: (file.name || `resume${uploaded.extension}`).replace(/[\r\n]/g, '').slice(0, 180),
        resume_path: uploaded.objectPath,
        resume_size: uploaded.size
      })
    });
    return mapProfile(rows[0]);
  } catch (error) {
    await removeResume(session, uploaded.objectPath).catch(() => {});
    throw error;
  }
}

export async function createCloudUploadToken(session, { profileId, fileName, fileSize }) {
  const extension = String(fileName || '').toLowerCase().match(/\.(pdf|docx)$/)?.[0];
  if (!extension) throw Object.assign(new Error('Only PDF and DOCX resumes are accepted.'), { code: 'PROFILE_VALIDATION' });
  if (!Number.isInteger(Number(fileSize)) || Number(fileSize) < 1 || Number(fileSize) > MAX_FILE_BYTES) {
    throw Object.assign(new Error('Resume must be between 1 byte and 10 MB.'), { code: 'PROFILE_VALIDATION' });
  }
  let id = profileId;
  if (id) {
    const existing = await getCloudProfile(session, id);
    if (!existing) throw Object.assign(new Error('Profile not found.'), { status: 404 });
  } else {
    id = randomUUID();
  }
  const objectPath = `${session.userId}/${id}/resume-${randomUUID()}${extension}`;
  const route = `/storage/v1/object/upload/sign/${BUCKET}/${objectPath.split('/').map(encodeURIComponent).join('/')}`;
  const signed = await supabaseRequest(session, session.accessToken, route, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
  });
  const signedUrl = /^https?:\/\//i.test(signed.url)
    ? signed.url
    : `${session.url}/storage/v1${signed.url}`;
  return { profileId: id, objectPath, signedUrl, resumeName: String(fileName).replace(/[\r\n]/g, '').slice(0, 180), resumeSize: Number(fileSize) };
}

async function assertUploadedObject(session, objectPath, profileId, resumeName, expectedSize) {
  const expectedPrefix = `${session.userId}/`;
  if (typeof objectPath !== 'string' || !objectPath.startsWith(expectedPrefix) || objectPath.split('/')[1] !== profileId || objectPath.includes('..')) {
    throw Object.assign(new Error('The resume upload does not belong to this account.'), { code: 'PROFILE_VALIDATION' });
  }
  const response = await fetch(`${session.url}/storage/v1/object/authenticated/${BUCKET}/${objectPath.split('/').map(encodeURIComponent).join('/')}`, {
    headers: authHeaders(session, session.accessToken), cache: 'no-store'
  });
  if (!response.ok) throw Object.assign(new Error('The resume upload could not be found. Upload it again and retry.'), { status: response.status });
  const actualSize = Number(response.headers.get('content-length'));
  if (actualSize && actualSize !== Number(expectedSize)) {
    throw Object.assign(new Error('The uploaded resume size does not match. Upload it again and retry.'), { code: 'PROFILE_VALIDATION' });
  }
  const extension = String(resumeName || '').toLowerCase().match(/\.(pdf|docx)$/)?.[0];
  const reader = response.body?.getReader();
  let prefix = new Uint8Array(0);
  if (reader) {
    while (prefix.length < 5) {
      const { value, done } = await reader.read();
      if (done) break;
      const joined = new Uint8Array(prefix.length + value.length);
      joined.set(prefix); joined.set(value, prefix.length); prefix = joined;
    }
    await reader.cancel().catch(() => {});
  }
  const validPdf = extension === '.pdf' && String.fromCharCode(...prefix.slice(0, 5)) === '%PDF-';
  const validDocx = extension === '.docx' && prefix[0] === 0x50 && prefix[1] === 0x4b;
  if (!validPdf && !validDocx) {
    throw Object.assign(new Error('The uploaded resume type does not match its file name.'), { code: 'PROFILE_VALIDATION' });
  }
}

export async function registerCloudProfile(session, input, upload) {
  const profile = normalizeProfile(input);
  if (!upload || !/^[0-9a-f-]{36}$/i.test(upload.profileId || '')) throw Object.assign(new Error('Upload details are missing. Upload the resume again.'), { code: 'PROFILE_VALIDATION' });
  await assertUploadedObject(session, upload.objectPath, upload.profileId, upload.resumeName, upload.resumeSize);
  const extension = String(upload.resumeName || '').toLowerCase().match(/\.(pdf|docx)$/)?.[0];
  if (!extension || !Number.isInteger(Number(upload.resumeSize)) || Number(upload.resumeSize) < 1 || Number(upload.resumeSize) > MAX_FILE_BYTES) {
    throw Object.assign(new Error('Upload details are invalid. Choose a PDF or DOCX resume under 10 MB.'), { code: 'PROFILE_VALIDATION' });
  }
  const rows = await supabaseRequest(session, session.accessToken, '/rest/v1/profiles?select=*', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      id: upload.profileId, user_id: session.userId, ...profile,
      resume_name: String(upload.resumeName).replace(/[\r\n]/g, '').slice(0, 180),
      resume_path: upload.objectPath,
      resume_size: Number(upload.resumeSize)
    })
  });
  return mapProfile(rows[0]);
}

export async function updateCloudProfile(session, id, input) {
  const profile = normalizeProfile(input);
  const query = new URLSearchParams({ id: `eq.${id}`, user_id: `eq.${session.userId}`, select: '*' });
  const rows = await supabaseRequest(session, session.accessToken, `/rest/v1/profiles?${query}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(profile)
  });
  return rows[0] ? mapProfile(rows[0]) : null;
}

export async function replaceCloudResume(session, id, file) {
  const currentQuery = new URLSearchParams({ select: 'resume_path', id: `eq.${id}`, user_id: `eq.${session.userId}`, limit: '1' });
  const current = await supabaseRequest(session, session.accessToken, `/rest/v1/profiles?${currentQuery}`);
  if (!current[0]) return null;
  const uploaded = await uploadResume(session, session.userId, id, file, { upsert: true });
  const query = new URLSearchParams({ id: `eq.${id}`, user_id: `eq.${session.userId}`, select: '*' });
  try {
    const rows = await supabaseRequest(session, session.accessToken, `/rest/v1/profiles?${query}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        resume_name: (file.name || `resume${uploaded.extension}`).replace(/[\r\n]/g, '').slice(0, 180),
        resume_path: uploaded.objectPath,
        resume_size: uploaded.size
      })
    });
    if (current[0].resume_path && current[0].resume_path !== uploaded.objectPath) await removeResume(session, current[0].resume_path);
    return rows[0] ? mapProfile(rows[0]) : null;
  } catch (error) {
    throw error;
  }
}

export async function registerCloudResume(session, id, upload) {
  const currentQuery = new URLSearchParams({ select: 'resume_path', id: `eq.${id}`, user_id: `eq.${session.userId}`, limit: '1' });
  const currentRows = await supabaseRequest(session, session.accessToken, `/rest/v1/profiles?${currentQuery}`);
  if (!currentRows[0]) return null;
  await assertUploadedObject(session, upload?.objectPath, id, upload?.resumeName, upload?.resumeSize);
  const extension = String(upload?.resumeName || '').toLowerCase().match(/\.(pdf|docx)$/)?.[0];
  if (!extension || !Number.isInteger(Number(upload.resumeSize)) || Number(upload.resumeSize) < 1 || Number(upload.resumeSize) > MAX_FILE_BYTES) {
    throw Object.assign(new Error('Upload details are invalid. Choose a PDF or DOCX resume under 10 MB.'), { code: 'PROFILE_VALIDATION' });
  }
  const query = new URLSearchParams({ id: `eq.${id}`, user_id: `eq.${session.userId}`, select: '*' });
  const rows = await supabaseRequest(session, session.accessToken, `/rest/v1/profiles?${query}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      resume_name: String(upload.resumeName).replace(/[\r\n]/g, '').slice(0, 180),
      resume_path: upload.objectPath,
      resume_size: Number(upload.resumeSize)
    })
  });
  const updated = rows[0] ? mapProfile(rows[0]) : null;
  if (updated && currentRows[0].resume_path && currentRows[0].resume_path !== upload.objectPath) await removeResume(session, currentRows[0].resume_path);
  return updated;
}

export async function deleteCloudProfile(session, id) {
  const query = new URLSearchParams({ select: 'resume_path', id: `eq.${id}`, user_id: `eq.${session.userId}`, limit: '1' });
  const rows = await supabaseRequest(session, session.accessToken, `/rest/v1/profiles?${query}`);
  if (!rows[0]) return false;
  const deleteQuery = new URLSearchParams({ id: `eq.${id}`, user_id: `eq.${session.userId}` });
  await supabaseRequest(session, session.accessToken, `/rest/v1/profiles?${deleteQuery}`, { method: 'DELETE' });
  await removeResume(session, rows[0].resume_path);
  return true;
}

export async function getCloudResumeDownload(session, id) {
  const query = new URLSearchParams({ select: 'resume_path,resume_name', id: `eq.${id}`, user_id: `eq.${session.userId}`, limit: '1' });
  const rows = await supabaseRequest(session, session.accessToken, `/rest/v1/profiles?${query}`);
  if (!rows[0]) return null;
  const file = await fetch(`${session.url}/storage/v1/object/${BUCKET}/${rows[0].resume_path}`, {
    headers: authHeaders(session, session.accessToken), cache: 'no-store'
  });
  if (!file.ok) throw new Error('The private resume could not be downloaded.');
  return { body: file.body, name: rows[0].resume_name, type: file.headers.get('content-type') || 'application/octet-stream' };
}
