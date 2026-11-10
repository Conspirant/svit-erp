import { NextResponse } from 'next/server';
import { LETTERS_ENDPOINTS } from '@/lib/lettersConfig';
import { setSessionIdentity } from '@/lib/authSession';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'College email and password are required.' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    const apiRes = await fetch(LETTERS_ENDPOINTS.STUDENT_LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SVIT-ERP',
      },
      body: JSON.stringify({
        email: trimmedEmail,
        password,
      }),
      cache: 'no-store',
    });

    const data = await apiRes.json();

    if (!apiRes.ok || !data.success) {
      return NextResponse.json(
        {
          success: false,
          error: data.message || 'Invalid college email or password.',
        },
        { status: apiRes.status || 401 }
      );
    }

    const { user, token } = data.data || {};
    if (!token || !user) {
      return NextResponse.json(
        { success: false, error: 'Unexpected response from Sai Vidya portal.' },
        { status: 502 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully to Sai Vidya Portal.',
      data: { user, token },
    });

    const cookieOptions = {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    };

    // Store JWT token for API calls
    response.cookies.set('svit_letters_token', token, {
      ...cookieOptions,
      httpOnly: true,
    });

    // Store student identity info
    response.cookies.set('svit_letters_user', JSON.stringify(user), {
      ...cookieOptions,
      httpOnly: false, // Accessible to client if needed
    });

    // If erp_usn is not set, set it from the student's USN
    if (user.usn) {
      setSessionIdentity(response, {
        usn: user.usn,
        name: user.name,
      });
    }

    return response;
  } catch (err) {
    console.error('Letters Auth POST Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to authenticate with Sai Vidya portal.' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const token =
      request.cookies.get('svit_letters_token')?.value ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    const userCookie = request.cookies.get('svit_letters_user')?.value;

    if (!token) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    // Optionally verify with /api/auth/profile
    try {
      const profRes = await fetch(LETTERS_ENDPOINTS.PROFILE, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SVIT-ERP',
        },
        cache: 'no-store',
      });

      if (profRes.ok) {
        const profData = await profRes.json();
        const liveUser = profData?.data?.user || profData?.user;
        return NextResponse.json({
          authenticated: true,
          user: liveUser || (userCookie ? JSON.parse(userCookie) : null),
          token,
        });
      }
    } catch (e) {
      console.warn('Profile refresh failed, falling back to cached cookie:', e.message);
    }

    if (userCookie) {
      try {
        const cachedUser = JSON.parse(userCookie);
        return NextResponse.json({
          authenticated: true,
          user: cachedUser,
          token,
        });
      } catch {}
    }

    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  } catch (err) {
    return NextResponse.json(
      { authenticated: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const response = NextResponse.json({
    success: true,
    message: 'Disconnected from Sai Vidya Letter Portal.',
  });

  const clearOptions = {
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  };

  response.cookies.set('svit_letters_token', '', clearOptions);
  response.cookies.set('svit_letters_user', '', clearOptions);

  return response;
}

