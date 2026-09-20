import { NextResponse } from 'next/server';
import axios from 'axios';
import { getSlugFromDept, scrapeFacultyList, scrapeFacultyProfile } from '@/lib/facultyScraper';

/**
 * Faculty X-Ray API
 * 
 * Takes a list of faculty names (from the ERP timetable) and a department,
 * matches them to IRINS profiles, and returns deep research intelligence.
 * 
 * Query params:
 *   names  — comma-separated faculty names (e.g., "DR. SHRUTHI D L,PROF. NAYANA B L")
 *   dept   — department string (e.g., "B.E-CD" or "CSE")
 */

const IRINS_BASE = 'https://saividya.irins.org';

async function fetchGoogleCitation(expertId) {
  try {
    const url = `${IRINS_BASE}/profile/getgooglecitation`;
    const params = new URLSearchParams();
    params.append('expert_id', expertId);

    const res = await axios.post(url, params.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 8000,
    });

    if (res.data?.status === 'success' && res.data?.google_data) {
      const g = res.data.google_data;
      return {
        name: g.name || '',
        totalCitations: parseInt(g.all || '0', 10),
        recentCitations: parseInt(g.all_2013 || '0', 10),
        hIndex: parseInt(g.h_all || '0', 10),
        hIndexRecent: parseInt(g.h_2013 || '0', 10),
        i10Index: parseInt(g.hi10_all || '0', 10),
        i10IndexRecent: parseInt(g.hi10_2013 || '0', 10),
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchSidebarData(expertId) {
  try {
    const url = `${IRINS_BASE}/profile/get_sidebarData`;
    const params = new URLSearchParams();
    params.append('expert_id', expertId);

    const res = await axios.post(url, params.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 8000,
    });

    if (res.data?.status === 'true') {
      return {
        matchExpertise: res.data.match_expertise || [],
        matchExpertiseCount: res.data.match_expertise_count || 0,
        sameDepartment: res.data.same_department || [],
        sameDepartmentCount: res.data.same_department_count || 0,
        sameSchool: res.data.same_school || [],
        sameSchoolCount: res.data.same_school_count || 0,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// Normalize a faculty name for fuzzy matching
function normalizeName(name) {
  return (name || '')
    .toUpperCase()
    .replace(/^(DR\.?|PROF\.?|MR\.?|MS\.?|MRS\.?|HOD)\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fuzzy match: check if two names refer to the same person
function namesMatch(erpName, irinName) {
  const a = normalizeName(erpName);
  const b = normalizeName(irinName);
  
  if (!a || !b) return false;
  if (a === b) return true;
  
  // Check if one contains the other
  if (a.includes(b) || b.includes(a)) return true;
  
  // Check word overlap — if 2+ words match, likely same person
  const aWords = a.split(' ').filter(w => w.length > 1);
  const bWords = b.split(' ').filter(w => w.length > 1);
  const overlap = aWords.filter(w => bWords.includes(w));
  if (overlap.length >= 2) return true;
  
  // Check first and last name match
  if (aWords.length >= 2 && bWords.length >= 2) {
    if (aWords[0] === bWords[0] && aWords[aWords.length - 1] === bWords[bWords.length - 1]) return true;
  }
  
  return false;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const namesParam = searchParams.get('names') || '';
    const dept = searchParams.get('dept') || '';

    if (!namesParam) {
      return NextResponse.json({ success: false, error: 'Faculty names are required' }, { status: 400 });
    }

    const erpNames = namesParam.split(',').map(n => n.trim()).filter(Boolean);
    
    // Step 1: Get the faculty list from the college website
    // Try multiple department slugs (the student's dept + common first-year depts)
    const slugs = new Set();
    if (dept) slugs.add(getSlugFromDept(dept));
    // First-year students have physics, chemistry, math faculty
    slugs.add('physics');
    slugs.add('chemistry');
    slugs.add('mathematics');
    slugs.add('computer-science-and-engineering');
    slugs.add('data-science');
    slugs.add('information-science-and-engineering');

    let allFaculty = [];
    const fetchedSlugs = new Set();

    for (const slug of slugs) {
      if (fetchedSlugs.has(slug)) continue;
      fetchedSlugs.add(slug);
      try {
        const list = await scrapeFacultyList(slug);
        allFaculty.push(...list.map(f => ({ ...f, department: slug })));
      } catch {
        // Ignore errors for individual slugs
      }
    }

    // Step 2: Match ERP faculty names to IRINS profiles
    const results = [];

    for (const erpName of erpNames) {
      // Find matching faculty in the college website list
      const match = allFaculty.find(f => namesMatch(erpName, f.name));
      
      if (match && match.expertId) {
        // Step 3: Fetch deep IRINS data + Google Scholar + sidebar data in parallel
        const [profile, googleScholar, sidebar] = await Promise.all([
          scrapeFacultyProfile(match.expertId).catch(() => null),
          fetchGoogleCitation(match.expertId),
          fetchSidebarData(match.expertId),
        ]);

        results.push({
          erpName,
          matched: true,
          name: match.name,
          designation: match.designation,
          image: match.image,
          linkedin: match.linkedin,
          irinsUrl: match.irinsUrl,
          expertId: match.expertId,
          department: match.department,
          // IRINS profile data
          expertise: profile?.expertise || [],
          qualifications: profile?.qualifications || [],
          awards: profile?.awards || [],
          projects: profile?.projects || [],
          patents: profile?.patents || [],
          memberships: profile?.memberships || [],
          publicationCount: profile?.publications?.length || 0,
          recentPublications: (profile?.publications || []).slice(0, 3),
          // Google Scholar metrics
          googleScholar,
          // Sidebar network data
          researchNetwork: sidebar,
        });
      } else {
        // No IRINS match found
        results.push({
          erpName,
          matched: false,
          name: match?.name || erpName,
          designation: match?.designation || '',
          image: match?.image || '',
          linkedin: match?.linkedin || '',
          department: match?.department || '',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      totalMatched: results.filter(r => r.matched).length,
      totalUnmatched: results.filter(r => !r.matched).length,
    });

  } catch (error) {
    console.error('Faculty X-Ray API Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
