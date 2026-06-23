import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_change_in_production');

export async function GET(req: Request) {
  try {
    // 1. Extract cookie from headers
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/admin_session=([^;]+)/);
    const token = match ? match[1] : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify the JWT
    try {
      await jwtVerify(token, SECRET_KEY);
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized or token expired' }, { status: 401 });
    }

    // 3. Connect to DB and fetch data
    const client = await clientPromise;
    const db = client.db('toolx');
    const suggestionsCollection = db.collection('suggestions');

    // Fetch all, sort by newest first
    const data = await suggestionsCollection.find({}).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({ success: true, data }, { status: 200 });

  } catch (error) {
    console.error('Data Fetch API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
