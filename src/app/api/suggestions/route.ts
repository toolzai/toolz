import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Collection, Db } from 'mongodb';

// Simple in-memory rate limiting (works per lambda instance, not perfect for distributed but good enough for basic protection)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

// Regex to detect links (http, https, www)
const LINK_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;

// Regex to detect emojis
// We match a wide range of unicode blocks that represent emojis
const EMOJI_REGEX = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;

function isInvalidContent(text: string): { invalid: boolean; reason?: string } {
  if (LINK_REGEX.test(text)) return { invalid: true, reason: 'Links are not allowed in the suggestion box.' };
  if (EMOJI_REGEX.test(text)) return { invalid: true, reason: 'Emojis are not allowed in the suggestion box.' };
  if (text.includes('<') || text.includes('>')) return { invalid: true, reason: 'HTML tags are not allowed.' };
  return { invalid: false };
}

async function getNextSequenceValue(db: Db, sequenceName: string): Promise<number> {
  const countersCollection: Collection = db.collection('counters');
  
  const sequenceDocument = await countersCollection.findOneAndUpdate(
    { _id: sequenceName as any },
    { $inc: { sequence_value: 1 } },
    { returnDocument: 'after', upsert: true }
  );

  if (!sequenceDocument) {
      throw new Error('Failed to generate sequence value');
  }

  return sequenceDocument.sequence_value;
}

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const currentTime = Date.now();
    const rateLimitData = rateLimitMap.get(ip);

    if (rateLimitData) {
      if (currentTime - rateLimitData.timestamp < RATE_LIMIT_WINDOW_MS) {
        if (rateLimitData.count >= MAX_REQUESTS_PER_WINDOW) {
          return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }
        rateLimitData.count += 1;
      } else {
        rateLimitMap.set(ip, { count: 1, timestamp: currentTime });
      }
    } else {
      rateLimitMap.set(ip, { count: 1, timestamp: currentTime });
    }

    // 2. Parse Body
    const body = await req.json();
    const { feedback, name, email, tools } = body;

    // 3. Validation
    if (!feedback || typeof feedback !== 'string' || feedback.trim().length === 0) {
      return NextResponse.json({ error: 'Feedback text is required.' }, { status: 400 });
    }
    if (feedback.length > 2000) {
      return NextResponse.json({ error: 'Feedback is too long. Max 2000 characters.' }, { status: 400 });
    }

    const contentValidation = isInvalidContent(feedback);
    if (contentValidation.invalid) {
      return NextResponse.json({ error: contentValidation.reason }, { status: 400 });
    }

    if (name) {
      const nameValidation = isInvalidContent(name);
      if (nameValidation.invalid) return NextResponse.json({ error: 'Invalid characters in name.' }, { status: 400 });
      if (name.length > 100) return NextResponse.json({ error: 'Name is too long.' }, { status: 400 });
    }

    // Tools Validation
    const selectedTools = Array.isArray(tools) ? tools.filter(t => typeof t === 'string').slice(0, 10) : [];

    // 4. Connect to DB
    const client = await clientPromise;
    const db = client.db('toolx');

    // 5. Format Data
    let finalName = name ? name.trim() : null;
    let finalEmail = email && email.trim().length > 0 ? email.trim() : null;

    if (!finalName) {
      // Generate anonymous ID
      const seqValue = await getNextSequenceValue(db, 'anonymousUserId');
      // Format to 6 digits, e.g. 000001
      const paddedSeq = String(seqValue).padStart(6, '0');
      finalName = `anonymous${paddedSeq}`;
    }

    // 6. Insert into DB
    const suggestionsCollection = db.collection('suggestions');
    await suggestionsCollection.insertOne({
      feedback: feedback.trim(),
      name: finalName,
      email: finalEmail,
      tools: selectedTools,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, message: 'Suggestion submitted successfully!' }, { status: 201 });
  } catch (error) {
    console.error('Failed to submit suggestion:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
