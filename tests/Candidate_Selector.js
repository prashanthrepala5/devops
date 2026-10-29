const fs = require('fs');
const path = require('path');

const candidates = {
    '1': {
        name: 'Mohammad Abdul Safi',
        resume: './resumes/Abdul-Safi_Resume.docx',
        details: './candidate_details/Abdul-Safi.txt',
        filters: {
            targetApplicationsCount: 5,
            maxPostsToInspect: 30,

            maxExperienceYears: 10,
            enableExperienceFilter: true,

            targetDomains: [
                'IT',
                'Software',
                'Technology',
                'Engineering',
                'Developer',
                'Development',
                'Cloud',
                'DevOps',
                'Backend',
                'Full Stack',
                'Application',
                'Solutions',
                'Java',
                
            ],
            enableDomainFilter: true,

            targetWorkAuth: 'H1B',
            enableWorkAuthFilter: false
        }
    },
    '2': {
        name: 'Vijay Kumar',
        resume: './resumes/Vijay_Resume.docx',
        details: './candidate_details/Vijay.txt',
        filters: {
            targetApplicationsCount: 5,
            maxPostsToInspect: 30,

            maxExperienceYears: 5,
            enableExperienceFilter: true,

            targetDomains: [
                'Networks',
                'AWS',
                'Azure',
                'Security', 
            ],
            enableDomainFilter: true,

            targetWorkAuth: 'F-1 STEM OPT',
            enableWorkAuthFilter: true
        }
        
    },
    '3': {
        name: 'Reju Karkee',
        resume: './resumes/Reju-Karkee_Resume.docx',
        details: './candidate_details/Reju.txt',
        filters: {
            targetApplicationsCount: 5,
            maxPostsToInspect: 30,

            maxExperienceYears: 5,
            enableExperienceFilter: true,

            targetDomains: [
                'Data Engineer',
                'Senior Data Engineer',
                'Analytics',
                'ETL Developer',
                'ETL Engineer',
                'Cloud Data Engineer',
                'Big Data Engineer',
                'Data Platform Engineer',
                'Data Warehouse Engineer',
                'Snowflake Data Engineer',
            ],
            enableDomainFilter: true,

            targetWorkAuth: 'F-1 STEM OPT',
            enableWorkAuthFilter: false
        }
        
    }
};

const CATEGORY_FILTERS = {
    'frontend-web': ['Frontend', 'Web', 'React', 'JavaScript', 'TypeScript', 'Node.js'],
    'backend-java': ['Backend', 'Java', 'Spring', 'Microservices', 'API'],
    'full-stack': ['Full Stack', 'Frontend', 'Backend', 'React', 'Node.js'],
    'data-engineering': ['Data', 'Analytics', 'ETL', 'Snowflake', 'Spark', 'Python'],
    'qa-testing': ['QA', 'Quality Assurance', 'Testing', 'Test Engineer'],
    'devops-cloud': ['DevOps', 'Cloud', 'Kubernetes', 'AWS', 'Azure'],
    'mobile-development': ['Mobile', 'Android', 'iOS', 'Flutter', 'React Native'],
    dotnet: ['.NET', 'C#', 'ASP.NET']
};

function profileIndexPath() {
    return process.env.REACHOPS_DATA_DIR
        ? path.join(path.resolve(process.env.REACHOPS_DATA_DIR), 'profiles.json')
        : path.resolve(__dirname, '../reachops-portal/.local-data/profiles.json');
}

function getDynamicCandidates() {
    try {
        const entries = JSON.parse(fs.readFileSync(profileIndexPath(), 'utf8'));
        if (!Array.isArray(entries)) return [];
        const dataRoot = path.dirname(profileIndexPath());
        return entries.map(profile => {
            const profileRoot = path.join(dataRoot, 'profiles', profile.id);
            const targetDomains = CATEGORY_FILTERS[profile.category] || [];
            return {
                ...profile,
                name: profile.name,
                resume: path.join(profileRoot, profile.resumeRelativePath),
                details: path.join(profileRoot, profile.detailsRelativePath),
                filters: {
                    targetApplicationsCount: 5,
                    maxPostsToInspect: 30,
                    // Candidate work history is not the maximum experience a job may require.
                    // Keep the normal search default; the dashboard can override it per search.
                    maxExperienceYears: 5,
                    enableExperienceFilter: true,
                    targetDomains,
                    enableDomainFilter: targetDomains.length > 0,
                    targetWorkAuth: profile.workAuthorization || '',
                    enableWorkAuthFilter: false
                }
            };
        });
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw new Error('Could not load locally stored candidate profiles.');
    }
}

function selectCandidate() {
    const choice = process.env.CANDIDATE?.trim() || '1';

    const candidate = candidates[choice] || getDynamicCandidates().find(profile => profile.id === choice);

    if (!candidate) {
        throw new Error(
            `Invalid candidate "${choice}". Use a built-in profile ID (1, 2, or 3) or a saved local profile ID.`
        );
    }

    return candidate;
}

function getCandidateOptions() {
    const builtIn = Object.entries(candidates).map(([id, candidate]) => ({ id, name: candidate.name, source: 'built-in' }));
    const dynamic = getDynamicCandidates().map(candidate => ({ id: candidate.id, name: candidate.name, category: candidate.category, source: 'local profile' }));
    return [...builtIn, ...dynamic];
}

module.exports = { selectCandidate, getCandidateOptions };
