import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ exists: false });
    }
    const user = await getUser(email);
    return NextResponse.json({ exists: !!user });
  } catch (error) {
    // Don't reveal errors
    return NextResponse.json({ exists: false });
  }
}
