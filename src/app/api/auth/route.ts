import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { createClient } from '@/lib/supabase/server';

// Define secret key using TextEncoder as required by jose
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_change_in_production');

// Configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const HARD_SESSION_LIMIT_SEC = 1000; // 1000 seconds = ~16.6 minutes

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    // Remove any backslashes that might have been added to escape $ in .env
    const adminHash = process.env.ADMIN_PASSWORD_HASH?.replace(/\\/g, '');

    if (!adminEmail || !adminHash) {
      console.error('Admin credentials not properly configured in environment variables.');
      return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500 });
    }

    // Connect to Supabase
    const supabase = await createClient();

    // Get IP address for rate limiting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    if (ip !== 'unknown') {
      const { data: attemptDoc } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('ip', ip)
        .single();
        
      if (attemptDoc && attemptDoc.lockUntil && attemptDoc.lockUntil > Date.now()) {
        const remainingMinutes = Math.ceil((attemptDoc.lockUntil - Date.now()) / 60000);
        return NextResponse.json(
          { error: `Too many failed attempts. Try again in ${remainingMinutes} minutes.` },
          { status: 429 }
        );
      }
    }

    // Helper to record failed attempt
    const recordFailedAttempt = async () => {
      if (ip === 'unknown') return;
      
      const { data: attemptDoc } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('ip', ip)
        .single();
        
      if (attemptDoc) {
        const newCount = attemptDoc.count + 1;
        const updates: any = { count: newCount };
        if (newCount >= MAX_ATTEMPTS) {
          updates.lockUntil = Date.now() + LOCKOUT_DURATION_MS;
        }
        await supabase.from('login_attempts').update(updates).eq('ip', ip);
      } else {
        await supabase.from('login_attempts').insert({ ip, count: 1, lockUntil: null });
      }
    };

    // 1. Verify email matches
    if (email !== adminEmail) {
      await recordFailedAttempt();
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 2. Verify password securely using bcrypt
    const isValidPassword = await bcrypt.compare(password, adminHash);

    if (!isValidPassword) {
      await recordFailedAttempt();
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Reset attempts on successful login
    if (ip !== 'unknown') {
      await supabase.from('login_attempts').delete().eq('ip', ip);
    }

    // 3. Create a JWT token using jose (Strict 1000s expiration)
    const token = await new SignJWT({ email, role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${HARD_SESSION_LIMIT_SEC}s`)
      .sign(SECRET_KEY);

    // 4. Create the response and set HTTP-only cookie
    const response = NextResponse.json({ success: true }, { status: 200 });

    response.cookies.set({
      name: 'admin_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: HARD_SESSION_LIMIT_SEC, // Strictly 1000 seconds
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Auth API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
